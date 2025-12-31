import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { PlayerSpot } from './PlayerSpot';
import { PlayingCard } from '../PlayingCard';
import { Controls } from './Controls';
import { TurnOrderList } from './TurnOrderList';
import { Button } from '../Button';
import { GamePhase } from '../../types';
import { ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { BotLogic } from '../../logic/BotLogic';
import { GeminiAI } from '../../logic/GeminiAI';
import { AcademyModal } from '../overlays/AcademyModal';

export const PokerTable: React.FC = () => {
  const { gameState, setView, startGame, restartMatch, playerAction, userSettings } = useGameStore();
  const { players, communityCards, pot, currentPlayerId, phase, winners, dealerIndex } = gameState;
  const [showAcademy, setShowAcademy] = useState(false);

  // Bot Turn Effect
  useEffect(() => {
    if (!currentPlayerId || phase === GamePhase.SHOWDOWN || phase === GamePhase.IDLE) return;

    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (currentPlayer && currentPlayer.isBot) {
        
        const makeDecision = async () => {
             if (currentPlayer.useAI) {
                 // Use Gemini AI
                 const decision = await GeminiAI.decide(gameState, currentPlayer);
                 playerAction(decision.action, decision.amount);
             } else {
                 // Use Standard Heuristic Bot
                 const decision = BotLogic.decide(gameState, currentPlayer);
                 playerAction(decision.action, decision.amount);
             }
        };

        // AI Thinking Time (Simulated delay + Async execution)
        const timer = setTimeout(makeDecision, 1500); 

        return () => clearTimeout(timer);
    }
  }, [currentPlayerId, phase, players, gameState, playerAction]);

  const userIndex = players.findIndex(p => p.id === 'user');

  // Helper to calculate radial position
  const getPositionStyle = (index: number, total: number) => {
    const relativeIndex = (index - userIndex + total) % total;
    
    if (index === userIndex) {
        // User always at bottom center
        return { bottom: '4%', left: '50%', transform: 'translate(-50%, 0)' };
    }

    // Spread others from angle 170 (Left) to 370 (Right)
    const angleStep = 160 / (total - 1);
    const angleDeg = 190 + (angleStep * relativeIndex); // Start a bit lower
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Oval Radius - Slightly increased spacing
    const radiusX = 48; // %
    const radiusY = 42; // %

    const left = 50 + radiusX * Math.cos(angleRad);
    const top = 48 + radiusY * Math.sin(angleRad);

    return { 
        left: `${left}%`, 
        top: `${top}%`, 
        transform: 'translate(-50%, -50%)' 
    };
  };

  // Find winning hand result to highlight community cards
  const winnerId = winners[0];
  const winnerPlayer = players.find(p => p.id === winnerId);
  const winningCards = phase === GamePhase.SHOWDOWN ? winnerPlayer?.handResult?.winningCards : [];

  return (
    <div className="relative w-full h-screen bg-felt-dark overflow-hidden flex flex-col">
      
      {showAcademy && <AcademyModal onClose={() => setShowAcademy(false)} isOverlay={true} />}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
        <Button variant="ghost" size="icon" className="pointer-events-auto" onClick={() => setView('MENU')}>
            <ArrowLeft />
        </Button>
        <div className="glass-panel px-4 py-2 rounded-full text-xs font-mono text-white/60">
            Phase: {phase}
        </div>
        <Button variant="ghost" size="icon" className="pointer-events-auto" onClick={restartMatch}>
            <RefreshCw size={18} />
        </Button>
      </div>

      {/* Academy Trigger */}
      <div className="absolute bottom-28 left-4 z-20">
         <Button variant="ghost" size="icon" onClick={() => setShowAcademy(true)}>
             <HelpCircle className="w-6 h-6" />
         </Button>
      </div>

      {/* Turn Order List (Left) - Always Visible */}
      <TurnOrderList />

      {/* Table Surface */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Felt Texture */}
        <div className="absolute inset-4 md:inset-12 bg-felt rounded-[10rem] shadow-[inset_0_0_80px_rgba(0,0,0,0.5)] border-[16px] border-[#1a1a1a] flex flex-col">
            
            {/* Center Area (Community Cards & Pot) */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center space-y-6 w-full z-10">
                
                {/* Pot */}
                <div className="bg-black/40 px-8 py-3 rounded-full text-brand-yellow font-bold text-2xl tracking-wider shadow-xl border border-white/5 backdrop-blur-md">
                    POT: ${pot.toLocaleString()}
                </div>

                {/* Community Cards */}
                <div className="flex space-x-2 sm:space-x-3 h-24 sm:h-32">
                     {communityCards.map((card, idx) => {
                         const cardId = `${card.rank}${card.suit}`;
                         const isWinning = winningCards?.includes(cardId);
                         return (
                            <PlayingCard 
                                key={idx} 
                                card={card} 
                                className={isWinning ? 'ring-4 ring-brand-yellow shadow-[0_0_30px_rgba(255,204,0,0.8)] scale-110 z-20' : ''}
                            />
                         );
                     })}
                </div>
            </div>

             {/* Game Over / Next Hand Messages (High Z-Index) */}
             <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center space-y-4 pointer-events-auto">
                {/* Winner Announcement */}
                {phase === GamePhase.SHOWDOWN && winners.length > 0 && (
                    <div className="bg-brand-yellow text-black font-extrabold px-10 py-4 rounded-full shadow-2xl animate-bounce whitespace-nowrap text-xl border-4 border-white/20">
                        {winners.length === 1 
                            ? `${players.find(p => p.id === winners[0])?.name} Wins!` 
                            : 'Split Pot!'}
                    </div>
                )}

                 {/* Start Button (Idle Phase) */}
                {phase === GamePhase.IDLE && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        {players.filter(p => p.chips > 0).length > 1 ? (
                            <Button size="lg" onClick={startGame} className="animate-pulse shadow-brand-blue/50 shadow-xl scale-125">
                                Deal Hand
                            </Button>
                        ) : (
                            <div className="bg-red-500/20 px-6 py-3 rounded-xl border border-red-500/50 text-center backdrop-blur-md">
                                <p className="text-white font-bold mb-2">Game Over</p>
                                <Button size="sm" onClick={restartMatch}>Restart Match</Button>
                            </div>
                        )}
                    </div>
                )}
                 {/* Next Hand Button (Showdown Phase) */}
                 {phase === GamePhase.SHOWDOWN && (
                    <div className="mt-4">
                        <Button size="lg" onClick={startGame} className="shadow-2xl scale-110 bg-white text-black hover:bg-brand-yellow transition-colors">
                            Next Hand
                        </Button>
                    </div>
                )}
             </div>

            {/* Players (Radial Layout) */}
            {players.map((player, index) => {
                const style = getPositionStyle(index, players.length);
                const sbIndex = (dealerIndex + 1) % players.length;
                const bbIndex = (dealerIndex + 2) % players.length;
                let badge = null;
                
                if (index === sbIndex && phase !== GamePhase.IDLE) badge = 'SB';
                else if (index === bbIndex && phase !== GamePhase.IDLE) badge = 'BB';

                return (
                    <div key={player.id} className="absolute w-max z-20 pointer-events-none" style={style}>
                        <PlayerSpot 
                            player={player} 
                            isCurrentUser={player.id === 'user'} 
                            isActivePlayer={currentPlayerId === player.id}
                            badge={badge}
                            isDealer={index === dealerIndex}
                            isWinner={winners.includes(player.id)}
                            showCards={phase === GamePhase.SHOWDOWN || userSettings.gameplay.allowCheats}
                        />
                    </div>
                );
            })}

        </div>
      </div>

      <Controls />
    </div>
  );
};