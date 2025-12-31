import React, { useState } from 'react';
import { X, Trophy, AlertCircle, BookOpen, ChevronDown, ChevronUp, Calculator, HelpCircle } from 'lucide-react';
import { Button } from '../Button';
import { PlayingCard } from '../PlayingCard';
import { CardSuit } from '../../types';

interface AcademyModalProps {
  onClose: () => void;
  isOverlay?: boolean; // If true, apply blur instead of texture
}

const AccordionItem: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-white/10 rounded-xl bg-white/5 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
            >
                <div className="font-bold text-sm sm:text-base">{title}</div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && <div className="p-4 pt-0 border-t border-white/5 text-sm text-white/70">{children}</div>}
        </div>
    );
};

// Interactive Demo Hand with Hover Effects
const DemoHand: React.FC<{ cards: Array<{rank: string, suit: CardSuit}> }> = ({ cards }) => {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    return (
        <div className="flex -space-x-4 my-2 scale-75 origin-left h-24 items-end pl-2">
            {cards.map((c, i) => {
                const isHovered = hoveredIdx === i;
                return (
                    <div 
                        key={i} 
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        style={{ zIndex: isHovered ? 50 : i }}
                        className={`transition-all duration-300 ${isHovered ? '-translate-y-4 scale-110' : ''}`}
                    >
                        <PlayingCard card={{...c, value: 0}} className="w-12 h-16 shadow-lg ring-1 ring-black/20" />
                    </div>
                );
            })}
        </div>
    );
};

export const AcademyModal: React.FC<AcademyModalProps> = ({ onClose, isOverlay = false }) => {
  return (
    <div className={`fixed inset-0 h-full z-[100] flex items-center justify-center p-4 text-white ${isOverlay ? 'bg-black/30 backdrop-blur-md' : 'bg-felt-dark'}`}>
      {/* Background Overlay - Only if not in-game overlay */}
      {!isOverlay && (
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      )}

      <div className="bg-surface-dark border border-white/10 w-full max-w-2xl h-full rounded-2xl shadow-2xl flex flex-col z-10 backdrop-blur-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface-dark z-10 flex-shrink-0">
            <h2 className="text-xl font-bold flex items-center text-white">
                <BookOpen className="mr-2 text-brand-yellow" /> Poker Academy
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
                <X />
            </Button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
            
            {/* Hand Rankings Accordion */}
            <h3 className="text-lg font-bold flex items-center mt-2 mb-2">
                 <Trophy className="mr-2 text-brand-blue" size={20} /> Hand Rankings
            </h3>
            
            <AccordionItem title={<span className="text-brand-yellow">Royal Flush</span>}>
                <p className="mb-2">The best possible hand. Ace, King, Queen, Jack, 10, all of the same suit.</p>
                <DemoHand cards={[
                    {rank: 'T', suit: CardSuit.HEARTS}, {rank: 'J', suit: CardSuit.HEARTS}, {rank: 'Q', suit: CardSuit.HEARTS}, {rank: 'K', suit: CardSuit.HEARTS}, {rank: 'A', suit: CardSuit.HEARTS}
                ]} />
            </AccordionItem>

            <AccordionItem title={<span className="text-brand-yellow">Straight Flush</span>}>
                <p className="mb-2">Five cards in a sequence, all in the same suit.</p>
                 <DemoHand cards={[
                    {rank: '5', suit: CardSuit.SPADES}, {rank: '6', suit: CardSuit.SPADES}, {rank: '7', suit: CardSuit.SPADES}, {rank: '8', suit: CardSuit.SPADES}, {rank: '9', suit: CardSuit.SPADES}
                ]} />
            </AccordionItem>

            <AccordionItem title={<span className="text-green-400">Four of a Kind</span>}>
                <p className="mb-2">All four cards of the same rank.</p>
                 <DemoHand cards={[
                    {rank: 'J', suit: CardSuit.SPADES}, {rank: 'J', suit: CardSuit.HEARTS}, {rank: 'J', suit: CardSuit.DIAMONDS}, {rank: 'J', suit: CardSuit.CLUBS}
                ]} />
            </AccordionItem>

            <AccordionItem title={<span className="text-green-400">Full House</span>}>
                <p className="mb-2">Three of a kind combined with a pair.</p>
                 <DemoHand cards={[
                    {rank: 'K', suit: CardSuit.SPADES}, {rank: 'K', suit: CardSuit.HEARTS}, {rank: 'K', suit: CardSuit.DIAMONDS}, {rank: '9', suit: CardSuit.CLUBS}, {rank: '9', suit: CardSuit.SPADES}
                ]} />
            </AccordionItem>
             <AccordionItem title={<span className="text-blue-400">Flush</span>}>
                <p className="mb-2">Any five cards of the same suit, but not in a sequence.</p>
                 <DemoHand cards={[
                    {rank: '2', suit: CardSuit.DIAMONDS}, {rank: '5', suit: CardSuit.DIAMONDS}, {rank: '9', suit: CardSuit.DIAMONDS}, {rank: 'J', suit: CardSuit.DIAMONDS}, {rank: 'K', suit: CardSuit.DIAMONDS}
                ]} />
            </AccordionItem>
            <AccordionItem title={<span className="text-white">Straight</span>}>
                <p className="mb-2">Five cards in a sequence, but not of the same suit.</p>
                 <DemoHand cards={[
                    {rank: '5', suit: CardSuit.CLUBS}, {rank: '6', suit: CardSuit.DIAMONDS}, {rank: '7', suit: CardSuit.SPADES}, {rank: '8', suit: CardSuit.HEARTS}, {rank: '9', suit: CardSuit.CLUBS}
                ]} />
            </AccordionItem>
            <AccordionItem title={<span className="text-white">Three of a Kind</span>}>
                <p className="mb-2">Three cards of the same rank.</p>
                 <DemoHand cards={[
                    {rank: 'Q', suit: CardSuit.CLUBS}, {rank: 'Q', suit: CardSuit.DIAMONDS}, {rank: 'Q', suit: CardSuit.SPADES}
                ]} />
            </AccordionItem>
            <AccordionItem title={<span className="text-white">Two Pair</span>}>
                <p className="mb-2">Two different pairs.</p>
                 <DemoHand cards={[
                    {rank: 'J', suit: CardSuit.CLUBS}, {rank: 'J', suit: CardSuit.DIAMONDS}, {rank: '8', suit: CardSuit.SPADES}, {rank: '8', suit: CardSuit.HEARTS}
                ]} />
            </AccordionItem>
             <AccordionItem title={<span className="text-white/70">Pair</span>}>
                <p className="mb-2">Two cards of the same rank.</p>
                 <DemoHand cards={[
                    {rank: 'A', suit: CardSuit.CLUBS}, {rank: 'A', suit: CardSuit.DIAMONDS}
                ]} />
            </AccordionItem>
             <AccordionItem title={<span className="text-white/50">High Card</span>}>
                <p className="mb-2">No other hand made. Highest card wins.</p>
                 <DemoHand cards={[
                    {rank: 'A', suit: CardSuit.CLUBS}
                ]} />
            </AccordionItem>

            {/* Indicators Section */}
            <h3 className="text-lg font-bold flex items-center mt-6 mb-2">
                 <HelpCircle className="mr-2 text-white" size={20} /> Game Indicators
            </h3>
            
            <AccordionItem title="Table Icons (D, SB, BB)">
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs shadow-md">D</div>
                        <div>
                            <strong className="text-white block">Dealer Button</strong>
                            <span>Moves clockwise every hand. Determines betting order. Player left of Dealer starts blinds.</span>
                        </div>
                    </div>
                     <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs shadow-md">SB</div>
                         <div>
                            <strong className="text-white block">Small Blind</strong>
                            <span>Forced bet. Usually half the Big Blind. Posted by player to Dealer's left.</span>
                        </div>
                    </div>
                     <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs shadow-md">BB</div>
                         <div>
                            <strong className="text-white block">Big Blind</strong>
                            <span>Forced bet. Posted by player to Small Blind's left. The betting round starts after this player.</span>
                        </div>
                    </div>
                </div>
            </AccordionItem>

             {/* Math Section */}
            <h3 className="text-lg font-bold flex items-center mt-6 mb-2">
                 <Calculator className="mr-2 text-brand-red" size={20} /> Math & Odds
            </h3>
            <AccordionItem title="How to Calculate Win Odds?">
                <div className="space-y-4">
                    <p>While the game uses a Monte Carlo simulation for exact numbers, you can use the <strong>"Rule of 4 and 2"</strong> for a quick mental estimate:</p>
                    
                    <div className="bg-black/40 p-3 rounded-lg border border-white/10">
                        <h4 className="font-bold text-white mb-1">On the Flop (2 cards to come)</h4>
                        <p className="text-sm">Multiply your "Outs" by <strong>4</strong>.</p>
                        <p className="text-xs text-white/50 mt-1">Example: Flush Draw (9 outs) x 4 = ~36% chance to hit.</p>
                    </div>

                    <div className="bg-black/40 p-3 rounded-lg border border-white/10">
                        <h4 className="font-bold text-white mb-1">On the Turn (1 card to come)</h4>
                        <p className="text-sm">Multiply your "Outs" by <strong>2</strong>.</p>
                         <p className="text-xs text-white/50 mt-1">Example: Flush Draw (9 outs) x 2 = ~18% chance to hit.</p>
                    </div>

                    <div>
                        <strong className="text-white">What is an "Out"?</strong>
                        <p>A card still in the deck that will improve your hand to a likely winner.</p>
                    </div>
                </div>
            </AccordionItem>

        </div>
      </div>
    </div>
  );
};