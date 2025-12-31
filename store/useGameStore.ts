import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { GamePhase, GameState, UserSettings, PlayerActionType, Player, CardDef, GameSettings, BotDifficulty, DeckType, UserProfile, BotConfig, NetworkState, NetMessage, GameEvent } from '../types';
import { Deck } from '../logic/Deck';
import { HandEvaluator } from '../logic/handEvaluator';
import { OddsCalculator } from '../logic/OddsCalculator';
import { NetworkManager } from '../logic/NetworkManager';

interface State {
  // UI State
  currentView: 'MENU' | 'GAME' | 'SETUP' | 'PROFILES' | 'ACADEMY' | 'LOBBY';

  // Domain State
  gameState: GameState;
  userSettings: UserSettings;
  networkState: NetworkState;
  
  // Actions
  setView: (view: 'MENU' | 'GAME' | 'SETUP' | 'PROFILES' | 'ACADEMY' | 'LOBBY') => void;
  
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
  handleTurnTimeout: () => void; // Called when timer expires
  resetGame: () => void; 

  // Networking Actions
  initMultiplayer: (mode: 'HOST' | 'CLIENT', roomId?: string) => Promise<void>;
  updateLobbySettings: (settings: GameSettings) => void;
  receiveState: (state: GameState) => void;
  broadcastAction: (action: PlayerActionType, amount?: number) => void;
  leaveGame: () => Promise<void>;
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
    allowCalculator: false,
    allowAllCalculator: false,
    turnTimerEnabled: false,
    turnTimerSeconds: 30
  },
  phase: GamePhase.IDLE,
  pot: 0,
  sidePots: [],
  deck: [],
  communityCards: [],
  players: [],
  currentPlayerId: null,
  turnExpiresAt: null,
  dealerIndex: 0,
  smallBlind: 10,
  bigBlind: 20,
  minBet: 20,
  minRaise: 20,
  lastAggressorId: null,
  winners: [],
  handsPlayedInSession: 0,
  lastEvent: null
};

const INITIAL_NET_STATE: NetworkState = {
    isMultiplayer: false,
    isHost: false,
    roomId: null,
    myPeerId: null,
    connectedPeers: []
};

const deckInstance = new Deck();

export const useGameStore = create<State>()(
  persist(
    immer((set, get) => ({
      currentView: 'MENU',
      gameState: INITIAL_GAME_STATE,
      userSettings: DEFAULT_SETTINGS,
      networkState: INITIAL_NET_STATE,

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

      initMultiplayer: async (mode, roomId) => {
          const net = NetworkManager.getInstance();
          
          // CRITICAL: Always reset Store first to ensure clean state and NEW ID if host
          net.reset();
          get().resetGame();

          set(state => {
              state.networkState.isMultiplayer = true;
              state.networkState.isHost = (mode === 'HOST');
              state.networkState.roomId = roomId || null;
              if (mode === 'HOST') {
                  state.networkState.lobbySettings = INITIAL_GAME_STATE.config;
              }
              state.networkState.connectedPeers = [];
          });

          // Host generates new random ID (undefined). Client uses own ID.
          const myId = await net.init(mode === 'HOST' ? undefined : undefined);
          
          set(state => { 
              state.networkState.myPeerId = myId; 
              if (mode === 'HOST') state.networkState.roomId = myId;
          });

          const activeProfile = get().userSettings.profiles.find(p => p.id === get().userSettings.activeProfileId) || DEFAULT_PROFILE;

          net.onData = (msg, senderId) => {
              const state = get();
              if (state.networkState.isHost) {
                  if (msg.type === 'JOIN') {
                      if (state.gameState.phase !== GamePhase.IDLE) {
                          net.send(senderId, { type: 'ERROR', payload: { message: "Game in progress" } });
                          return;
                      }
                      const currentPlayers = state.networkState.connectedPeers.length + 1; 
                      const maxPlayers = state.networkState.lobbySettings?.botCount || 6;
                      if (currentPlayers >= maxPlayers) {
                          net.send(senderId, { type: 'ERROR', payload: { message: "Lobby is full" } });
                          return;
                      }
                      const newPeer = { id: senderId, name: msg.payload.name, avatarUrl: msg.payload.avatarUrl };
                      set(s => { 
                          if (!s.networkState.connectedPeers.find(p => p.id === senderId)) {
                              s.networkState.connectedPeers.push(newPeer);
                          }
                      });
                      net.send(senderId, { type: 'WELCOME', payload: get().gameState.config }); 
                      const updatedPeers = get().networkState.connectedPeers;
                      net.broadcast({ type: 'LOBBY_UPDATE', payload: updatedPeers });
                      if (state.networkState.lobbySettings) {
                         net.broadcast({ type: 'LOBBY_SETTINGS', payload: state.networkState.lobbySettings });
                      }
                  } else if (msg.type === 'LEAVE') {
                      // Explicit leave from Client
                      net.onPeerDisconnect!(senderId);
                  } else if (msg.type === 'ACTION') {
                      get().playerAction(msg.payload.action, msg.payload.amount);
                  }
              } else {
                  if (msg.type === 'WELCOME') {
                  } else if (msg.type === 'LOBBY_UPDATE') {
                       set(s => { s.networkState.connectedPeers = msg.payload });
                  } else if (msg.type === 'LOBBY_SETTINGS') {
                       set(s => { s.networkState.lobbySettings = msg.payload });
                  } else if (msg.type === 'GAME_START') {
                       get().receiveState(msg.payload);
                       set(s => { s.currentView = 'GAME' });
                  } else if (msg.type === 'STATE_UPDATE') {
                       get().receiveState(msg.payload);
                  } else if (msg.type === 'HOST_DISCONNECT') {
                      alert("Host has disconnected.");
                      get().leaveGame(); 
                  } else if (msg.type === 'ERROR') {
                      alert(msg.payload.message);
                      get().leaveGame();
                  }
              }
          };

          net.onPeerDisconnect = (peerId) => {
              const state = get();
              if (state.networkState.isHost) {
                  // 1. Remove from Lobby List Immediately
                  set(s => {
                      s.networkState.connectedPeers = s.networkState.connectedPeers.filter(p => p.id !== peerId);
                  });

                  // 2. Handle In-Game State
                  const currentState = get();
                  const playerIdx = currentState.gameState.players.findIndex(p => p.id === peerId);
                  
                  if (playerIdx !== -1) {
                      set(s => {
                          const p = s.gameState.players[playerIdx];
                          if (p.isActive) {
                             p.isActive = false; 
                             p.hasActed = true;
                             p.isRemote = false; 
                             p.name = `${p.name} (Left)`;
                          }
                      });

                      // CRITICAL: If it was the disconnected player's turn, Force Move to unblock
                      if (currentState.gameState.currentPlayerId === peerId) {
                          // Clear timer so it doesn't try to trigger again
                          set(s => { s.gameState.turnExpiresAt = null; });
                          get().playerAction(PlayerActionType.FOLD);
                      }
                  }
                  
                  // 3. Broadcast Updates
                  const net = NetworkManager.getInstance();
                  const updatedPeers = get().networkState.connectedPeers;
                  net.broadcast({ type: 'LOBBY_UPDATE', payload: updatedPeers });
                  
                  if (get().gameState.phase !== GamePhase.IDLE) {
                      broadcastSanitizedState(get());
                  }
              }
          }

          if (mode === 'CLIENT' && roomId) {
              net.connectTo(roomId);
              setTimeout(() => {
                  net.send(roomId, { 
                      type: 'JOIN', 
                      payload: { name: activeProfile.username, avatarUrl: activeProfile.avatarUrl } 
                  });
              }, 1000);
          }
      },

      leaveGame: async () => {
          const state = get();
          const net = NetworkManager.getInstance();
          
          if (state.networkState.isHost) {
              net.broadcast({ type: 'HOST_DISCONNECT', payload: {} });
              // Wait a moment for message to flush before killing connection
              await new Promise(resolve => setTimeout(resolve, 300));
          } else if (state.networkState.isMultiplayer && state.networkState.roomId) {
              net.send(state.networkState.roomId, { type: 'LEAVE', payload: { id: state.networkState.myPeerId } });
              await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Full Reset
          net.reset(); 
          get().resetGame();
      },

      updateLobbySettings: (settings) => {
          set(state => {
              state.networkState.lobbySettings = settings;
              if (state.networkState.isHost) {
                  NetworkManager.getInstance().broadcast({ type: 'LOBBY_SETTINGS', payload: settings });
              }
          });
      },

      updateLobby: (peers) => set(state => {
          state.networkState.connectedPeers = peers;
      }),

      receiveState: (newState) => set(state => {
          state.gameState = newState;
      }),

      initializeGame: (settings) => {
        set((state) => {
            const activeProfile = state.userSettings.profiles.find(p => p.id === state.userSettings.activeProfileId) || state.userSettings.profiles[0];
            const isHost = state.networkState.isHost;
            const isMultiplayer = state.networkState.isMultiplayer;
            const connectedPeers = state.networkState.connectedPeers;

            const humanCount = isMultiplayer ? connectedPeers.length + 1 : 1;
            const totalSeats = isMultiplayer ? Math.max(humanCount, settings.botCount) : settings.botCount + 1;

            const players: Player[] = [];
            players.push({
                id: isMultiplayer ? state.networkState.myPeerId! : 'user',
                name: activeProfile.username,
                chips: settings.startingChips,
                isBot: false,
                avatarUrl: activeProfile.avatarUrl,
                holeCards: [],
                isActive: true,
                hasActed: false,
                currentBet: 0,
                isAllIn: false,
                isRemote: false
            });

            if (isMultiplayer && isHost) {
                connectedPeers.forEach(peer => {
                    if (peer.id === state.networkState.myPeerId) return; 
                    
                    if (players.length < totalSeats) {
                         players.push({
                            id: peer.id,
                            name: peer.name,
                            chips: settings.startingChips,
                            isBot: false,
                            avatarUrl: peer.avatarUrl,
                            holeCards: [],
                            isActive: true,
                            hasActed: false,
                            currentBet: 0,
                            isAllIn: false,
                            isRemote: true,
                            peerId: peer.id
                        });
                    }
                });
            }

            let botIdx = 0;
            while (players.length < totalSeats) {
                const botId = `bot-${botIdx}`;
                const config = settings.botConfigs[botId];
                players.push({
                    id: botId,
                    name: config ? config.name : `Bot ${botIdx + 1}`,
                    chips: settings.startingChips,
                    isBot: true,
                    useAI: config ? config.useAI : false,
                    color: config ? config.color : '#6b7280',
                    difficulty: settings.botDifficulty,
                    holeCards: [],
                    isActive: true,
                    hasActed: false,
                    currentBet: 0,
                    isAllIn: false
                });
                botIdx++;
            }

            deckInstance.setType(settings.deckType);
            
            state.gameState = {
                ...INITIAL_GAME_STATE,
                config: settings,
                players: players, 
                phase: GamePhase.IDLE,
                smallBlind: settings.blindStructure === 'turbo' ? 50 : 10,
                bigBlind: settings.blindStructure === 'turbo' ? 100 : 20,
                handsPlayedInSession: 0,
                lastEvent: null
            };
            
            if (isMultiplayer && isHost) {
                const net = NetworkManager.getInstance();
                net.broadcast({ type: 'GAME_START', payload: state.gameState });
            }
            state.currentView = 'GAME';
        });
      },

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
         state.gameState.turnExpiresAt = null;
         state.gameState.dealerIndex = 0;
         state.gameState.handsPlayedInSession = 0;
         state.gameState.lastEvent = null;
         
         deckInstance.setType(config.deckType);
         deckInstance.reset();

         if (state.networkState.isMultiplayer && state.networkState.isHost) {
             NetworkManager.getInstance().broadcast({ type: 'STATE_UPDATE', payload: state.gameState });
         }
      }),

      startGame: () => set((state) => {
        if (state.networkState.isMultiplayer && !state.networkState.isHost) return;

        // Sync check: Ensure remote players are still connected
        if (state.networkState.isMultiplayer) {
             const connectedIds = state.networkState.connectedPeers.map(p => p.id);
             state.gameState.players.forEach((p, idx) => {
                 if (p.isRemote && p.peerId && !connectedIds.includes(p.peerId)) {
                     p.isRemote = false;
                     p.isBot = true;
                     p.peerId = undefined;
                     p.name = `Bot (Rep)`;
                     p.avatarUrl = undefined;
                     p.isActive = true; 
                 }
             });
        }

        deckInstance.reset();
        deckInstance.shuffle();

        const activeCount = state.gameState.players.filter(p => p.chips > 0).length;
        if (activeCount < 2) return;

        const user = state.gameState.players.find(p => !p.isBot && !p.isRemote);
        if (user) {
            const profile = state.userSettings.profiles.find(p => p.id === state.userSettings.activeProfileId);
            if (profile) profile.bankroll -= user.chips;
        }

        state.gameState.pot = 0;
        state.gameState.sidePots = [];
        state.gameState.communityCards = [];
        state.gameState.winners = [];
        state.gameState.phase = GamePhase.PRE_FLOP;
        state.gameState.minBet = state.gameState.bigBlind;
        state.gameState.minRaise = state.gameState.bigBlind;
        
        // Event for DEAL sound
        state.gameState.lastEvent = { id: uuidv4(), type: 'DEAL' };

        if (state.gameState.handsPlayedInSession > 0 && state.userSettings.gameplay.rotateDealer) {
            let nextDealerIdx = (state.gameState.dealerIndex + 1) % state.gameState.players.length;
            state.gameState.dealerIndex = nextDealerIdx;
        }
        state.gameState.handsPlayedInSession++;

        state.gameState.players.forEach(p => {
          if (p.chips <= 0) p.isActive = false; 
          else p.isActive = true;

          p.isAllIn = false;
          p.hasActed = false;
          p.currentBet = 0; 
          p.holeCards = p.isActive ? deckInstance.deal(2) : [];
          p.handResult = undefined;
          p.winOdds = undefined;
        });

        if (state.gameState.config.anteEnabled && state.gameState.config.anteAmount > 0) {
            const ante = state.gameState.config.anteAmount;
            state.gameState.players.forEach(p => {
                if (p.isActive && p.chips > 0) {
                    const contribution = Math.min(p.chips, ante);
                    p.chips -= contribution;
                    state.gameState.pot += contribution;
                }
            });
        }

        const playerCount = state.gameState.players.length;
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

        let utgIndex = (state.gameState.dealerIndex + 3) % playerCount;
        if (playerCount === 2) {
             utgIndex = state.gameState.dealerIndex;
        } else {
             let attempts = 0;
             while (!state.gameState.players[utgIndex].isActive && attempts < playerCount) {
                 utgIndex = (utgIndex + 1) % playerCount;
                 attempts++;
             }
        }
        
        state.gameState.currentPlayerId = state.gameState.players[utgIndex].id;
        state.gameState.lastAggressorId = null;

        if (state.gameState.config.turnTimerEnabled) {
            state.gameState.turnExpiresAt = Date.now() + (state.gameState.config.turnTimerSeconds * 1000);
        } else {
            state.gameState.turnExpiresAt = null;
        }

        if (state.gameState.config.allowAllCalculator) {
            const activePlayers = state.gameState.players.filter(p => p.isActive);
             state.gameState.players.forEach(p => {
                 if (p.isActive) {
                      p.winOdds = OddsCalculator.calculate(p.holeCards, [], activePlayers.length, 500);
                 }
             });
        } else if (state.gameState.config.allowCalculator) {
            const activePlayers = state.gameState.players.filter(p => p.isActive);
             state.gameState.players.forEach(p => {
                 if (p.isActive) {
                      p.winOdds = OddsCalculator.calculate(p.holeCards, [], activePlayers.length, 500);
                 }
             });
        }

        if (state.networkState.isMultiplayer && state.networkState.isHost) {
            broadcastSanitizedState(state);
        }
      }),

      broadcastAction: (action, amount) => {
          const net = NetworkManager.getInstance();
          const hostId = get().networkState.roomId;
          if (hostId) {
             net.send(hostId, { type: 'ACTION', payload: { action, amount } });
          }
      },

      handleTurnTimeout: () => set((state) => {
          if (state.gameState.phase === GamePhase.SHOWDOWN || state.gameState.phase === GamePhase.IDLE) return;
          if (!state.gameState.currentPlayerId) return;

          const player = state.gameState.players.find(p => p.id === state.gameState.currentPlayerId);
          if (!player) return;

          const callAmount = state.gameState.minBet - player.currentBet;
          const action = callAmount === 0 ? PlayerActionType.CHECK : PlayerActionType.FOLD;
          
          if (action === PlayerActionType.FOLD) {
              player.isActive = false;
              player.hasActed = true;
              state.gameState.lastEvent = { id: uuidv4(), type: 'FOLD', playerId: player.id };
          } else {
              player.hasActed = true;
              state.gameState.lastEvent = { id: uuidv4(), type: 'CHECK', playerId: player.id };
          }
          
          const { players, minBet } = state.gameState;
          const activePlayers = players.filter(p => p.isActive && !p.isAllIn);
          const allInPlayers = players.filter(p => p.isActive && p.isAllIn);
          const highBet = Math.max(...players.map(p => p.currentBet));
          
          const roundComplete = activePlayers.every(p => p.hasActed && p.currentBet === highBet) || (activePlayers.length === 0 && allInPlayers.length > 0);
          
          const remainingPlayers = players.filter(p => p.isActive);
          if (remainingPlayers.length === 1) {
             const winner = remainingPlayers[0];
             state.gameState.phase = GamePhase.SHOWDOWN;
             state.gameState.winners = [winner.id];
             state.gameState.currentPlayerId = null;
             state.gameState.turnExpiresAt = null;
             state.gameState.lastEvent = { id: uuidv4(), type: 'WIN', playerId: winner.id };
             distributePotAndSync(state);
             if (state.networkState.isMultiplayer && state.networkState.isHost) {
                 broadcastSanitizedState(state);
             }
             return;
          }

          if (roundComplete) {
              nextPhase(state);
          } else {
              let nextIdx = (state.gameState.players.indexOf(player) + 1) % players.length;
              let loopCount = 0;
              while ((!players[nextIdx].isActive || players[nextIdx].isAllIn) && loopCount < players.length) {
                  nextIdx = (nextIdx + 1) % players.length;
                  loopCount++;
              }
              state.gameState.currentPlayerId = players[nextIdx].id;
              if (state.gameState.config.turnTimerEnabled) {
                  state.gameState.turnExpiresAt = Date.now() + (state.gameState.config.turnTimerSeconds * 1000);
              }
          }

          if (state.networkState.isMultiplayer && state.networkState.isHost) {
              broadcastSanitizedState(state);
          }
      }),

      playerAction: (action, amount = 0) => set((state) => {
        if (state.networkState.isMultiplayer && !state.networkState.isHost) {
            state.broadcastAction(action, amount);
            return;
        }

        const { players, currentPlayerId, minBet } = state.gameState;
        const playerIndex = players.findIndex(p => p.id === currentPlayerId);
        if (playerIndex === -1) return;

        const player = players[playerIndex];

        switch (action) {
          case PlayerActionType.FOLD:
            player.isActive = false;
            player.hasActed = true;
            state.gameState.lastEvent = { id: uuidv4(), type: 'FOLD', playerId: player.id };
            break;

          case PlayerActionType.CHECK:
            player.hasActed = true;
            state.gameState.lastEvent = { id: uuidv4(), type: 'CHECK', playerId: player.id };
            break;

          case PlayerActionType.CALL:
            const callAmount = minBet - player.currentBet;
            const actualCall = Math.min(player.chips, callAmount);
            player.chips -= actualCall;
            player.currentBet += actualCall;
            state.gameState.pot += actualCall;
            player.hasActed = true;
            if (player.chips === 0) {
                player.isAllIn = true;
                state.gameState.lastEvent = { id: uuidv4(), type: 'ALL_IN', playerId: player.id, amount: actualCall };
            } else {
                state.gameState.lastEvent = { id: uuidv4(), type: 'CALL', playerId: player.id, amount: actualCall };
            }
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
              
              if (player.chips === 0) {
                   player.isAllIn = true;
                   state.gameState.lastEvent = { id: uuidv4(), type: 'ALL_IN', playerId: player.id, amount: raiseCost };
              } else {
                   state.gameState.lastEvent = { id: uuidv4(), type: 'RAISE', playerId: player.id, amount: totalBet };
              }
            }
            break;
        }

        const activePlayers = players.filter(p => p.isActive && !p.isAllIn);
        const allInPlayers = players.filter(p => p.isActive && p.isAllIn);
        const highBet = Math.max(...players.map(p => p.currentBet));
        
        const roundComplete = activePlayers.every(p => p.hasActed && p.currentBet === highBet) || (activePlayers.length === 0 && allInPlayers.length > 0);
        
        const remainingPlayers = players.filter(p => p.isActive);
        if (remainingPlayers.length === 1) {
            const winner = remainingPlayers[0];
            state.gameState.phase = GamePhase.SHOWDOWN;
            state.gameState.winners = [winner.id];
            state.gameState.currentPlayerId = null;
            state.gameState.turnExpiresAt = null; 
            state.gameState.lastEvent = { id: uuidv4(), type: 'WIN', playerId: winner.id };
            distributePotAndSync(state);
            
            if (state.networkState.isMultiplayer && state.networkState.isHost) {
                broadcastSanitizedState(state);
            }
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
            if (state.gameState.config.turnTimerEnabled) {
                state.gameState.turnExpiresAt = Date.now() + (state.gameState.config.turnTimerSeconds * 1000);
            }
            state.gameState.lastEvent = { id: uuidv4(), type: 'TURN_CHANGE', playerId: state.gameState.currentPlayerId };
        }

        if (state.networkState.isMultiplayer && state.networkState.isHost) {
            broadcastSanitizedState(state);
        }
      }),

      resetGame: () =>
        set((state) => {
          state.gameState = INITIAL_GAME_STATE;
          deckInstance.reset();
          state.currentView = 'MENU';
          NetworkManager.getInstance().reset();
          state.networkState = INITIAL_NET_STATE;
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

function broadcastSanitizedState(state: State) {
    const net = NetworkManager.getInstance();
    const fullState = state.gameState;

    state.networkState.connectedPeers.forEach(peer => {
        if (peer.id === state.networkState.myPeerId) return;

        const cleanState = JSON.parse(JSON.stringify(fullState));
        const config = fullState.config;

        cleanState.players.forEach((p: Player) => {
             const isMe = p.id === peer.id;
             const isShowdown = state.gameState.phase === GamePhase.SHOWDOWN;
             
             const shouldHideCards = !isMe && !isShowdown && !state.userSettings.gameplay.allowCheats;
             if (shouldHideCards) {
                 p.holeCards = []; 
             }

             let showOdds = false;
             if (config.allowAllCalculator) showOdds = true;
             else if (config.allowCalculator && isMe) showOdds = true;
             
             if (!showOdds) {
                 delete p.winOdds; 
             }
        });
        
        cleanState.deck = []; 
        net.send(peer.id, { type: 'STATE_UPDATE', payload: cleanState });
    });
}

function distributePotAndSync(state: State) {
    const { players, winners, pot } = state.gameState;
    if (winners.length > 0) {
        const splitAmount = Math.floor(pot / winners.length);
        winners.forEach(wid => {
            const winner = players.find(p => p.id === wid);
            if (winner) winner.chips += splitAmount;
        });
    }
    const user = players.find(p => p.id === 'user' || (state.networkState.isMultiplayer && p.id === state.networkState.myPeerId));
    const profile = state.userSettings.profiles.find(p => p.id === state.userSettings.activeProfileId);
    if (user && profile && !user.isBot) {
        profile.bankroll += user.chips;
        profile.handsPlayed++;
        if (winners.includes(user.id)) profile.handsWon++;
    }
}

function nextPhase(state: State) {
    const { phase, players } = state.gameState;
    
    players.forEach(p => { p.currentBet = 0; p.hasActed = false; });
    state.gameState.minBet = 0;
    let eventType: 'FLOP' | 'TURN_RIVER' = 'TURN_RIVER';

    switch (phase) {
        case GamePhase.PRE_FLOP:
            state.gameState.phase = GamePhase.FLOP;
            state.gameState.communityCards = deckInstance.deal(3);
            eventType = 'FLOP';
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
            const winnerIds = HandEvaluator.getWinners(activePlayers, state.gameState.communityCards);
            state.gameState.winners = winnerIds;
            activePlayers.forEach(p => {
                p.handResult = HandEvaluator.evaluate(p.holeCards, state.gameState.communityCards);
            });
            state.gameState.lastEvent = { id: uuidv4(), type: 'WIN', playerId: winnerIds[0] };
            distributePotAndSync(state);
            state.gameState.currentPlayerId = null; 
            state.gameState.turnExpiresAt = null;
            return; 
    }
    
    // Trigger Card Fan sound for new cards
    state.gameState.lastEvent = { id: uuidv4(), type: eventType };

    if (state.gameState.config.allowCalculator || state.gameState.config.allowAllCalculator) {
        const activePlayers = state.gameState.players.filter(p => p.isActive);
        state.gameState.players.forEach(p => {
             if (p.isActive) {
                  p.winOdds = OddsCalculator.calculate(p.holeCards, state.gameState.communityCards, activePlayers.length, 500);
             }
        });
    }

    let startIdx = (state.gameState.dealerIndex + 1) % players.length;
    let loopCount = 0;
    while ((!players[startIdx].isActive || players[startIdx].isAllIn) && loopCount < players.length) {
        startIdx = (startIdx + 1) % players.length;
        loopCount++;
    }
    state.gameState.currentPlayerId = players[startIdx].id;
    
    if (state.gameState.config.turnTimerEnabled) {
        state.gameState.turnExpiresAt = Date.now() + (state.gameState.config.turnTimerSeconds * 1000);
    }
}