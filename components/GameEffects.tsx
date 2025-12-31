import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GamePhase, PlayerActionType } from '../types';

export const GameEffects: React.FC = () => {
  const { gameState, userSettings } = useGameStore();
  const { phase, currentPlayerId, winners, lastAggressorId } = gameState;
  const { audio, gameplay } = userSettings;

  // Refs to track previous state for diffing
  const prevPhase = useRef(phase);
  const prevPlayerId = useRef(currentPlayerId);
  const prevWinnersLen = useRef(winners.length);

  // Sound Player Helper
  const playSound = (filename: string) => {
    if (!audio.sfxEnabled) return;
    
    // Silent fail architecture: Create audio, try play, catch error (404/Not Allowed)
    const sound = new Audio(`/sounds/${filename}`);
    sound.volume = audio.masterVolume;
    
    sound.play().catch((e) => {
        // Expected error if file missing or auto-play blocked. 
        // We silent fail as per requirements.
    });
  };

  // Haptics Helper
  const triggerHaptic = (pattern: number | number[]) => {
    if (!gameplay.hapticsEnabled || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  };

  // 1. Phase Change Effects (Dealing Cards)
  useEffect(() => {
    if (prevPhase.current !== phase) {
        if (phase === GamePhase.PRE_FLOP) {
            playSound('card_deal.mp3');
        } else if ([GamePhase.FLOP, GamePhase.TURN, GamePhase.RIVER].includes(phase)) {
            playSound('card_fan.mp3');
        } else if (phase === GamePhase.SHOWDOWN) {
            // No specific sound, maybe generic reveal?
        }
        prevPhase.current = phase;
    }
  }, [phase]);

  // 2. Turn Change Effects (Alarm / Vibration)
  useEffect(() => {
    if (prevPlayerId.current !== currentPlayerId) {
        if (currentPlayerId === 'user') {
            // User's Turn
            playSound('turn_alarm.mp3');
            triggerHaptic(50); // Short tick
        } else if (currentPlayerId) {
            // Bot Turn - maybe subtle click?
            // playSound('soft_click.mp3'); 
        }
        prevPlayerId.current = currentPlayerId;
    }
  }, [currentPlayerId]);

  // 3. Win Effects
  useEffect(() => {
      if (winners.length > 0 && winners.length !== prevWinnersLen.current) {
          playSound('pot_collect.mp3');
          
          if (winners.includes('user')) {
              playSound('win_stinger.mp3');
              triggerHaptic([100, 50, 100, 50, 200]); // Victory vibration
          }
      }
      prevWinnersLen.current = winners.length;
  }, [winners]);

  // 4. Action Effects (Betting/Folding)
  // Since we don't have a strict "Last Action" timestamp in state to diff,
  // we can infer some actions or add a listener. 
  // For simplicity in this architecture, we might miss the exact moment of a "Check" vs "Call" 
  // without a dedicated event bus, but we can hook into pot changes or lastAggressor.
  // Ideally, `useGameStore` would expose a transient event, but we'll approximate:
  
  // NOTE: In a real production app, I'd add an `eventQueue` to the store.
  // For now, we rely on phase/turn changes covering most "Juice".

  return null; // Headless component
};