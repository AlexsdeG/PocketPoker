import { BotMood, BotPersona, BotPlayStyle } from '../types';

/**
 * Base personas for each playstyle. Numbers are intentionally subtle and
 * overlapping — the *combination* of traits + per-hand jitter + mood + tilt
 * is what makes a profile feel distinctive. No extreme 0 / 1 values.
 *
 * Trait crib:
 *   aggression      — how often we bet/raise marginal hands
 *   tightness       — preflop range cutoff (high = fewer hands played)
 *   bluffFrequency  — pure-bluff probability when weak
 *   callStation     — preference for calling over folding/raising
 *   trapping        — slow-play monsters
 *   adaptability    — react to opponent aggression
 *   tiltResistance  — immunity to recent-loss tilt
 *   thinkMsBase     — base reaction time
 *   thinkMsJitter   — random ± around base
 */
export const PROFILE_LIBRARY: Record<Exclude<BotPlayStyle, BotPlayStyle.RANDOM>, BotPersona> = {
  [BotPlayStyle.TAG]: {
    aggression: 0.55, tightness: 0.62, bluffFrequency: 0.18,
    callStation: 0.15, trapping: 0.20, adaptability: 0.65,
    tiltResistance: 0.75, thinkMsBase: 1500, thinkMsJitter: 600,
  },
  [BotPlayStyle.LAG]: {
    aggression: 0.70, tightness: 0.35, bluffFrequency: 0.30,
    callStation: 0.15, trapping: 0.25, adaptability: 0.60,
    tiltResistance: 0.55, thinkMsBase: 1300, thinkMsJitter: 700,
  },
  [BotPlayStyle.NIT]: {
    aggression: 0.20, tightness: 0.72, bluffFrequency: 0.05,
    callStation: 0.30, trapping: 0.10, adaptability: 0.40,
    tiltResistance: 0.80, thinkMsBase: 1700, thinkMsJitter: 500,
  },
  [BotPlayStyle.ROCK]: {
    aggression: 0.15, tightness: 0.82, bluffFrequency: 0.02,
    callStation: 0.20, trapping: 0.05, adaptability: 0.30,
    tiltResistance: 0.90, thinkMsBase: 1800, thinkMsJitter: 400,
  },
  [BotPlayStyle.CALLING_STATION]: {
    aggression: 0.25, tightness: 0.40, bluffFrequency: 0.05,
    callStation: 0.85, trapping: 0.05, adaptability: 0.20,
    tiltResistance: 0.50, thinkMsBase: 1400, thinkMsJitter: 500,
  },
  [BotPlayStyle.MANIAC]: {
    aggression: 0.85, tightness: 0.25, bluffFrequency: 0.45,
    callStation: 0.10, trapping: 0.15, adaptability: 0.45,
    tiltResistance: 0.35, thinkMsBase: 1100, thinkMsJitter: 700,
  },
  [BotPlayStyle.SCHLITZOHR]: {
    aggression: 0.50, tightness: 0.55, bluffFrequency: 0.35,
    callStation: 0.20, trapping: 0.65, adaptability: 0.70,
    tiltResistance: 0.65, thinkMsBase: 1600, thinkMsJitter: 700,
  },
  [BotPlayStyle.WILD_CARD]: {
    aggression: 0.55, tightness: 0.50, bluffFrequency: 0.30,
    callStation: 0.40, trapping: 0.35, adaptability: 0.50,
    tiltResistance: 0.45, thinkMsBase: 1400, thinkMsJitter: 800,
  },
  // Legacy enum values — internally mapped to modern personas.
  [BotPlayStyle.AGGRESSIVE]: {
    aggression: 0.70, tightness: 0.35, bluffFrequency: 0.30,
    callStation: 0.15, trapping: 0.25, adaptability: 0.60,
    tiltResistance: 0.55, thinkMsBase: 1300, thinkMsJitter: 700,
  },
  [BotPlayStyle.PASSIVE]: {
    aggression: 0.20, tightness: 0.72, bluffFrequency: 0.05,
    callStation: 0.30, trapping: 0.10, adaptability: 0.40,
    tiltResistance: 0.80, thinkMsBase: 1700, thinkMsJitter: 500,
  },
};

const clamp = (v: number, min = 0.05, max = 0.95) => Math.max(min, Math.min(max, v));
const rand = () => Math.random();

/** ±15 % jitter on every trait, then mood + tilt shifts. */
export function materializePersona(
  style: BotPlayStyle | undefined,
  tiltLevel = 0,
): { persona: BotPersona; mood: BotMood } {
  const mood: BotMood = pickMood();

  let base: BotPersona;
  if (!style || style === BotPlayStyle.RANDOM) {
    base = randomBasePersona();
  } else {
    base = PROFILE_LIBRARY[style];
  }

  const jitter = (v: number) => clamp(v * (1 + (rand() * 2 - 1) * 0.15));
  const moodAggrShift = mood === 'frisky' ? 0.10 : mood === 'cautious' ? -0.10 : 0;
  const tiltShift = (1 - base.tiltResistance) * tiltLevel; // 0..~0.5 push to aggression

  const persona: BotPersona = {
    aggression: clamp(jitter(base.aggression) + moodAggrShift + tiltShift * 0.5),
    tightness: clamp(jitter(base.tightness) - tiltShift * 0.3),
    bluffFrequency: clamp(jitter(base.bluffFrequency) + tiltShift * 0.4),
    callStation: clamp(jitter(base.callStation) + (mood === 'cautious' ? 0.05 : 0)),
    trapping: clamp(jitter(base.trapping)),
    adaptability: clamp(jitter(base.adaptability)),
    tiltResistance: base.tiltResistance, // not jittered — it's a stable trait
    thinkMsBase: base.thinkMsBase,
    thinkMsJitter: base.thinkMsJitter,
  };

  return { persona, mood };
}

function pickMood(): BotMood {
  const r = rand();
  if (r < 0.30) return 'cautious';
  if (r < 0.80) return 'normal';
  return 'frisky';
}

/**
 * For the RANDOM profile: sample every trait uniformly from [0.20, 0.80] so the
 * bot is *coherently random* (still passes through the same decision engine,
 * doesn't just thrash). Different every hand.
 */
function randomBasePersona(): BotPersona {
  const u = () => 0.15 + rand() * 0.50; // tightness upper bound 0.65 (was 0.80)
  return {
    aggression: u(),
    tightness: u(),
    bluffFrequency: u(),
    callStation: u(),
    trapping: u(),
    adaptability: u(),
    tiltResistance: u(),
    thinkMsBase: 1200 + rand() * 700,
    thinkMsJitter: 400 + rand() * 500,
  };
}

/**
 * Update tilt based on the chip delta from the previous hand. Big losses raise
 * tilt; wins or break-even slowly cool it. Capped at [0, 1].
 */
export function updateTiltLevel(prev: number | undefined, chipDelta: number, stack: number): number {
  const base = prev ?? 0;
  const lossPct = chipDelta < 0 ? Math.min(1, Math.abs(chipDelta) / Math.max(1, stack)) : 0;
  const gain = chipDelta > 0 ? 0.15 : 0;
  const next = base + lossPct * 0.5 - gain - 0.05; // gentle decay each hand
  return Math.max(0, Math.min(1, next));
}
