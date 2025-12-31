import { GameState, Player, PlayerActionType, HandResult, GamePhase, BotPlayStyle } from '../types';
import { HandEvaluator } from './handEvaluator';

export const BotLogic = {
  /**
   * Decides the next move for a bot.
   */
  decide(gameState: GameState, bot: Player): { action: PlayerActionType; amount?: number } {
    const { communityCards, minBet, pot, players } = gameState;
    
    // 1. Basic Setup
    const currentBet = bot.currentBet;
    const callAmount = minBet - currentBet;
    const isPreFlop = gameState.phase === GamePhase.PRE_FLOP;
    const isCheckAvailable = callAmount === 0;

    // 2. Evaluate Hand Strength (0 to ~8000 depending on library, normalized here roughly)
    const handResult = HandEvaluator.evaluate(bot.holeCards, communityCards);
    
    const rankStrength: Record<string, number> = {
        "High Card": 1,
        "Pair": 2,
        "Two Pair": 3,
        "Three of a Kind": 4,
        "Straight": 5,
        "Flush": 6,
        "Full House": 7,
        "Four of a Kind": 8,
        "Straight Flush": 9,
        "Royal Flush": 10
    };

    const baseStrength = rankStrength[handResult.rank] || 1;
    let strengthScore = baseStrength;

    // Adjust for Pre-Flop
    if (isPreFlop) {
        const c1 = bot.holeCards[0].value;
        const c2 = bot.holeCards[1].value;
        const isPair = c1 === c2;
        const sum = c1 + c2;
        
        if (isPair && c1 >= 10) strengthScore = 8; // AA, KK, QQ, JJ, TT
        else if (isPair) strengthScore = 5; // Small pair
        else if (sum > 25) strengthScore = 6; // AK, AQ
        else if (sum > 20) strengthScore = 3; // KJ, QJ
        else strengthScore = 1;
    }

    // 3. Playstyle Modifiers
    const style = bot.playStyle || BotPlayStyle.RANDOM;
    const roll = Math.random();
    
    // "Schlitzohr" (Tricky) - sometimes bluffs weak hands, traps with strong hands
    const isSchlitzohr = style === BotPlayStyle.SCHLITZOHR;
    // "Aggressive" - Raises more, calls less
    const isAggressive = style === BotPlayStyle.AGGRESSIVE;
    // "Passive" - Calls more, rarely raises
    const isPassive = style === BotPlayStyle.PASSIVE;
    
    // 4. Decision Logic

    // --- RANDOM ---
    // High Chaos, but still grounded in rule compliance
    if (style === BotPlayStyle.RANDOM) {
        const randomRoll = Math.random();
        if (randomRoll < 0.2) return { action: PlayerActionType.FOLD }; // 20% fold always
        if (randomRoll < 0.6) return { action: isCheckAvailable ? PlayerActionType.CHECK : PlayerActionType.CALL }; 
        // Raise logic
        const raiseAmt = minBet + gameState.bigBlind;
        if (bot.chips >= raiseAmt - currentBet) {
             return { action: PlayerActionType.RAISE, amount: raiseAmt + minBet };
        }
        return { action: PlayerActionType.CALL };
    }

    // --- STRATEGIC TYPES ---
    
    // FOLD LOGIC
    // Passive folds easily. Aggressive holds on longer.
    let foldThreshold = 2; 
    if (isAggressive) foldThreshold = 1.5;
    if (isPassive) foldThreshold = 2.5;

    // If check is available, we almost never fold unless we are "Random" or weird.
    // So only check Fold if we have to pay.
    if (!isCheckAvailable) {
         // If huge bet relative to pot, consider folding more
         const potOdds = callAmount / (pot + callAmount);
         if (strengthScore < foldThreshold && potOdds > 0.1) {
             // Schlitzohr might float a weak hand
             if (isSchlitzohr && roll > 0.8) {
                 // Float
             } else {
                 return { action: PlayerActionType.FOLD };
             }
         }
    }

    // RAISE LOGIC
    let raiseThreshold = 5;
    if (isAggressive) raiseThreshold = 4;
    if (isPassive) raiseThreshold = 8; // Only nuts
    
    // Bluff Logic
    let bluffChance = 0;
    if (isAggressive) bluffChance = 0.3;
    if (isSchlitzohr) bluffChance = 0.4;
    
    const wantsToRaise = strengthScore >= raiseThreshold || (roll < bluffChance && strengthScore < 3);

    if (wantsToRaise) {
         // Schlitzohr Trap: Check-Raise or slow play strong hands
         if (isSchlitzohr && strengthScore > 7 && roll < 0.5) {
             return { action: isCheckAvailable ? PlayerActionType.CHECK : PlayerActionType.CALL };
         }

         const raiseAmt = minBet + (minBet > 0 ? minBet : gameState.bigBlind); 
         if (bot.chips >= raiseAmt - currentBet) {
             return { action: PlayerActionType.RAISE, amount: raiseAmt + minBet };
         }
    }

    // CALL/CHECK as fallback
    if (isCheckAvailable) return { action: PlayerActionType.CHECK };
    if (bot.chips >= callAmount) return { action: PlayerActionType.CALL };
    
    return { action: PlayerActionType.FOLD };
  }
};