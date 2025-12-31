import { CardDef, CardSuit, DeckType } from '../types';

export class Deck {
  private cards: CardDef[] = [];
  private type: DeckType;

  constructor(type: DeckType = DeckType.STANDARD) {
    this.type = type;
    this.reset();
  }

  setType(type: DeckType) {
    this.type = type;
    this.reset();
  }

  reset() {
    this.cards = [];
    const suits = [CardSuit.HEARTS, CardSuit.DIAMONDS, CardSuit.CLUBS, CardSuit.SPADES];
    
    // Standard Ranks
    let ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

    if (this.type === DeckType.SHORT_DECK) {
      // Remove 2, 3, 4, 5
      ranks = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    }
    
    // Map ranks to values
    const getValue = (rank: string) => {
        const map: Record<string, number> = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return map[rank];
    }

    for (const suit of suits) {
      ranks.forEach((rank) => {
        this.cards.push({
          suit,
          rank,
          value: getValue(rank)
        });
      });
    }
  }

  shuffle() {
    // Fisher-Yates Shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count: number): CardDef[] {
    if (this.cards.length < count) {
      // Emergency reset if we run out of cards (rare in Hold'em unless burning poorly)
      // In a real game, you might shuffle mucked cards, but for this app:
      const oldCards = [...this.cards];
      this.reset();
      this.shuffle();
      // Keep old cards to avoid duplication if we merged (simplified here)
    }
    return this.cards.splice(0, count);
  }
}