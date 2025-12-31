import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../Button';
import { PlayerActionType } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { Edit2 } from 'lucide-react';

export const Controls: React.FC = () => {
  const { gameState, playerAction, networkState } = useGameStore();
  const { currentPlayerId, players, minBet, minRaise, pot } = gameState;
  
  const [showRaiseInput, setShowRaiseInput] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Identify Local User
  const myId = networkState.isMultiplayer && networkState.myPeerId ? networkState.myPeerId : 'user';
  const user = players.find(p => p.id === myId);
  const isUserTurn = currentPlayerId === myId;

  // Update default raise amount when turn starts
  useEffect(() => {
    if (isUserTurn && user) {
        const startRaise = Math.min(minRaise, user.chips);
        setRaiseAmount(Math.max(startRaise, minBet)); 
    }
  }, [isUserTurn, minRaise, minBet, user]);

  // Focus input when editing starts
  useEffect(() => {
      if (isEditingAmount && inputRef.current) {
          inputRef.current.focus();
      }
  }, [isEditingAmount]);

  if (!user || !isUserTurn) return null;

  const currentBet = user.currentBet;
  const callAmount = minBet - currentBet;
  const canCheck = callAmount === 0;
  
  const maxRaise = user.chips;
  const safeMinRaise = minBet; 

  const handleRaiseClick = () => {
      if (!showRaiseInput) {
          setRaiseAmount(Math.min(minBet + minRaise, maxRaise));
          setShowRaiseInput(true);
      } else {
          // Confirm Raise
          playerAction(PlayerActionType.RAISE, raiseAmount);
          setShowRaiseInput(false);
          setIsEditingAmount(false);
      }
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInt(e.target.value) || 0;
      if (val > maxRaise) val = maxRaise;
      setRaiseAmount(val);
  };

  const toggleManualEdit = () => {
      setIsEditingAmount(!isEditingAmount);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/80 to-transparent flex flex-col items-center space-y-4 z-50 pointer-events-auto">
      
      {/* Raise Slider / Input */}
      {showRaiseInput && (
          <div className="bg-surface-dark border border-white/10 p-4 rounded-xl w-full max-w-md animate-in slide-in-from-bottom-5 shadow-2xl">
              <div className="flex justify-between text-sm mb-4 text-white/70 items-center">
                  <span>Min: ${safeMinRaise}</span>
                  
                  {/* Editable Amount Display */}
                  <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-lg border border-white/10">
                      {isEditingAmount ? (
                          <input 
                            ref={inputRef}
                            type="number"
                            value={raiseAmount}
                            onChange={handleManualInput}
                            onBlur={() => setIsEditingAmount(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingAmount(false)}
                            className="w-24 bg-transparent text-brand-yellow font-bold text-lg text-center focus:outline-none"
                          />
                      ) : (
                          <span 
                            className="text-brand-yellow font-bold text-lg cursor-pointer hover:text-white transition-colors"
                            onClick={toggleManualEdit}
                          >
                            ${raiseAmount}
                          </span>
                      )}
                      <button onClick={toggleManualEdit} className="text-white/30 hover:text-white">
                          <Edit2 size={14} />
                      </button>
                  </div>

                  <span>Max: ${maxRaise}</span>
              </div>

              <input 
                  type="range" 
                  min={safeMinRaise} 
                  max={maxRaise} 
                  step={gameState.bigBlind} // Step by BB
                  value={raiseAmount} 
                  onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-blue mb-4"
              />
              
              <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setRaiseAmount(Math.min(Math.floor(pot / 2) + currentBet, maxRaise))} className="text-xs bg-white/5 rounded py-2 hover:bg-white/10 border border-white/5 font-medium">1/2 Pot</button>
                  <button onClick={() => setRaiseAmount(Math.min(pot + currentBet, maxRaise))} className="text-xs bg-white/5 rounded py-2 hover:bg-white/10 border border-white/5 font-medium">Pot</button>
                  <button onClick={() => setRaiseAmount(Math.min((3 * gameState.bigBlind) + currentBet, maxRaise))} className="text-xs bg-white/5 rounded py-2 hover:bg-white/10 border border-white/5 font-medium">3 BB</button>
                  <button onClick={() => setRaiseAmount(maxRaise)} className="text-xs bg-brand-red/10 text-brand-red rounded py-2 hover:bg-brand-red/20 border border-brand-red/20 font-bold">All In</button>
              </div>
          </div>
      )}

      <div className="flex justify-center space-x-3 w-full max-w-lg">
        <Button variant="destructive" size="lg" className="flex-1 shadow-lg shadow-red-900/20" onClick={() => playerAction(PlayerActionType.FOLD)}>
            Fold
        </Button>

        {canCheck ? (
            <Button variant="secondary" size="lg" className="flex-1 shadow-lg" onClick={() => playerAction(PlayerActionType.CHECK)}>
            Check
            </Button>
        ) : (
            <Button variant="secondary" size="lg" className="flex-1 shadow-lg" onClick={() => playerAction(PlayerActionType.CALL)}>
            Call ${callAmount}
            </Button>
        )}

        <Button variant="primary" size="lg" className="flex-1 shadow-lg shadow-white/10" onClick={handleRaiseClick}>
            {showRaiseInput ? 'Confirm' : 'Raise'}
        </Button>
      </div>
      
    </div>
  );
};