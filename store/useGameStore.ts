import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { GamePhase, GameState, UserSettings, PlayerActionType, Player, CardDef, GameSettings, BotDifficulty, DeckType, UserProfile, BotConfig } from '../types';
import { Deck } from '../logic/Deck';
import { HandEvaluator } from '../logic/handEvaluator';
import { OddsCalculator } from '../logic/OddsCalculator';

interface State {
  // UI State
  currentView: 'MENU' | 'GAME' | 'SETUP' | 'PROFILES' | 'ACADEMY';

  // Domain State
  gameState: GameState;
  userSettings: UserSettings;
  
  // Actions
  setView: (view: 'MENU' | 'GAME' | 'SETUP' | 'PROFILES' | 'ACADEMY') => void;
  
  // Profile Management
  addProfile: (name: string, avatarId: string) => void;
  setActiveProfile: (id: string) => void;
  updateActiveProfile: (data: Partial<UserProfile>) => void;
  toggleSetting: (category: keyof UserSettings, key: string) => void;

  // Game Logic Actions
  initializeGame: (settings: GameSettings) => void; 
  restartMatch: () => void; 
  startGame: () => void; // Deals hand / Next Hand
  playerAction: (action: PlayerActionType, amount?: number) => void;
  resetGame: () => void; 
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'default',
  username: 'Player 1',
  avatarId: 'default',
  bankroll: 10000,
  handsPlayed: 0,
  handsWon: 0
};

const DEFAULT_SETTINGS: UserSettings = {
  profiles: [DEFAULT_PROFILE],
  activeProfileId: 'default',
  audio: {
    masterVolume: 0.8,
    sfxEnabled: true,
    musicEnabled: true,
    ambienceEnabled: false,
  },
  gameplay: {
    showTutorials: true,
    showOdds: true,
    showEnemyOdds: false,
    rotateDealer: true,
    allowCheats: false,
    fourColorDeck: false,
    hapticsEnabled: true,
  },
  statistics: {
    handsPlayed: 0,
    handsWon: 0,
    biggestPot: 0,
  }
};

const INITIAL_GAME_STATE: GameState = {
  config: {
    startingChips: 1000,
    blindStructure: 'standard',
    anteEnabled: false,
    anteAmount: 0,
    botCount: 3,
    botDifficulty: BotDifficulty.MEDIUM,
    deckType: DeckType.STANDARD,
    playerOrder: [],
    botConfigs: {},
    aiCanSeeOdds: false,
  },
  phase: GamePhase.IDLE,
  pot: 0,
  sidePots: [],
  deck: [],
  communityCards: [],
  players: [],
  currentPlayerId: null,
  dealerIndex: 0,
  smallBlind: 10,
  bigBlind: 20,
  minBet: 20,
  minRaise: 20,
  lastAggressorId: null,
  winners: [],
  handsPlayedInSession: 0,
};

const deckInstance = new Deck();

export const useGameStore = create<State>()(
  persist(
    immer((set, get) => ({
      currentView: 'MENU',
      gameState: INITIAL_GAME_STATE,
      userSettings: DEFAULT_SETTINGS,

      setView: (view) => set((state) => { state.currentView = view }),

      toggleSetting: (category, key) => set((state) => {
          // @ts-ignore
          state.userSettings[category][key] = !state.userSettings[category][key];
      }),

      addProfile: (name, avatarId) => set((state) => {
        const newProfile: UserProfile = {
            id: uuidv4(),
            username: name,
            avatarId,
            bankroll: 10000,
            handsPlayed: 0,
            handsWon: 0
        };
        state.userSettings.profiles.push(newProfile);
        state.userSettings.activeProfileId = newProfile.id;
      }),

      setActiveProfile: (id) => set((state) => {
        if (state.userSettings.profiles.find(p => p.id === id)) {
            state.userSettings.activeProfileId = id;
        }
      }),

      updateActiveProfile: (data) => set((state) => {
        const idx = state.userSettings.profiles.findIndex(p => p.id === state.userSettings.activeProfileId);
        if (idx !== -1) {
            Object.assign(state.userSettings.profiles[idx], data);
        }
      }),

      initializeGame: (settings) => set((state) => {
        const activeProfile = state.userSettings.profiles.find(p => p.id === state.userSettings.activeProfileId) || state.userSettings.profiles[0];
        
        // Check Funds
        if (activeProfile.bankroll < settings.startingChips) {
            alert("Not enough funds in bankroll!");
            return;
        }

        // 1. Setup User
        const user: Player = {
          id: 'user',
          name: activeProfile.username,
          chips: settings.startingChips,
          isBot: false,
          avatarUrl: activeProfile.avatarUrl,
          holeCards: [],
          isActive: true,
          hasActed: false,
          currentBet: 0,
          isAllIn: false
        };

        // 2. Setup Bots
        const bots: Player[] = Array.from({ length: settings.botCount }).map((_, i) => {
           const botId = `bot-${i}`;
           const config = settings.botConfigs[botId];
           return {
                id: botId,
                name: config ? config.name : `Bot ${i + 1}`,
                chips: settings.startingChips,
                isBot: true,
                useAI: config ? config.useAI : false, // Transfer AI flag
                color: config ? config.color : '#6b7280',
                difficulty: settings.botDifficulty,
                holeCards: [],
                isActive: true,
                hasActed: false,
                currentBet: 0,
                isAllIn: false
            };
        });

        const pool = [user, ...bots];
        
        // 3. Arrange Seats
        let sortedPlayers: Player[] = [];
        if (settings.playerOrder && settings.playerOrder.length > 0) {
            settings.playerOrder.forEach(id => {
                const p = pool.find(pl => pl.id === id);
                if (p) sortedPlayers.push(p);
            });
            // Append missing
            pool.forEach(p => {
                if (!sortedPlayers.find(sp => sp.id === p.id)) sortedPlayers.push(p);
            });
        } else {
            sortedPlayers = pool;
        }

        deckInstance.setType(settings.deckType);
        
        state.gameState = {
            ...INITIAL_GAME_STATE,
            config: settings,
            players: sortedPlayers,
            phase: GamePhase.IDLE,
            smallBlind: settings.blindStructure === 'turbo' ? 50 : 10,
            bigBlind: settings.blindStructure === 'turbo' ? 100 : 20,
            handsPlayedInSession: 0,
        };
        state.currentView = 'GAME';
      }),

      restartMatch: () => set((state) => {
         const config = state.gameState.config;
         state.gameState.players.forEach(p => {
             p.chips = config.startingChips;
             p.holeCards = [];
             p.isActive = true;
             p.isAllIn = false;
             p.currentBet = 0;
             p.hasActed = false;
             p.handResult = undefined;
             p.winOdds = undefined;
         });

         state.gameState.phase = GamePhase.IDLE;
         state.gameState.pot = 0;
         state.gameState.communityCards = [];
         state.gameState.winners = [];
         state.gameState.currentPlayerId = null;
         state.gameState.dealerIndex = 0;
         state.gameState.handsPlayedInSession = 0;
         
         deckInstance.setType(config.deckType);
         deckInstance.reset();
      }),

      startGame: () => set((state) => {
        // This function handles both "Start Match" and "Next Hand"
        deckInstance.reset();
        deckInstance.shuffle();

        const playerCount = state.gameState.players.length;
        if (playerCount < 2) return;

        // BANKROLL SYNC: Deduct chips from Liquid Profile at start of hand
        // This effectively "bets" the table chips from the bankroll
        const user = state.gameState.players.find(p => p.id === 'user');
        const profile = state.userSettings.profiles.find(p => p.id === state.userSettings.activeProfileId);
        if (user && profile) {
            profile.bankroll -= user.chips;
        }

        // Reset Round State
        state.gameState.pot = 0;
        state.gameState.sidePots = [];
        state.gameState.communityCards = [];
        state.gameState.winners = [];
        state.gameState.phase = GamePhase.PRE_FLOP;
        state.gameState.minBet = state.gameState.bigBlind;
        state.gameState.minRaise = state.gameState.bigBlind;

        // Dealer Rotation Logic: Only rotate if we have played at least one hand in this session
        if (state.gameState.handsPlayedInSession > 0 && state.userSettings.gameplay.rotateDealer) {
            state.gameState.dealerIndex = (state.gameState.dealerIndex + 1) % playerCount;
        }
        state.gameState.handsPlayedInSession++;

        // Reset Players
        state.gameState.players.forEach(p => {
          if (p.chips <= 0) p.isActive = false; 
          else p.isActive = true;

          p.isAllIn = false;
          p.hasActed = false;
          p.currentBet = 0; // Clear bet before Ante
          p.holeCards = p.isActive ? deckInstance.deal(2) : [];
          p.handResult = undefined;
          p.winOdds = undefined;
        });

        // Handle Ante (Base Input)
        if (state.gameState.config.anteEnabled && state.gameState.config.anteAmount > 0) {
            const ante = state.gameState.config.anteAmount;
            state.gameState.players.forEach(p => {
                if (p.isActive && p.chips > 0) {
                    const contribution = Math.min(p.chips, ante);
                    p.chips -= contribution;
                    state.gameState.pot += contribution;
                    // Ante is dead money, does not count towards currentBet for calling
                }
            });
        }

        const activeCount = state.gameState.players.filter(p => p.isActive).length;
        if (activeCount < 2) {
             state.gameState.phase = GamePhase.IDLE;
             return;
        }

        // Post Blinds (Calculated from CURRENT Dealer Index)
        const sbIndex = (state.gameState.dealerIndex + 1) % playerCount;
        const bbIndex = (state.gameState.dealerIndex + 2) % playerCount;

        const sbPlayer = state.gameState.players[sbIndex];
        const bbPlayer = state.gameState.players[bbIndex];

        if (sbPlayer && sbPlayer.isActive) {
            const sbAmount = Math.min(sbPlayer.chips, state.gameState.smallBlind);
            sbPlayer.chips -= sbAmount;
            sbPlayer.currentBet = sbAmount;
            state.gameState.pot += sbAmount;
        }

        if (bbPlayer && bbPlayer.isActive) {
            const bbAmount = Math.min(bbPlayer.chips, state.gameState.bigBlind);
            bbPlayer.chips -= bbAmount;
            bbPlayer.currentBet = bbAmount;
            state.gameState.pot += bbAmount;
        }

        // Set UTG (Under The Gun) as first player
        let utgIndex = (state.gameState.dealerIndex + 3) % playerCount;
        while (!state.gameState.players[utgIndex].isActive) {
            utgIndex = (utgIndex + 1) % playerCount;
        }
        state.gameState.currentPlayerId = state.gameState.players[utgIndex].id;
        state.gameState.lastAggressorId = null;

        // Calculate Initial Odds - AI Logic also needs odds if enabled
        const needsOdds = state.userSettings.gameplay.showOdds || state.userSettings.gameplay.showEnemyOdds || state.gameState.config.aiCanSeeOdds;
        
        if (needsOdds) {
             state.gameState.players.forEach(p => {
                 if (p.isActive) {
                     const isUser = p.id === 'user';
                     // Determine if we calculate odds for this player
                     let calc = false;
                     if (isUser && state.userSettings.gameplay.showOdds) calc = true;
                     else if (!isUser && state.userSettings.gameplay.showEnemyOdds) calc = true;
                     else if (p.isBot && p.useAI && state.gameState.config.aiCanSeeOdds) calc = true;

                     if (calc) {
                        p.winOdds = OddsCalculator.calculate(p.holeCards, [], activeCount);
                     }
                 }
             });
        }
      }),

      playerAction: (action, amount = 0) => set((state) => {
        const { players, currentPlayerId, minBet } = state.gameState;
        const playerIndex = players.findIndex(p => p.id === currentPlayerId);
        if (playerIndex === -1) return;

        const player = players[playerIndex];

        switch (action) {
          case PlayerActionType.FOLD:
            player.isActive = false;
            player.hasActed = true;
            break;

          case PlayerActionType.CHECK:
            player.hasActed = true;
            break;

          case PlayerActionType.CALL:
            const callAmount = minBet - player.currentBet;
            const actualCall = Math.min(player.chips, callAmount);
            player.chips -= actualCall;
            player.currentBet += actualCall;
            state.gameState.pot += actualCall;
            player.hasActed = true;
            if (player.chips === 0) player.isAllIn = true;
            break;

          case PlayerActionType.RAISE:
            const totalBet = amount;
            const raiseCost = totalBet - player.currentBet;
            if (player.chips >= raiseCost) {
              player.chips -= raiseCost;
              player.currentBet = totalBet;
              state.gameState.pot += raiseCost;
              state.gameState.minBet = totalBet;
              state.gameState.minRaise = totalBet * 2;
              state.gameState.lastAggressorId = player.id;
              
              players.forEach(p => {
                if (p.id !== player.id && p.isActive && !p.isAllIn) {
                  p.hasActed = false;
                }
              });
              player.hasActed = true;
            }
            break;
        }

        const activePlayers = players.filter(p => p.isActive && !p.isAllIn);
        const allInPlayers = players.filter(p => p.isActive && p.isAllIn);
        const highBet = Math.max(...players.map(p => p.currentBet));
        
        const roundComplete = activePlayers.every(p => p.hasActed && p.currentBet === highBet) || (activePlayers.length === 0 && allInPlayers.length > 0);
        
        const remainingPlayers = players.filter(p => p.isActive);
        if (remainingPlayers.length === 1) {
            // Instant Win by Fold
            const winner = remainingPlayers[0];
            state.gameState.phase = GamePhase.SHOWDOWN;
            state.gameState.winners = [winner.id];
            state.gameState.currentPlayerId = null;
            
            // Distribute and Sync
            distributePotAndSync(state);
            return;
        }

        if (roundComplete) {
            nextPhase(state);
        } else {
            let nextIdx = (playerIndex + 1) % players.length;
            let loopCount = 0;
            while ((!players[nextIdx].isActive || players[nextIdx].isAllIn) && loopCount < players.length) {
                nextIdx = (nextIdx + 1) % players.length;
                loopCount++;
            }
            state.gameState.currentPlayerId = players[nextIdx].id;
        }
      }),

      resetGame: () =>
        set((state) => {
          state.gameState = INITIAL_GAME_STATE;
          deckInstance.reset();
          state.currentView = 'MENU';
        }),
    })),
    {
      name: 'pocket-poker-storage',
      partialize: (state) => ({ 
        userSettings: state.userSettings,
      }),
    }
  )
);

function distributePotAndSync(state: State) {
    const { players, winners, pot } = state.gameState;
    
    // Distribute Pot
    if (winners.length > 0) {
        const splitAmount = Math.floor(pot / winners.length);
        winners.forEach(wid => {
            const winner = players.find(p => p.id === wid);
            if (winner) winner.chips += splitAmount;
        });
    }

    // BANKROLL SYNC: Add chips back to Liquid Profile at end of hand
    // This completes the "safe" transaction
    const user = players.find(p => p.id === 'user');
    const profile = state.userSettings.profiles.find(p => p.id === state.userSettings.activeProfileId);
    if (user && profile) {
        profile.bankroll += user.chips;
        profile.handsPlayed++;
        if (winners.includes('user')) profile.handsWon++;
    }
}

function nextPhase(state: State) {
    const { phase, players } = state.gameState;

    players.forEach(p => {
        p.currentBet = 0;
        p.hasActed = false;
    });

    state.gameState.minBet = 0;

    switch (phase) {
        case GamePhase.PRE_FLOP:
            state.gameState.phase = GamePhase.FLOP;
            state.gameState.communityCards = deckInstance.deal(3);
            break;
        case GamePhase.FLOP:
            state.gameState.phase = GamePhase.TURN;
            state.gameState.communityCards.push(...deckInstance.deal(1));
            break;
        case GamePhase.TURN:
            state.gameState.phase = GamePhase.RIVER;
            state.gameState.communityCards.push(...deckInstance.deal(1));
            break;
        case GamePhase.RIVER:
            state.gameState.phase = GamePhase.SHOWDOWN;
            const activePlayers = players.filter(p => p.isActive);
            
            // Calculate Winners
            const winnerIds = HandEvaluator.getWinners(activePlayers, state.gameState.communityCards);
            state.gameState.winners = winnerIds;
            
            // Evaluate everyone's hand for display
            activePlayers.forEach(p => {
                p.handResult = HandEvaluator.evaluate(p.holeCards, state.gameState.communityCards);
            });

            // Distribute and Sync
            distributePotAndSync(state);

            state.gameState.currentPlayerId = null; 
            return; 
    }

    // Recalculate Odds
    const activeCount = state.gameState.players.filter(p => p.isActive).length;
    const needsOdds = state.userSettings.gameplay.showOdds || state.userSettings.gameplay.showEnemyOdds || state.gameState.config.aiCanSeeOdds;

    if (needsOdds) {
         state.gameState.players.forEach(p => {
             if (p.isActive) {
                 const isUser = p.id === 'user';
                 let calc = false;
                 if (isUser && state.userSettings.gameplay.showOdds) calc = true;
                 else if (!isUser && state.userSettings.gameplay.showEnemyOdds) calc = true;
                 else if (p.isBot && p.useAI && state.gameState.config.aiCanSeeOdds) calc = true;

                 if (calc) {
                    p.winOdds = OddsCalculator.calculate(p.holeCards, state.gameState.communityCards, activeCount);
                 }
             }
         });
    }

    // Set First Player to Act
    let startIdx = (state.gameState.dealerIndex + 1) % players.length;
    let loopCount = 0;
    while ((!players[startIdx].isActive || players[startIdx].isAllIn) && loopCount < players.length) {
        startIdx = (startIdx + 1) % players.length;
        loopCount++;
    }
    state.gameState.currentPlayerId = players[startIdx].id;
}