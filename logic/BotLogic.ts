import { GameState, Player, PlayerActionType, HandResult, GamePhase } from '../types';
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
    // We use the HandEvaluator to get a semantic rank.
    let strengthScore = 0;
    
    // Combine hole cards + community (if any)
    const handResult = HandEvaluator.evaluate(bot.holeCards, communityCards);
    
    // Simple heuristic mapping based on Hand Name
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

    // Adjust for Pre-Flop (High Cards are good)
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
    } else {
        strengthScore = baseStrength;
    }

    // 3. Randomness based on Difficulty (Bluff factor)
    const roll = Math.random();
    const difficulty = bot.difficulty || 'MEDIUM';
    
    let aggressionThreshold = 0.7; // Needs 7/10 strength to raise
    let looseness = 0.3; // Will play 30% of hands

    if (difficulty === 'EASY') {
        aggressionThreshold = 0.9; // Only raise on nuts
        looseness = 0.8; // Calls too much
    } else if (difficulty === 'HARD') {
        aggressionThreshold = 0.5; // Aggressive
        looseness = 0.4;
    }

    // 4. Decision Tree

    // FOLD if very weak and facing a bet
    if (!isCheckAvailable && strengthScore < 2 && !isPreFlop && roll > looseness) {
        return { action: PlayerActionType.FOLD };
    }
    
    // RAISE if strong
    if (strengthScore >= 5 || (roll > 0.9 && difficulty === 'HARD')) { // Random bluff
         // Raise 2.5x to 3x min bet
         const raiseAmt = minBet + (minBet > 0 ? minBet : gameState.bigBlind); 
         // Check affordability
         if (bot.chips >= raiseAmt - currentBet) {
             return { action: PlayerActionType.RAISE, amount: raiseAmt + minBet };
         }
    }

    // CALL / CHECK
    if (isCheckAvailable) {
        return { action: PlayerActionType.CHECK };
    } else {
        // Only call if chips allow
        if (bot.chips >= callAmount) {
            return { action: PlayerActionType.CALL };
        } else {
            // Force Fold if can't afford (All-in logic handles inside store, but here we be safe)
            // If we have chips, call (All-in)
            return { action: PlayerActionType.CALL }; 
        }
    }

    // Fallback
    return { action: PlayerActionType.FOLD };
  }
};