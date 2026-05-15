import {
  BotPersona,
  CardDef,
  GamePhase,
  GameState,
  Player,
  PlayerActionType,
} from '../types';
import { OddsCalculator } from './OddsCalculator';
import { materializePersona } from './BotProfiles';

/**
 * Equity-aware bot decision engine.
 *
 * Pipeline:
 *   1. Resolve runtime persona (already materialized by the store at hand-start;
 *      otherwise fall back to a fresh materialization).
 *   2. Compute hand strength:
 *        • Preflop  → Chen-style score normalised to ~0..1.
 *        • Postflop → Monte-Carlo equity from OddsCalculator (150 iters, cached).
 *   3. Build situational context (pot odds, SPR, raises-this-street, am I the
 *      last aggressor, commitment).
 *   4. Apply hard safety gates that prevent infinite-raise loops.
 *   5. Score each legal action (FOLD/CHECK/CALL/RAISE) with persona + equity +
 *      context, plus small noise, and pick the highest.
 *   6. Size the raise from pot * (aggression-flavoured factor).
 */
export const BotLogic = {
  decide(gameState: GameState, bot: Player): { action: PlayerActionType; amount?: number } {
    const persona: BotPersona =
      bot.runtimePersona ?? materializePersona(bot.playStyle, bot.tiltLevel ?? 0).persona;

    const { communityCards, minBet, pot, players, phase, bigBlind, minRaise } = gameState;
    const currentBet = bot.currentBet;
    const callAmount = Math.max(0, minBet - currentBet);
    const isCheckAvailable = callAmount === 0;
    const isPreFlop = phase === GamePhase.PRE_FLOP;

    const activeOpponents = players.filter(p => p.isActive && p.id !== bot.id).length;
    // Count already-folded players — used for table-dynamics bonuses below.
    const foldedCount = players.filter(p => !p.isActive).length;
    const equity = computeEquity(bot.holeCards, communityCards, isPreFlop, Math.max(1, activeOpponents));

    const potAfterCall = pot + callAmount;
    const potOdds = callAmount > 0 ? callAmount / potAfterCall : 0;
    const aggressorIsMe = gameState.lastAggressorId === bot.id;
    const raisesThisStreet = gameState.raisesThisStreet ?? 0;
    const committedFraction = bot.currentBet / Math.max(1, bot.currentBet + bot.chips);

    // ---- Preflop range gate (tightness) --------------------------------------
    // Protected hands (premium / near-premium) bypass the gate entirely —
    // no profile ever folds AA, KK, QQ, AKs/o, AQs, JJ, TT preflop.
    const rawChen = isPreFlop ? rawChenScore(bot.holeCards) : 0;
    const isPremium = rawChen >= 10; // JJ+/AK/AQs range

    if (isPreFlop && !isCheckAvailable && !isPremium) {
      // How many opponents have already folded this round?
      const tableBonus = (foldedCount / Math.max(1, players.length - 2)) * 0.15;
      const effectiveEquity = equity + tableBonus;
      // Lower thresholds vs original (was 0.18 + tightness * 0.30).
      const playThreshold = 0.12 + persona.tightness * 0.18; // ~0.12..0.30
      if (effectiveEquity < playThreshold && Math.random() > persona.callStation * 0.6) {
        return { action: PlayerActionType.FOLD };
      }
    }

    // ---- Hard safety gates (anti-infinite-raise) -----------------------------

    // Never re-raise our own aggression. If everyone just called us we check.
    if (aggressorIsMe && isCheckAvailable) {
      return { action: PlayerActionType.CHECK };
    }

    // Cap raise wars. After 4 raises on a street, only re-raise with monsters.
    const canRaiseStreet = raisesThisStreet < 4 || equity >= 0.78;

    // Pure trash on weak commitment → fold (even for maniacs).
    if (!isCheckAvailable && equity < 0.12 && committedFraction < 0.12 && callAmount > bigBlind) {
      return { action: PlayerActionType.FOLD };
    }

    // ---- Action scoring ------------------------------------------------------

    const moodOffset = bot.mood === 'frisky' ? 0.05 : bot.mood === 'cautious' ? -0.05 : 0;
    const trapBoost = persona.trapping * (equity > 0.80 ? 0.3 : 0); // slow-play monsters
    const aggressionEffective = clamp01(persona.aggression + moodOffset - trapBoost);

    // RAISE score: equity edge × aggression, plus bluff inject for weak hands,
    // damped by current raise count and commitment.
    const equityEdge = equity - 0.45; // 0.45 ≈ "neutral" equity baseline
    const bluffInject =
      equity < 0.30 && Math.random() < persona.bluffFrequency * (raisesThisStreet < 2 ? 1 : 0.3)
        ? 0.35
        : 0;
    const raiseScore =
      aggressionEffective * equityEdge * 2.2
      + bluffInject
      - raisesThisStreet * 0.18
      - (committedFraction > 0.5 ? 0.15 : 0);

    // CALL score: equity-vs-pot-odds + call-station pull. When check is free,
    // this slot represents CHECK.
    const callScore =
      (isCheckAvailable ? 0.25 : 0)
      + Math.max(0, equity - potOdds) * 2.0
      + persona.callStation * 0.5
      - (equity < 0.20 && !isCheckAvailable ? 0.6 : 0);

    // FOLD score: only meaningful when there's something to pay.
    // Cheap preflop call (≤ 1BB): heavily suppress folding — tiny price for a
    // chance to see the flop is almost always correct.
    const cheapPreflopCall = isPreFlop && callAmount <= bigBlind && callAmount > 0;
    // Table-dynamics: fewer opponents → better odds to steal/fight for pot.
    const tableDynamicsBonus = foldedCount >= players.length / 2 ? 0.15 : 0;
    const foldScore = isCheckAvailable
      ? -1
      : (1 - persona.callStation) * Math.max(0, potOdds - equity) * 2.0
        + (equity < 0.25 ? 0.3 : 0)
        - persona.adaptability * (aggressorIsMe ? 0.1 : 0)
        - (cheapPreflopCall ? 0.4 : 0)
        - tableDynamicsBonus;

    // Tie-break noise — wider for looser personas.
    const wildness = 1 - persona.tightness;
    const noise = () => (Math.random() - 0.5) * 0.15 * (0.4 + wildness);

    const scores: { action: PlayerActionType; score: number }[] = [
      { action: PlayerActionType.FOLD, score: foldScore + noise() },
      { action: isCheckAvailable ? PlayerActionType.CHECK : PlayerActionType.CALL, score: callScore + noise() },
    ];
    if (canRaiseStreet && bot.chips > callAmount) {
      scores.push({ action: PlayerActionType.RAISE, score: raiseScore + noise() });
    }

    scores.sort((a, b) => b.score - a.score);
    let chosen = scores[0].action;

    // ---- Legalisation --------------------------------------------------------

    if (chosen === PlayerActionType.FOLD && isCheckAvailable) {
      chosen = PlayerActionType.CHECK;
    }

    if (chosen === PlayerActionType.CALL && bot.chips < callAmount) {
      if (equity > potOdds) {
        return { action: PlayerActionType.ALL_IN, amount: bot.currentBet + bot.chips };
      }
      return { action: PlayerActionType.FOLD };
    }

    if (chosen === PlayerActionType.RAISE) {
      const amount = computeRaiseAmount(gameState, bot, persona, equity, bluffInject > 0);
      if (amount >= bot.currentBet + bot.chips) {
        return { action: PlayerActionType.ALL_IN, amount: bot.currentBet + bot.chips };
      }
      const legalMin = minBet + (minRaise || bigBlind);
      if (amount < legalMin) {
        if (isCheckAvailable) return { action: PlayerActionType.CHECK };
        return { action: PlayerActionType.CALL };
      }
      return { action: PlayerActionType.RAISE, amount };
    }

    return { action: chosen };
  },
};

// --- Helpers ---------------------------------------------------------------

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Raw Chen score (0–22 scale, NO opponent penalty).
 * Used only to identify premium/near-premium hands for the preflop bypass gate.
 */
function rawChenScore(holeCards: CardDef[]): number {
  const a = holeCards[0];
  const b = holeCards[1];
  const high = Math.max(a.value, b.value);
  const low = Math.min(a.value, b.value);
  const highScore = (v: number) =>
    v === 14 ? 10 : v === 13 ? 8 : v === 12 ? 7 : v === 11 ? 6 : v === 10 ? 5 : v / 2;

  if (a.value === b.value) return Math.max(highScore(high) * 2, 5);

  let score = highScore(high);
  if (a.suit === b.suit) score += 2;
  const gap = high - low - 1;
  if (gap === 1) score -= 1;
  else if (gap === 2) score -= 2;
  else if (gap === 3) score -= 4;
  else if (gap >= 4) score -= 5;
  if (gap <= 1 && high <= 12) score += 1;
  return score;
}

/** Returns equity in [0, 1]. Preflop uses Chen-style heuristic; postflop uses Monte Carlo. */
function computeEquity(
  holeCards: CardDef[],
  communityCards: CardDef[],
  isPreFlop: boolean,
  activeOpponents: number,
): number {
  if (!holeCards || holeCards.length < 2) return 0;
  if (isPreFlop) return chenEquity(holeCards, activeOpponents);
  // 150 iters keeps per-call cost ≈10–25 ms; cached per (hand, board, opp, iter).
  const winPct = OddsCalculator.calculate(holeCards, communityCards, activeOpponents + 1, 150);
  return clamp01(winPct / 100);
}

/**
 * Chen formula (slightly simplified) → normalised to ~[0, 1].
 *  • High card score: A=10, K=8, Q=7, J=6, T=5, else value/2.
 *  • Pair: max(highScore * 2, 5).
 *  • Suited: +2.
 *  • Gap: 1→-1, 2→-2, 3→-4, ≥4→-5.
 *  • Connectors (gap≤1, high≤Q): +1.
 *  • Multi-way penalty per extra opponent.
 */
function chenEquity(holeCards: CardDef[], activeOpponents: number): number {
  const a = holeCards[0];
  const b = holeCards[1];
  const high = Math.max(a.value, b.value);
  const low = Math.min(a.value, b.value);
  const highScore = (v: number) =>
    v === 14 ? 10 : v === 13 ? 8 : v === 12 ? 7 : v === 11 ? 6 : v === 10 ? 5 : v / 2;

  let score: number;
  if (a.value === b.value) {
    score = Math.max(highScore(high) * 2, 5);
  } else {
    score = highScore(high);
    if (a.suit === b.suit) score += 2;
    const gap = high - low - 1;
    if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else if (gap >= 4) score -= 5;
    if (gap <= 1 && high <= 12) score += 1;
  }

  let normalised = score / 22;
  // Cap penalty at 2 extra opponents (0.06) so 6-way tables don't collapse
  // strong hands like AKo down to junk equity.
  const oppPenalty = Math.min(Math.max(0, activeOpponents - 1), 2) * 0.03;
  normalised -= oppPenalty;
  return Math.max(0.08, Math.min(0.88, normalised));
}

/** Pot-sized raise modulated by aggression / bluff intent / mood. */
function computeRaiseAmount(
  gameState: GameState,
  bot: Player,
  persona: BotPersona,
  equity: number,
  isBluff: boolean,
): number {
  const { pot, minBet, bigBlind, minRaise } = gameState;

  const factor = isBluff
    ? 0.4 + persona.bluffFrequency * 0.3 + (bot.mood === 'frisky' ? 0.1 : 0)
    : 0.5 + persona.aggression * 0.5 + (equity > 0.75 ? 0.2 : 0);

  let target = Math.round(minBet + Math.max(bigBlind, pot * factor));
  target = Math.max(target, minBet + (minRaise || bigBlind));
  target = Math.round(target / bigBlind) * bigBlind;

  const max = bot.currentBet + bot.chips;
  if (target > max) target = max;
  return target;
}
