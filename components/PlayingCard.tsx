import React from 'react';
import { motion } from 'framer-motion';
import { CardDef, CardSuit } from '../types';

interface PlayingCardProps {
  card?: CardDef; // If undefined, renders card back
  hidden?: boolean;
  className?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({ card, hidden = false, className = '' }) => {
  
  if (hidden || !card) {
    return (
      <div className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-surface-dark border-2 border-white/20 shadow-xl overflow-hidden ${className}`}>
        {/* Card Back Pattern */}
        <div className="absolute inset-1 rounded bg-brand-red opacity-80" 
             style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)' }}>
             <div className="absolute inset-0 flex items-center justify-center text-white/20 font-serif text-2xl">♠</div>
        </div>
      </div>
    );
  }

  const isRed = card.suit === CardSuit.HEARTS || card.suit === CardSuit.DIAMONDS;
  const suitIcon = {
    [CardSuit.HEARTS]: '♥',
    [CardSuit.DIAMONDS]: '♦',
    [CardSuit.CLUBS]: '♣',
    [CardSuit.SPADES]: '♠',
  }[card.suit];

  // Map internal 'T' rank to '10' for display
  const rankDisplay = card.rank === 'T' ? '10' : card.rank;

  return (
    <motion.div 
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-white shadow-xl overflow-hidden select-none ${className}`}
    >
      <div className={`absolute top-1 left-1 flex flex-col items-center leading-none ${isRed ? 'text-brand-red' : 'text-black'}`}>
        <span className="font-bold text-lg sm:text-xl font-sans tracking-tighter">{rankDisplay}</span>
        <span className="text-sm sm:text-base">{suitIcon}</span>
      </div>

      <div className={`absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl ${isRed ? 'text-brand-red' : 'text-black'}`}>
        {suitIcon}
      </div>

      <div className={`absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180 ${isRed ? 'text-brand-red' : 'text-black'}`}>
        <span className="font-bold text-lg sm:text-xl font-sans tracking-tighter">{rankDisplay}</span>
        <span className="text-sm sm:text-base">{suitIcon}</span>
      </div>
    </motion.div>
  );
};