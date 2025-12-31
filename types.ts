export enum GamePhase {
  IDLE = 'IDLE',
  BLINDS = 'BLINDS',
  PRE_FLOP = 'PRE_FLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
}

export enum CardSuit {
  HEARTS = 'h',
  DIAMONDS = 'd',
  CLUBS = 'c',
  SPADES = 's',
}

export interface CardDef {
  suit: CardSuit;
  rank: string; // '2'...'9', 'T', 'J', 'Q', 'K', 'A'
  value: number; // 2...14
}

export enum PlayerActionType {
  FOLD = 'FOLD',
  CHECK = 'CHECK',
  CALL = 'CALL',
  RAISE = 'RAISE',
  ALL_IN = 'ALL_IN',
  POST_BLIND = 'POST_BLIND',
}

export enum BotDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum DeckType {
  STANDARD = 'STANDARD',
  SHORT_DECK = 'SHORT_DECK', // Removes 2-5
}

export interface UserProfile {
  id: string;
  username: string;
  avatarId: string;
  avatarUrl?: string; // Base64 image
  bankroll: number;
  handsWon: number;
  handsPlayed: number;
}

export interface BotConfig {
    id: string;
    name: string;
    color: string; // hex
    useAI?: boolean; // New: Use Gemini AI
}

export interface GameSettings {
  startingChips: number;
  blindStructure: 'standard' | 'turbo';
  anteEnabled: boolean;
  anteAmount: number;
  botCount: number;
  botDifficulty: BotDifficulty;
  deckType: DeckType;
  playerOrder: string[]; 
  botConfigs: Record<string, BotConfig>;
  aiCanSeeOdds: boolean; // New: Allow AI to see calculated win odds
}

export interface UserSettings {
  profiles: UserProfile[];
  activeProfileId: string;
  audio: {
    masterVolume: number;
    sfxEnabled: boolean;
    musicEnabled: boolean;
    ambienceEnabled: boolean;
  };
  gameplay: {
    showTutorials: boolean;
    showOdds: boolean; // Show win probability for User
    showEnemyOdds: boolean; // Show win probability for Enemies
    rotateDealer: boolean; // Rotate dealer button after hand
    allowCheats: boolean; // Open cards mode
    fourColorDeck: boolean;
    hapticsEnabled: boolean;
  };
  statistics: {
    handsPlayed: number;
    handsWon: number;
    biggestPot: number;
  };
}

export interface HandResult {
  rank: string;
  descr: string;
  value: number;
  winningCards?: string[]; // strings like "Ah", "Kd" to identify which cards made the hand
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  isBot: boolean;
  useAI?: boolean; // New: Is this player controlled by Gemini?
  avatarUrl?: string; // For user
  color?: string; // For bots
  difficulty?: BotDifficulty;
  holeCards: CardDef[];
  isActive: boolean;
  hasActed: boolean;
  currentBet: number;
  isAllIn: boolean;
  handResult?: HandResult;
  winOdds?: number; // Calculated probability 0-100
}

export interface Pot {
  amount: number;
  eligiblePlayers: string[];
}

export interface GameState {
  config: GameSettings;
  phase: GamePhase;
  pot: number;
  sidePots: Pot[];
  deck: CardDef[];
  communityCards: CardDef[];
  players: Player[];
  currentPlayerId: string | null;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minBet: number;
  minRaise: number;
  lastAggressorId: string | null;
  winners: string[]; // IDs
  handsPlayedInSession: number;
}