import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Settings, Play, GraduationCap, ShieldCheck, UserPlus, Github } from 'lucide-react';
import { PokerTable } from './components/game/PokerTable';
import { GameSetup } from './components/menu/GameSetup';
import { ProfileManager } from './components/menu/ProfileManager';
import { AcademyModal } from './components/overlays/AcademyModal';
import { GameEffects } from './components/GameEffects';
import { NetworkManager } from './logic/NetworkManager';

const App: React.FC = () => {
    const { userSettings, currentView, setView, initMultiplayer, leaveGame } = useGameStore();

    const activeProfile = userSettings.profiles.find(p => p.id === userSettings.activeProfileId) || userSettings.profiles[0];

    // Global cleanup on mount to ensure no stale peers
    useEffect(() => {
        // Force cleanup of any lingering connections from previous reloads/sessions
        NetworkManager.getInstance().reset();
    }, []);

    // Check for Room ID in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('room');
        if (roomId) {
            initMultiplayer('CLIENT', roomId);
            setView('LOBBY'); // This will direct to GameSetup in read-only/lobby mode
        }
    }, [initMultiplayer, setView]);

    const handleStartHost = () => {
        initMultiplayer('HOST');
        setView('SETUP');
    };

    return (
        <div className="h-[100dvh] w-full bg-felt-dark flex flex-col items-center justify-center p-0 font-sans text-white overflow-hidden relative">
            {/* Background Texture Overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {/* Global Game Effects (Audio/Haptics) */}
            <GameEffects />

            {currentView === 'GAME' && <PokerTable />}

            {/* Setup handles both Solo and Multiplayer Host/Client Lobby */}
            {(currentView === 'SETUP' || currentView === 'LOBBY') && <GameSetup />}

            {currentView === 'PROFILES' && <ProfileManager />}

            {currentView === 'ACADEMY' && <AcademyModal onClose={() => setView('MENU')} isOverlay={false} />}

            {currentView === 'MENU' && (
                <div className="max-w-md w-full z-10 space-y-8 px-4">
                    {/* Header / Branding */}
                    <div className="absolute top-4 right-4 flex items-center gap-4">
                        <a
                            href="https://github.com/AlexsdeG/PocketPoker"
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:bg-white/10"
                        >
                            <Github size={20} />
                        </a>
                    </div>
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

                        <Button variant="secondary" className="w-full h-14 text-lg" onClick={handleStartHost}>
                            <UserPlus className="w-5 h-5 mr-2" />
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
                            v0.4.0 (Playstyle)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;