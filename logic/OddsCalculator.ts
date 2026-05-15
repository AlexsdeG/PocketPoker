import { CardDef, Player } from '../types';
import { HandEvaluator } from './handEvaluator';
import { Deck } from './Deck';

// Tiny LRU-ish cache for repeated calls within the same street (e.g. the same
// bot re-evaluated multiple times after re-raises). Keyed by hole+board+opp+iter.
const ODDS_CACHE = new Map<string, { ts: number; value: number }>();
const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 256;

function cacheKey(my: CardDef[], board: CardDef[], opp: number, iter: number): string {
  const ser = (c: CardDef) => `${c.rank}${c.suit}`;
  const myK = [...my].map(ser).sort().join('');
  const bK = [...board].map(ser).sort().join('');
  return `${myK}|${bK}|${opp}|${iter}`;
}

// Simplified Monte Carlo Simulation
// In a real app, this should run in a Web Worker to avoid blocking UI
export const OddsCalculator = {
  calculate(
    myCards: CardDef[], 
    communityCards: CardDef[], 
    totalActivePlayers: number, 
    iterations = 1000
  ): number {
    if (myCards.length !== 2) return 0;

    const key = cacheKey(myCards, communityCards, totalActivePlayers, iterations);
    const now = Date.now();
    const hit = ODDS_CACHE.get(key);
    if (hit && now - hit.ts < CACHE_TTL_MS) return hit.value;

    let wins = 0;
    const deck = new Deck(); // Use a fresh deck logic
    
    // Serialize known cards to remove them from deck
    const knownCards = [...myCards, ...communityCards].map(HandEvaluator.serializeCard);

    for (let i = 0; i < iterations; i++) {
        deck.reset();
        deck.shuffle();
        
        // Remove known cards (naive approach for simulation speed)
        // A better way is to filter the deck once, but this is fast enough for 1000 iter
        const simDeck = deck.deal(52).filter(c => !knownCards.includes(HandEvaluator.serializeCard(c)));
        
        // Deal Community Remainder
        const cardsNeededForBoard = 5 - communityCards.length;
        const simBoard = [...communityCards, ...simDeck.splice(0, cardsNeededForBoard)];
        
        // Deal Opponents
        const opponentsHands = [];
        for (let p = 0; p < totalActivePlayers - 1; p++) {
            opponentsHands.push(simDeck.splice(0, 2));
        }

        // Evaluate My Hand
        const myResult = HandEvaluator.evaluate(myCards, simBoard);
        
        // Evaluate Opponents
        let lost = false;
        for (const oppHand of opponentsHands) {
            const oppResult = HandEvaluator.evaluate(oppHand, simBoard);
            if (oppResult.value > myResult.value) {
                lost = true;
                break;
            }
        }

        if (!lost) wins++;
    }

    const value = Math.round((wins / iterations) * 100);

    // Cache write + simple size bound
    if (ODDS_CACHE.size >= CACHE_MAX) {
      const firstKey = ODDS_CACHE.keys().next().value;
      if (firstKey !== undefined) ODDS_CACHE.delete(firstKey);
    }
    ODDS_CACHE.set(key, { ts: now, value });
    return value;
  }
};