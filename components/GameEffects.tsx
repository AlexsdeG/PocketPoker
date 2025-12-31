import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GamePhase } from '../types';

export const GameEffects: React.FC = () => {
  const { gameState, userSettings, networkState, currentView } = useGameStore();
  const { lastEvent, turnExpiresAt, winners } = gameState;
  const { audio, gameplay } = userSettings;
  
  const lastEventIdRef = useRef<string | null>(null);
  const lastTickTime = useRef(0);
  const timerIntervalRef = useRef<any>(null);

  // CRITICAL: Stop all effects if we are not in the Game View
  const isGameActive = currentView === 'GAME';

  // Robust Sound Player with Fallback (mp3 -> wav -> ogg)
  const playSound = (baseFilename: string) => {
    if (!audio.sfxEnabled || !isGameActive) return;
    
    const formats = ['mp3', 'wav', 'ogg'];
    const nameWithoutExt = baseFilename.replace(/\.(mp3|wav|ogg)$/, '');
    
    const tryPlay = (index: number) => {
        if (index >= formats.length) return;
        
        const ext = formats[index];
        const src = `/sounds/${nameWithoutExt}.${ext}`;
        const sound = new Audio(src);
        sound.volume = audio.masterVolume;
        
        sound.onerror = () => {
             tryPlay(index + 1);
        };

        sound.play().catch(() => {
             // Autoplay block or error
        });
    };

    tryPlay(0);
  };

  const triggerHaptic = (pattern: number | number[]) => {
    if (!gameplay.hapticsEnabled || !navigator.vibrate || !isGameActive) return;
    navigator.vibrate(pattern);
  };

  // 1. React to Game Events (Single Trigger)
  useEffect(() => {
      if (!isGameActive || !lastEvent || lastEvent.id === lastEventIdRef.current) return;
      lastEventIdRef.current = lastEvent.id;

      switch(lastEvent.type) {
          case 'DEAL':
              playSound('card_deal.mp3');
              break;
          case 'FLOP':
          case 'TURN_RIVER':
              playSound('card_fan.mp3');
              break;
          case 'CHECK':
          case 'CALL':
          case 'RAISE':
              playSound('bet_clink.mp3');
              break;
          case 'ALL_IN':
              playSound('all_in_push.mp3');
              break;
          case 'FOLD':
              playSound('card_fold.mp3');
              break;
          case 'TURN_CHANGE':
              // Handled by currentPlayer logic if needed, or specific alarm
              if (lastEvent.playerId && lastEvent.playerId === (networkState.myPeerId || 'user')) {
                  playSound('turn_alarm.mp3');
                  triggerHaptic(50);
              }
              break;
          case 'WIN':
              const myId = networkState.myPeerId || 'user';
              if (winners.includes(myId)) {
                  playSound('win_stinger.mp3');
                  triggerHaptic([100, 50, 100, 50, 200]);
              } else {
                  playSound('pot_collect.mp3');
              }
              break;
      }
  }, [lastEvent, winners, networkState.myPeerId, gameplay.hapticsEnabled, isGameActive]);

  // 2. Timer Logic (Ticking)
  useEffect(() => {
      // Clear previous interval immediately
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      if (!isGameActive || !turnExpiresAt || !gameState.currentPlayerId) return;

      timerIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const timeLeft = Math.ceil((turnExpiresAt - now) / 1000);
          
          if (timeLeft <= 10 && timeLeft > 0) {
              if (now - lastTickTime.current > 900) {
                  if (timeLeft <= 3) {
                       playSound('timer_urgent.mp3');
                  } else {
                       playSound('timer_tick.mp3');
                  }
                  lastTickTime.current = now;
              }
          }
      }, 200);

      return () => {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
  }, [turnExpiresAt, gameState.currentPlayerId, isGameActive]);

  return null;
};