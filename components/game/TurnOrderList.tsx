import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { User, Bot } from 'lucide-react';
import { GamePhase } from '../../types';

export const TurnOrderList: React.FC = () => {
  const { gameState } = useGameStore();
  const { players, currentPlayerId, phase } = gameState;

  if (phase === GamePhase.SHOWDOWN || phase === GamePhase.IDLE || !currentPlayerId) return null;

  const currentIndex = players.findIndex(p => p.id === currentPlayerId);
  if (currentIndex === -1) return null;

  const getPlayerAt = (offset: number) => {
      const idx = (currentIndex + offset + players.length) % players.length;
      return players[idx];
  };

  const prevPlayer = getPlayerAt(-1);
  const nextPlayers = [getPlayerAt(1), getPlayerAt(2), getPlayerAt(3)];

  const renderItem = (p: typeof players[0], status: 'prev' | 'current' | 'next') => {
      if (!p.isActive) return null; 

      let opacity = 'opacity-50';
      let scale = 'scale-90';
      let border = 'border-transparent';

      if (status === 'current') {
          opacity = 'opacity-100';
          scale = 'scale-105';
          border = 'border-brand-yellow bg-brand-yellow/10';
      } else if (status === 'next') {
          opacity = 'opacity-70';
          scale = 'scale-95';
      }

      if (!p.isActive) opacity = 'opacity-20';

      return (
          <div key={`${p.id}-${status}`} className={`flex items-center space-x-1.5 md:space-x-2 p-1.5 md:p-2 rounded-lg transition-all ${opacity} ${scale} ${border} border`}>
              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center ${p.isBot ? 'bg-white/10' : 'bg-brand-blue'}`}>
                 {p.avatarUrl ? (
                     <img src={p.avatarUrl} className="w-full h-full rounded-full object-cover"/>
                 ) : (
                     p.isBot ? <Bot size={12} className="md:w-3.5 md:h-3.5" color={p.color || '#fff'} /> : <User size={12} className="md:w-3.5 md:h-3.5" />
                 )}
              </div>
              <span className="text-[10px] md:text-xs font-bold truncate max-w-[60px] md:max-w-[80px]">{p.name}</span>
          </div>
      );
  };

  return (
    <div className="absolute left-0 top-80 md:top-1/2 md:-translate-y-1/2 flex flex-col space-y-1 md:space-y-2 pointer-events-none z-50">
        <div className="bg-black/30 backdrop-blur-md p-1.5 md:p-2 rounded-r-xl border-y border-r border-white/5 shadow-xl pointer-events-auto">
            <div className="text-[10px] md:text-xs text-white/30 font-mono uppercase tracking-widest mb-1 md:mb-2 hidden md:block px-1">Turn Order</div>
            <div className="flex flex-col space-y-1 md:space-y-2">
                {renderItem(prevPlayer, 'prev')}
                {renderItem(players[currentIndex], 'current')}
                {nextPlayers.map((p, i) => renderItem(p, 'next'))}
            </div>
        </div>
    </div>
  );
};