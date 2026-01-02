import React, { useState, useEffect } from 'react';
import { Player, CardDef } from '../../types';
import { PlayingCard } from '../PlayingCard';
import { User, Bot, CheckCircle, Trophy, Loader2 } from 'lucide-react';

interface PlayerSpotProps {
  player: Player;
  isCurrentUser: boolean;
  isActivePlayer: boolean;
  badge: string | null;
  isDealer: boolean;
  isWinner: boolean;
  showCards: boolean;
  turnExpiresAt?: number | null;
}

export const PlayerSpot: React.FC<PlayerSpotProps> = ({ player, isCurrentUser, isActivePlayer, badge, isDealer, isWinner, showCards, turnExpiresAt }) => {
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Timer Visual Logic
  useEffect(() => {
      if (!isActivePlayer || !turnExpiresAt) {
          setTimeLeft(0);
          return;
      }
      const interval = setInterval(() => {
          const delta = Math.max(0, turnExpiresAt - Date.now());
          setTimeLeft(Math.ceil(delta / 1000));
      }, 100);
      return () => clearInterval(interval);
  }, [isActivePlayer, turnExpiresAt]);

  const cardsVisible = isCurrentUser || showCards || (player.holeCards.length > 0 && player.isActive && player.isAllIn && showCards);
  const opacityClass = !player.isActive ? 'opacity-50 grayscale' : 'opacity-100';

  return (
    <div className={`flex flex-col items-center relative group ${opacityClass} transition-all duration-300 pointer-events-auto`}>
      
      {/* Cards Area */}
      <div className="flex -space-x-5 md:-space-x-10 min-h-[60px] md:min-h-[112px] relative z-10 cursor-default">
        {player.holeCards.map((card, idx) => {
            const cardId = `${card.rank}${card.suit}`;
            const isWinningCard = isWinner && player.handResult?.winningCards?.includes(cardId);
            const isHovered = hoveredCardIdx === idx;
            
            const borderStyle = isWinningCard 
                ? 'ring-2 md:ring-4 ring-brand-yellow shadow-[0_0_20px_rgba(255,204,0,0.8)] z-30' 
                : 'group-hover:ring-2 group-hover:ring-white/20';

            return (
                <div 
                    key={idx} 
                    onMouseEnter={() => setHoveredCardIdx(idx)}
                    onMouseLeave={() => setHoveredCardIdx(null)}
                    className={`
                        relative transition-all duration-300 ease-out origin-bottom
                        ${idx === 1 && !isHovered ? 'transform translate-y-1' : ''} 
                        ${isHovered ? '-translate-y-4 md:-translate-y-8 scale-110' : ''}
                        ${isWinningCard ? '-translate-y-2 md:-translate-y-4 scale-110' : ''}
                    `}
                    style={{ zIndex: isHovered || isWinningCard ? 50 : idx }}
                >
                    <PlayingCard 
                        card={card} 
                        hidden={!cardsVisible} 
                        className={borderStyle} 
                    />
                </div>
            );
        })}
        
        {player.holeCards.length === 0 && player.isActive && (
             <div className="w-10 h-14 md:w-16 md:h-24 border-2 border-white/5 rounded-lg border-dashed flex items-center justify-center text-[10px] md:text-xs text-white/10 bg-white/5">Empty</div>
        )}
      </div>

      {/* Info Box */}
      <div className={`relative px-2 py-1 md:px-4 md:py-2 mt-1 md:mt-2 rounded-lg md:rounded-xl backdrop-blur-md border transition-all duration-300 min-w-[80px] md:min-w-[120px] text-center z-20
        ${isCurrentUser ? '-mt-1 md:-mt-2 mb-1 md:mb-2' : ''} 
        ${isWinner ? 'bg-brand-yellow text-black border-white shadow-2xl scale-110' : ''}
        ${isActivePlayer && !isWinner ? 'border-brand-yellow shadow-[0_0_15px_rgba(255,204,0,0.3)] bg-surface-dark' : ''}
        ${!isActivePlayer && !isWinner ? 'bg-black/60 border-white/10' : ''}
      `}>
        
        {/* Thinking Spinner */}
        {isActivePlayer && !isWinner && !turnExpiresAt && (
            <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-brand-yellow text-black rounded-full p-0.5 shadow-lg z-40 animate-in fade-in zoom-in">
                <Loader2 className="animate-spin w-2 h-2 md:w-3 md:h-3" />
            </div>
        )}

        {/* Countdown Timer Badge */}
        {isActivePlayer && !isWinner && turnExpiresAt && (
             <div className={`absolute -top-2 -right-1 md:-top-3 md:-right-2 text-[8px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded-full shadow-lg z-40 border border-white/20 animate-in fade-in zoom-in ${timeLeft <= 5 ? 'bg-red-500 animate-pulse text-white' : 'bg-brand-yellow text-black'}`}>
                {timeLeft}s
             </div>
        )}

        {/* Dealer / SB / BB Badge */}
        {(badge || isDealer) && (
            <div className="absolute -top-2 -left-2 md:-top-3 md:-left-3 flex flex-col space-y-1 items-center z-30">
                {badge && (
                    <div className="bg-white text-black font-bold rounded-full w-4 h-4 md:w-6 md:h-6 flex items-center justify-center text-[8px] md:text-[10px] shadow-lg border border-black/10">
                        {badge}
                    </div>
                )}
                {isDealer && !badge && (
                     <div className="bg-white text-black font-bold rounded-full w-4 h-4 md:w-6 md:h-6 flex items-center justify-center text-[8px] md:text-[10px] shadow-lg border border-black/10">
                        D
                    </div>
                )}
            </div>
        )}

        <div className="flex items-center justify-center space-x-1 md:space-x-2 mb-0.5 md:mb-1">
            {isWinner && <Trophy className="fill-current w-3 h-3 md:w-3.5 md:h-3.5" />}
            
            {player.avatarUrl ? (
                <img src={player.avatarUrl} alt="Avatar" className="w-3 h-3 md:w-4 md:h-4 rounded-full object-cover border border-white/30" />
            ) : (
                player.isBot ? 
                    <Bot style={{ color: player.color || 'white' }} className="w-3 h-3 md:w-3.5 md:h-3.5" /> : 
                    <User className="text-brand-blue w-3 h-3 md:w-3.5 md:h-3.5" />
            )}
            
            <span className="font-bold text-[10px] md:text-sm truncate max-w-[60px] md:max-w-[80px]">{player.name}</span>
        </div>
        
        <div className={`font-mono text-[10px] md:text-xs ${isWinner ? 'text-black/80 font-bold' : 'text-green-400'}`}>
            ${player.chips.toLocaleString()}
        </div>

        {typeof player.winOdds === 'number' && player.isActive && !isWinner && (
            <div className="absolute -bottom-1.5 -right-1 md:-bottom-2 md:-right-2 bg-black/90 text-white text-[8px] md:text-[9px] font-bold px-1 md:px-1.5 py-0.5 rounded border border-white/20 shadow-md whitespace-nowrap z-30">
                <span className={player.winOdds > 50 ? 'text-green-400' : 'text-white'}>{player.winOdds}%</span>
            </div>
        )}

        {isWinner && player.handResult && (
             <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[8px] md:text-[10px] font-bold text-brand-yellow bg-black/90 px-2 py-0.5 md:px-3 md:py-1 rounded-full whitespace-nowrap border border-white/10 shadow-xl z-50">
                {player.handResult.rank}
             </div>
        )}

        {player.currentBet > 0 && (
             <div className="absolute -right-2 -top-2 md:-right-3 md:-top-3 bg-brand-blue text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-full shadow-lg border border-white/20 z-30">
                ${player.currentBet}
             </div>
        )}
        
        {player.hasActed && player.currentBet === 0 && player.isActive && !isWinner && (
            <div className="absolute -right-1 -top-1 md:-right-2 md:-top-2 text-white/50">
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
            </div>
        )}
         {player.isAllIn && (
            <div className="absolute -right-2 -top-2 md:-right-4 md:-top-4 bg-brand-red text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-full shadow-lg animate-pulse z-30">
                ALL IN
             </div>
        )}
      </div>

    </div>
  );
};