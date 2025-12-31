// @ts-ignore
import pokersolver from 'pokersolver';
import { CardDef, HandResult } from '../types';

// Extract Hand from the default export (CommonJS wrapper behavior)
const { Hand } = pokersolver;

export const HandEvaluator = {
  /**
   * Converts internal CardDef to pokersolver string format (e.g. "Ah", "Td")
   */
  serializeCard(card: CardDef): string {
    return `${card.rank}${card.suit}`;
  },

  /**
   * Evaluates the best hand from hole cards + community cards
   */
  evaluate(holeCards: CardDef[], communityCards: CardDef[]): HandResult {
    // Safety check for empty inputs
    if ((!holeCards || holeCards.length === 0) && (!communityCards || communityCards.length === 0)) {
        return {
            rank: "High Card",
            descr: "No Hand",
            value: 0,
            winningCards: []
        };
    }

    const allCards = [...holeCards, ...communityCards].map(this.serializeCard);
    
    // Safety check for minimum cards
    if (allCards.length === 0) {
         return {
            rank: "High Card",
            descr: "No Hand",
            value: 0,
            winningCards: []
        };
    }

    try {
      const solved = Hand.solve(allCards);
      
      // Default: all 5 cards that make the hand (includes kickers)
      // @ts-ignore
      let winningCardStrings: string[] = solved.cards.map(c => `${c.value}${c.suit}`);
      
      // REFINEMENT: Filter out kickers for specific hand types
      // Hand.name returns: "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush"
      
      const rankCounts: Record<string, number> = {};
      winningCardStrings.forEach(c => {
          const rank = c.substring(0, c.length - 1); // Remove suit (last char)
          rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      });

      if (solved.name === "Pair") {
          // Keep only cards with count 2
          winningCardStrings = winningCardStrings.filter(c => rankCounts[c.substring(0, c.length - 1)] === 2);
      } else if (solved.name === "Two Pair") {
           // Keep only cards with count 2
          winningCardStrings = winningCardStrings.filter(c => rankCounts[c.substring(0, c.length - 1)] === 2);
      } else if (solved.name === "Three of a Kind") {
           // Keep only cards with count 3
          winningCardStrings = winningCardStrings.filter(c => rankCounts[c.substring(0, c.length - 1)] === 3);
      } else if (solved.name === "Four of a Kind") {
           // Keep only cards with count 4
          winningCardStrings = winningCardStrings.filter(c => rankCounts[c.substring(0, c.length - 1)] === 4);
      } else if (solved.name === "Full House") {
          // Keep all (3 + 2)
      } else if (solved.name === "High Card") {
          // Usually we highlight the single highest card
          // solved.cards is sorted high to low. Keep index 0.
          if (winningCardStrings.length > 0) winningCardStrings = [winningCardStrings[0]];
      }

      return {
        rank: solved.name, // e.g. "Two Pair"
        descr: solved.descr, // e.g. "Two Pair, A's & K's"
        value: solved.rank, // Numeric rank for comparison
        winningCards: winningCardStrings
      };
    } catch (e) {
      console.error("Hand Evaluation Error", e);
      return {
        rank: "High Card",
        descr: "Error Calculating Hand",
        value: 0,
        winningCards: []
      };
    }
  },

  /**
   * Determines the winner(s) from a list of players
   * Returns array of player IDs
   */
  getWinners(players: { id: string, holeCards: CardDef[] }[], communityCards: CardDef[]): string[] {
    const validPlayers = players.filter(p => p.holeCards.length > 0);
    
    if (validPlayers.length === 0) return [];

    const hands = validPlayers.map(p => {
        const cardStrings = [...p.holeCards, ...communityCards].map(this.serializeCard);
        const hand = Hand.solve(cardStrings);
        hand.playerId = p.id; 
        return hand;
    });

    const winners = Hand.winners(hands);
    // @ts-ignore
    return winners.map(w => w.playerId);
  }
};