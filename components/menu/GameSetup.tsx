import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../Button';
import { Card } from '../Card';
import { BotDifficulty, DeckType, GameSettings, BotConfig } from '../../types';
import { ArrowLeft, Users, Coins, Layers, Brain, ArrowUp, ArrowDown, Settings as SettingsIcon, Edit2, Sparkles, Smartphone } from 'lucide-react';

export const GameSetup: React.FC = () => {
  const { setView, initializeGame, userSettings, toggleSetting } = useGameStore();
  const activeProfile = userSettings.profiles.find(p => p.id === userSettings.activeProfileId) || userSettings.profiles[0];
  
  // Check for API Key presence to enable AI features
  const hasApiKey = !!process.env.API_KEY;
  const canVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate;

  const getUniqueRandomColors = (count: number) => {
    const palette = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
    const result = [];
    const pool = [...palette];
    
    for (let i = 0; i < count; i++) {
        if (pool.length === 0) pool.push(...palette); // Refill if needed
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool.splice(idx, 1)[0]);
    }
    return result;
  };

  const [settings, setSettings] = useState<GameSettings>({
    startingChips: 1000,
    blindStructure: 'standard',
    anteEnabled: false,
    anteAmount: 10,
    botCount: 3,
    botDifficulty: BotDifficulty.MEDIUM,
    deckType: DeckType.STANDARD,
    playerOrder: [],
    botConfigs: {},
    aiCanSeeOdds: false,
  });

  const [editBotId, setEditBotId] = useState<string | null>(null);

  // Initialize bot order and default random colors
  useEffect(() => {
    const newOrder = ['user'];
    const newConfigs = { ...settings.botConfigs };
    const randomColors = getUniqueRandomColors(settings.botCount);
    
    for(let i=0; i<settings.botCount; i++) {
        const botId = `bot-${i}`;
        newOrder.push(botId);
        if (!newConfigs[botId]) {
            newConfigs[botId] = {
                id: botId,
                name: `Bot ${i + 1}`,
                color: randomColors[i],
                useAI: false
            };
        }
    }
    setSettings(s => ({ ...s, playerOrder: newOrder, botConfigs: newConfigs }));
  }, [settings.botCount]);

  const movePlayer = (index: number, direction: -1 | 1) => {
    const newOrder = [...settings.playerOrder];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newOrder.length) {
        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
        setSettings({ ...settings, playerOrder: newOrder });
    }
  };

  const updateBotConfig = (id: string, key: keyof BotConfig, value: any) => {
      setSettings(s => ({
          ...s,
          botConfigs: {
              ...s.botConfigs,
              [id]: { 
                  id, 
                  name: s.botConfigs[id]?.name || `Bot ${id.split('-')[1]}`, 
                  color: s.botConfigs[id]?.color || '#ffffff',
                  useAI: s.botConfigs[id]?.useAI || false,
                  ...s.botConfigs[id],
                  [key]: value 
              }
          }
      }));
  };

  const handleStart = () => {
    initializeGame(settings);
  };

  return (
    <div className="min-h-screen w-full bg-felt-dark flex flex-col p-4 text-white overflow-y-auto relative">
      {/* Background Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      <div className="max-w-lg w-full mx-auto space-y-6 px-8 z-10 overflow-x-auto">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setView('MENU')}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold">New Game Setup</h1>
        </div>

        <Card title="Opponents">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <span className="text-sm text-white/70 flex items-center"><Users size={16} className="mr-2"/> Bot Count</span>
               <div className="flex space-x-2">
                 {[1, 2, 3, 4, 5].map(num => (
                    <button 
                        key={num}
                        onClick={() => setSettings({...settings, botCount: num})}
                        className={`w-8 h-8 rounded-full font-bold text-sm ${settings.botCount === num ? 'bg-brand-blue text-white' : 'bg-white/10 text-white/50'}`}
                    >
                        {num}
                    </button>
                 ))}
               </div>
            </div>
            
            <div className="flex justify-between items-center">
               <span className="text-sm text-white/70 flex items-center"><Brain size={16} className="mr-2"/> Difficulty</span>
               <div className="flex bg-white/10 rounded-lg p-1">
                 {(Object.keys(BotDifficulty) as Array<keyof typeof BotDifficulty>).map(diff => (
                    <button 
                        key={diff}
                        onClick={() => setSettings({...settings, botDifficulty: BotDifficulty[diff]})}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${settings.botDifficulty === BotDifficulty[diff] ? 'bg-white text-black' : 'text-white/50'}`}
                    >
                        {diff}
                    </button>
                 ))}
               </div>
            </div>
          </div>
        </Card>

        <Card title="Seating & Customization">
            <div className="space-y-2">
                {settings.playerOrder.map((id, idx) => {
                    const isUser = id === 'user';
                    const isEditing = editBotId === id;
                    const botName = settings.botConfigs[id]?.name || `Bot ${id.split('-')[1]}`;
                    const botColor = settings.botConfigs[id]?.color || '#ffffff';
                    const isAI = settings.botConfigs[id]?.useAI;

                    // Determine Role based on current index
                    let role = '';
                    if (idx === 0) role = 'D';
                    else if (idx === 1) role = 'SB';
                    else if (idx === 2) role = 'BB';

                    return (
                        <div key={id} className="bg-black/40 p-3 rounded-lg flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="relative w-8 flex justify-center">
                                         <span className="text-white/30 font-mono text-xs">{idx + 1}</span>
                                         {role && (
                                             <span className="absolute -top-5 -left-4 bg-white text-black text-[9px] font-bold px-1 rounded shadow">
                                                 {role}
                                             </span>
                                         )}
                                    </div>
                                    
                                    {isUser ? (
                                        <span className="font-bold text-brand-blue">{activeProfile.username}</span>
                                    ) : (
                                        isEditing ? (
                                            <input 
                                                className="bg-black/50 border border-white/20 rounded px-2 py-0.5 text-sm w-32 focus:outline-none"
                                                value={botName}
                                                onChange={(e) => updateBotConfig(id, 'name', e.target.value)}
                                                onBlur={() => setEditBotId(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditBotId(null)}
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="flex items-center">
                                                <div 
                                                    className="group flex items-center cursor-pointer hover:text-white text-white/80 mr-2"
                                                    onClick={() => setEditBotId(id)}
                                                >
                                                    <span 
                                                        className="w-3 h-3 rounded-full mr-2" 
                                                        style={{ backgroundColor: botColor }}
                                                    />
                                                    <span style={{ color: botColor }}>
                                                        {botName}
                                                    </span>
                                                    <Edit2 size={12} className="ml-2 opacity-0 group-hover:opacity-50" />
                                                </div>
                                                
                                                {/* AI Toggle Button */}
                                                {hasApiKey && (
                                                    <button 
                                                        onClick={() => updateBotConfig(id, 'useAI', !isAI)}
                                                        className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                                                            isAI 
                                                            ? 'bg-purple-600/20 text-purple-400 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' 
                                                            : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <Sparkles size={10} className="mr-1" /> AI
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="flex items-center space-x-1">
                                    {!isUser && (
                                        <>
                                            <input 
                                                type="color" 
                                                value={botColor} 
                                                onChange={(e) => updateBotConfig(id, 'color', e.target.value)}
                                                className="w-6 h-6 rounded overflow-hidden border-0 cursor-pointer"
                                            />
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditBotId(isEditing ? null : id)}>
                                                <SettingsIcon size={12} />
                                            </Button>
                                        </>
                                    )}
                                    <div className="flex flex-col">
                                        <button onClick={() => movePlayer(idx, -1)} disabled={idx === 0} className="hover:text-white text-white/30 disabled:opacity-0"><ArrowUp size={12}/></button>
                                        <button onClick={() => movePlayer(idx, 1)} disabled={idx === settings.playerOrder.length - 1} className="hover:text-white text-white/30 disabled:opacity-0"><ArrowDown size={12}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>

        <Card title="Table Stakes & Rules">
           <div className="space-y-4">
             <div className="flex justify-between items-center">
               <span className="text-sm text-white/70 flex items-center"><Coins size={16} className="mr-2"/> Buy-In</span>
               <input 
                 type="number" 
                 value={settings.startingChips} 
                 onChange={(e) => setSettings({...settings, startingChips: parseInt(e.target.value) || 1000})}
                 className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right w-24 focus:outline-none focus:border-brand-blue"
               />
             </div>
             
             <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <div className="flex items-center">
                     <input 
                        type="checkbox" 
                        checked={settings.anteEnabled} 
                        onChange={() => setSettings({...settings, anteEnabled: !settings.anteEnabled})} 
                        className="accent-brand-blue w-4 h-4 mr-2" 
                     />
                     <span className={`text-sm ${settings.anteEnabled ? 'text-white' : 'text-white/50'}`}>Base Input (Ante)</span>
                </div>
                {settings.anteEnabled && (
                    <input 
                        type="number" 
                        value={settings.anteAmount} 
                        onChange={(e) => setSettings({...settings, anteAmount: parseInt(e.target.value) || 0})}
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right w-24 focus:outline-none"
                    />
                )}
             </div>

           </div>
        </Card>
        
        <Card title="Game Options">
            <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-sm">Rotate Dealer</span>
                    <input type="checkbox" checked={userSettings.gameplay.rotateDealer} onChange={() => toggleSetting('gameplay', 'rotateDealer')} className="accent-brand-blue w-5 h-5" />
                 </div>
                 
                 {hasApiKey && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center"><Sparkles size={14} className="mr-2 text-purple-400"/> AI Bots see Win Ratio</span>
                        <input type="checkbox" checked={settings.aiCanSeeOdds} onChange={() => setSettings({...settings, aiCanSeeOdds: !settings.aiCanSeeOdds})} className="accent-purple-500 w-5 h-5" />
                    </div>
                 )}

                 <div className="flex justify-between items-center">
                    <span className="text-sm">Show My Win Odds</span>
                    <input type="checkbox" checked={userSettings.gameplay.showOdds} onChange={() => toggleSetting('gameplay', 'showOdds')} className="accent-brand-blue w-5 h-5" />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm">Show Opponent Win Odds</span>
                    <input type="checkbox" checked={userSettings.gameplay.showEnemyOdds} onChange={() => toggleSetting('gameplay', 'showEnemyOdds')} className="accent-brand-blue w-5 h-5" />
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-red-300">Open Cards (Cheat)</span>
                    <input type="checkbox" checked={userSettings.gameplay.allowCheats} onChange={() => toggleSetting('gameplay', 'allowCheats')} className="accent-brand-red w-5 h-5" />
                 </div>
                 
                 {/* Haptics Toggle (Conditional) */}
                 {canVibrate && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center"><Smartphone size={14} className="mr-2 text-white/70"/> Haptic Feedback</span>
                        <input type="checkbox" checked={userSettings.gameplay.hapticsEnabled} onChange={() => toggleSetting('gameplay', 'hapticsEnabled')} className="accent-brand-blue w-5 h-5" />
                    </div>
                 )}
            </div>
        </Card>

        <Button size="lg" className="w-full" onClick={handleStart}>
            Start Match
        </Button>

      </div>
    </div>
  );
};