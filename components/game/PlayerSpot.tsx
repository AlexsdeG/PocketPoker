import React, { useState } from 'react';
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
}

export const PlayerSpot: React.FC<PlayerSpotProps> = ({ player, isCurrentUser, isActivePlayer, badge, isDealer, isWinner, showCards }) => {
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);

  // Logic to show cards
  const cardsVisible = isCurrentUser || showCards || (player.holeCards.length > 0 && player.isActive && player.isAllIn && showCards);
  const opacityClass = !player.isActive ? 'opacity-50 grayscale' : 'opacity-100';

  return (
    <div className={`flex flex-col items-center relative group ${opacityClass} transition-all duration-300 pointer-events-auto`}>
      
      {/* Cards Area - Enhanced Hover with Z-Index fix */}
      <div className="flex -space-x-8 sm:-space-x-10 min-h-[96px] sm:min-h-[112px] relative z-10 cursor-default">
        {player.holeCards.map((card, idx) => {
            const cardId = `${card.rank}${card.suit}`;
            const isWinningCard = isWinner && player.handResult?.winningCards?.includes(cardId);
            const isHovered = hoveredCardIdx === idx;
            
            // Highlight Styles
            const borderStyle = isWinningCard 
                ? 'ring-4 ring-brand-yellow shadow-[0_0_20px_rgba(255,204,0,0.8)] z-30' 
                : 'group-hover:ring-2 group-hover:ring-white/20';

            return (
                <div 
                    key={idx} 
                    onMouseEnter={() => setHoveredCardIdx(idx)}
                    onMouseLeave={() => setHoveredCardIdx(null)}
                    className={`
                        relative transition-all duration-300 ease-out origin-bottom
                        ${idx === 1 && !isHovered ? 'transform translate-y-1' : ''} 
                        ${isHovered ? '-translate-y-8 scale-110' : ''}
                        ${isWinningCard ? '-translate-y-4 scale-110' : ''}
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
             <div className="w-16 h-24 border-2 border-white/5 rounded-lg border-dashed flex items-center justify-center text-white/10 bg-white/5">Empty</div>
        )}
      </div>

      {/* Avatar & Info - Info Box */}
      <div className={`relative px-4 py-2 mt-2 rounded-xl backdrop-blur-md border transition-all duration-300 min-w-[120px] text-center z-20
        ${isCurrentUser ? '-mt-2 mb-2' : ''} 
        ${isWinner ? 'bg-brand-yellow text-black border-white shadow-2xl scale-110' : ''}
        ${isActivePlayer && !isWinner ? 'border-brand-yellow shadow-[0_0_15px_rgba(255,204,0,0.3)] bg-surface-dark' : ''}
        ${!isActivePlayer && !isWinner ? 'bg-black/60 border-white/10' : ''}
      `}>
        
        {/* Thinking Spinner (Top Right Corner of Box) */}
        {isActivePlayer && !isWinner && (
            <div className="absolute -top-2 -right-2 bg-brand-yellow text-black rounded-full p-0.5 shadow-lg z-40 animate-in fade-in zoom-in">
                <Loader2 size={12} className="animate-spin" />
            </div>
        )}

        {/* Dealer / SB / BB Badge (Top Left of Info Box) */}
        {(badge || isDealer) && (
            <div className="absolute -top-3 -left-3 flex flex-col space-y-1 items-center z-30">
                {badge && (
                    <div className="bg-white text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-lg border border-black/10">
                        {badge}
                    </div>
                )}
                {isDealer && !badge && (
                     <div className="bg-white text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-lg border border-black/10">
                        D
                    </div>
                )}
            </div>
        )}

        <div className="flex items-center justify-center space-x-2 mb-1">
            {isWinner && <Trophy size={14} className="fill-current" />}
            
            {player.avatarUrl ? (
                <img src={player.avatarUrl} alt="Avatar" className="w-4 h-4 rounded-full object-cover border border-white/30" />
            ) : (
                player.isBot ? 
                    <Bot size={14} style={{ color: player.color || 'white' }} /> : 
                    <User size={14} className="text-brand-blue" />
            )}
            
            <span className="font-bold text-sm truncate max-w-[80px]">{player.name}</span>
        </div>
        
        <div className={`font-mono text-xs ${isWinner ? 'text-black/80 font-bold' : 'text-green-400'}`}>
            ${player.chips.toLocaleString()}
        </div>

        {/* Odds Indicator (Bottom Right of Info Box) */}
        {player.winOdds !== undefined && player.isActive && !isWinner && (
            <div className="absolute -bottom-2 -right-2 bg-black/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20 shadow-md whitespace-nowrap z-30">
                <span className={player.winOdds > 50 ? 'text-green-400' : 'text-white'}>{player.winOdds}%</span>
            </div>
        )}

        {/* Hand Result Text */}
        {isWinner && player.handResult && (
             <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-bold text-brand-yellow bg-black/90 px-3 py-1 rounded-full whitespace-nowrap border border-white/10 shadow-xl z-50">
                {player.handResult.rank}
             </div>
        )}

        {/* Bet Badge (Top Right) */}
        {player.currentBet > 0 && (
             <div className="absolute -right-3 -top-3 bg-brand-blue text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-white/20 z-30">
                ${player.currentBet}
             </div>
        )}
        
        {player.hasActed && player.currentBet === 0 && player.isActive && !isWinner && (
            <div className="absolute -right-2 -top-2 text-white/50">
                <CheckCircle size={16} />
            </div>
        )}
         {player.isAllIn && (
            <div className="absolute -right-4 -top-4 bg-brand-red text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-pulse z-30">
                ALL IN
             </div>
        )}
      </div>

    </div>
  );
};