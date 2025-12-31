import React from 'react';
import { useGameStore } from './store/useGameStore';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Settings, Play, GraduationCap, ShieldCheck } from 'lucide-react';
import { PokerTable } from './components/game/PokerTable';
import { GameSetup } from './components/menu/GameSetup';
import { ProfileManager } from './components/menu/ProfileManager';
import { AcademyModal } from './components/overlays/AcademyModal';
import { GameEffects } from './components/GameEffects';

const App: React.FC = () => {
  const { userSettings, currentView, setView } = useGameStore();

  const activeProfile = userSettings.profiles.find(p => p.id === userSettings.activeProfileId) || userSettings.profiles[0];

  return (
    <div className="h-screen w-full bg-felt-dark flex flex-col items-center justify-center p-0 font-sans text-white overflow-hidden relative">
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      {/* Global Game Effects (Audio/Haptics) */}
      <GameEffects />

      {currentView === 'GAME' && <PokerTable />}
      
      {currentView === 'SETUP' && <GameSetup />}
      
      {currentView === 'PROFILES' && <ProfileManager />}

      {currentView === 'ACADEMY' && <AcademyModal onClose={() => setView('MENU')} isOverlay={false} />}

      {currentView === 'MENU' && (
        <div className="max-w-md w-full z-10 space-y-8">
            {/* Header / Branding */}
            <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-4 bg-surface-dark rounded-2xl shadow-2xl glass-panel mb-4">
                <span className="text-4xl">♠️</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Pocket Poker</h1>
            <p className="text-white/60 text-sm">Design-First PWA Poker Experience</p>
            </div>

            {/* Dashboard / Profile Card */}
            <Card title="Player Profile">
            <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-brand-blue flex items-center justify-center text-xl font-bold overflow-hidden border-2 border-white/20">
                {activeProfile.avatarUrl ? (
                    <img src={activeProfile.avatarUrl} className="w-full h-full object-cover" />
                ) : (
                    activeProfile.username.charAt(0).toUpperCase()
                )}
                </div>
                <div className="flex-1">
                <h3 className="font-semibold text-lg">{activeProfile.username}</h3>
                <p className="text-green-400 font-mono text-sm">${activeProfile.bankroll.toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setView('PROFILES')}>
                <Settings className="w-5 h-5" />
                </Button>
            </div>
            </Card>

            {/* Main Actions */}
            <div className="space-y-3">
            <Button 
                className="w-full h-14 text-lg bg-white text-black hover:bg-gray-100"
                onClick={() => setView('SETUP')}
            >
                <Play className="w-5 h-5 mr-2" fill="currentColor" />
                Solo Match (Bot)
            </Button>
            
            <Button variant="secondary" className="w-full h-14 text-lg">
                <ShieldCheck className="w-5 h-5 mr-2" />
                Multiplayer
            </Button>

            <Button variant="secondary" className="w-full h-14 text-lg" onClick={() => setView('ACADEMY')}>
                <GraduationCap className="w-5 h-5 mr-2" />
                Academy
            </Button>
            </div>

            {/* Status Footer */}
            <div className="text-center">
                <p className="text-xs text-white/30">
                    v0.2.1
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;