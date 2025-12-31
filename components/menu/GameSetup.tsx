import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../Button';
import { Card } from '../Card';
import { BotDifficulty, DeckType, GameSettings, BotConfig } from '../../types';
import { ArrowLeft, Users, Coins, Brain, ArrowUp, ArrowDown, Settings as SettingsIcon, Edit2, Sparkles, Copy, Share2, Wifi, Calculator, Check, Clock } from 'lucide-react';

export const GameSetup: React.FC = () => {
  const { setView, initializeGame, userSettings, toggleSetting, networkState, currentView, updateLobbySettings, leaveGame } = useGameStore();
  const activeProfile = userSettings.profiles.find(p => p.id === userSettings.activeProfileId) || userSettings.profiles[0];
  
  const hasApiKey = !!process.env.API_KEY;
  const isMultiplayer = networkState.isMultiplayer;
  const isHost = networkState.isHost;
  const isClient = isMultiplayer && !isHost;
  
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && /Mobi|Android/i.test(navigator.userAgent);
  const [copied, setCopied] = useState(false);

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

  // Local State for settings, initialized from store's synced settings if available
  const [settings, setSettings] = useState<GameSettings>(
      networkState.lobbySettings || {
        startingChips: 1000,
        blindStructure: 'standard',
        anteEnabled: false,
        anteAmount: 10,
        botCount: isMultiplayer ? 3 : 2,
        botDifficulty: BotDifficulty.MEDIUM,
        deckType: DeckType.STANDARD,
        playerOrder: [],
        botConfigs: {},
        aiCanSeeOdds: false,
        allowCalculator: false,
        allowAllCalculator: false,
        turnTimerEnabled: false,
        turnTimerSeconds: 30
      }
  );
  
  const [editBotId, setEditBotId] = useState<string | null>(null);

  // Sync with Store's Lobby Settings (from Host)
  useEffect(() => {
      if (networkState.lobbySettings && isClient) {
          setSettings(networkState.lobbySettings);
      }
  }, [networkState.lobbySettings, isClient]);

  // Host: Broadcast changes when settings change
  useEffect(() => {
      if (isHost) {
          // Debounce slightly or just broadcast
          updateLobbySettings(settings);
      }
  }, [settings, isHost, updateLobbySettings]);


  // Initialize bot order and default random colors logic
  useEffect(() => {
    // Only Host calculates this logic
    if (isClient) return;

    // Start with Host
    let newOrder = ['user'];
    
    if (isMultiplayer) {
        // connectedPeers does NOT contain Host anymore.
        networkState.connectedPeers.forEach(p => {
             newOrder.push(p.id);
        });
    }

    const newConfigs = { ...settings.botConfigs };
    const randomColors = getUniqueRandomColors(settings.botCount + 5);
    
    // Human Count = Host (1) + Clients
    const humanCount = isMultiplayer ? networkState.connectedPeers.length + 1 : 1;
    // Bots Needed = Total Target - Human Count
    const botsNeeded = isMultiplayer ? Math.max(0, settings.botCount - humanCount) : settings.botCount;

    // Generate Bots
    for(let i=0; i<botsNeeded; i++) {
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
    
    // Determine if update is needed (deep compare arrays)
    const isDifferent = newOrder.length !== settings.playerOrder.length || !newOrder.every((v, i) => v === settings.playerOrder[i]);
    
    if (isDifferent) {
         setSettings(s => ({ ...s, playerOrder: newOrder, botConfigs: newConfigs }));
    }

  }, [settings.botCount, networkState.connectedPeers, isMultiplayer, isClient]); 

  const movePlayer = (index: number, direction: -1 | 1) => {
    if (isClient) return;
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

  const copyLink = () => {
      if (networkState.myPeerId) {
          const url = `${window.location.origin}?room=${networkState.myPeerId}`;
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const shareLink = () => {
      if (networkState.myPeerId && navigator.share) {
          navigator.share({
              title: 'Join my Poker Game',
              text: 'Click to join Pocket Poker Lobby',
              url: `${window.location.origin}?room=${networkState.myPeerId}`
          });
      }
  };

  const handleStart = () => {
    if (isClient) return;
    initializeGame(settings);
  };
  
  const handleLeave = () => {
      leaveGame();
  };

  return (
    <div className="min-h-screen w-full bg-felt-dark flex flex-col p-4 text-white overflow-y-auto relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      <div className="max-w-lg w-full mx-auto space-y-6 px-4 pb-20 z-10 overflow-x-auto">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleLeave}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold">
              {isMultiplayer ? (isHost ? 'Host Game Lobby' : 'Waiting for Host...') : 'New Game Setup'}
          </h1>
        </div>

        {/* Multiplayer Lobby Card */}
        {isMultiplayer && (
            <Card title="Lobby & Invite" className="border-brand-blue/30 shadow-brand-blue/10">
                <div className="space-y-4">
                    <div className="bg-black/40 p-3 rounded-lg flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                             <Wifi className="text-green-400 animate-pulse" size={18} />
                             <span className="text-sm">Room Code: <span className="font-mono font-bold text-white/80">{networkState.myPeerId || 'Generating...'}</span></span>
                         </div>
                    </div>
                    {isHost && (
                        <div className="flex space-x-2">
                            <Button className={`flex-1 text-xs transition-all ${copied ? 'bg-green-600 border-green-500' : ''}`} variant="secondary" onClick={copyLink}>
                                {copied ? <Check size={14} className="mr-2" /> : <Copy size={14} className="mr-2" />} 
                                {copied ? 'Copied' : 'Copy Link'}
                            </Button>
                            {canShare && (
                                <Button className="flex-1 text-xs" variant="secondary" onClick={shareLink}>
                                    <Share2 size={14} className="mr-2" /> Share
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        )}

        <Card title={isMultiplayer ? "Table Seating" : "Opponents"}>
          <div className="space-y-4">
            {!isClient && (
                <div className="flex justify-between items-center">
                    <span className="text-sm text-white/70 flex items-center">
                        <Users size={16} className="mr-2"/> 
                        {isMultiplayer ? "Total Players" : "Opponent Bots"}
                    </span>
                    <div className="flex space-x-2">
                        {(isMultiplayer ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]).map(num => (
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
            )}
            
            <div className="space-y-2">
                {settings.playerOrder.map((id, idx) => {
                    const isUser = id === 'user';
                    
                    let displayName = "Unknown";
                    let displayAvatar = null;
                    let isMe = false;

                    if (id === 'user') {
                        displayName = isHost ? `${activeProfile.username} (You)` : "Host";
                        displayAvatar = isHost ? activeProfile.avatarUrl : null; 
                    } else if (id.startsWith('bot-')) {
                        displayName = settings.botConfigs[id]?.name || "Bot";
                    } else {
                        if (isHost) {
                             const peer = networkState.connectedPeers.find(p => p.id === id);
                             displayName = peer?.name || "Player";
                             displayAvatar = peer?.avatarUrl;
                        } else {
                             if (id === networkState.myPeerId) {
                                 displayName = `${activeProfile.username} (You)`;
                                 isMe = true;
                                 displayAvatar = activeProfile.avatarUrl;
                             } else {
                                 const peer = networkState.connectedPeers.find(p => p.id === id);
                                 displayName = peer?.name || "Player";
                                 displayAvatar = peer?.avatarUrl;
                             }
                        }
                    }

                    const isBot = id.startsWith('bot-');
                    const isEditing = editBotId === id;
                    const botName = settings.botConfigs[id]?.name || displayName;
                    const botColor = settings.botConfigs[id]?.color || '#ffffff';
                    const isAI = settings.botConfigs[id]?.useAI;

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
                                    
                                    {isBot ? (
                                        isEditing && !isClient ? (
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
                                                    className={`group flex items-center ${!isClient ? 'cursor-pointer hover:text-white' : ''} text-white/80 mr-2`}
                                                    onClick={() => !isClient && setEditBotId(id)}
                                                >
                                                    <span 
                                                        className="w-3 h-3 rounded-full mr-2" 
                                                        style={{ backgroundColor: botColor }}
                                                    />
                                                    <span style={{ color: botColor }}>
                                                        {botName}
                                                    </span>
                                                    {!isClient && <Edit2 size={12} className="ml-2 opacity-0 group-hover:opacity-50" />}
                                                </div>
                                                
                                                {!isClient && hasApiKey && (
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
                                    ) : (
                                        <div className="flex items-center">
                                            <div className="w-5 h-5 rounded-full bg-brand-blue mr-2 overflow-hidden">
                                                {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover"/> : null}
                                            </div>
                                            <span className={`font-bold ${isMe || id==='user' ? 'text-brand-blue' : 'text-purple-300'}`}>{displayName}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-1">
                                    {isBot && !isClient && (
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
                                    {!isClient && (
                                        <div className="flex flex-col">
                                            <button onClick={() => movePlayer(idx, -1)} disabled={idx === 0} className="hover:text-white text-white/30 disabled:opacity-0"><ArrowUp size={12}/></button>
                                            <button onClick={() => movePlayer(idx, 1)} disabled={idx === settings.playerOrder.length - 1} className="hover:text-white text-white/30 disabled:opacity-0"><ArrowDown size={12}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

          </div>
        </Card>

        {!isClient && (
            <>
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

                     <div className="flex flex-col space-y-2 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center">
                             <div className="flex items-center">
                                 <input 
                                    type="checkbox" 
                                    checked={settings.turnTimerEnabled} 
                                    onChange={() => setSettings({...settings, turnTimerEnabled: !settings.turnTimerEnabled})} 
                                    className="accent-brand-blue w-4 h-4 mr-2" 
                                 />
                                 <span className={`text-sm flex items-center ${settings.turnTimerEnabled ? 'text-white' : 'text-white/50'}`}>
                                     <Clock size={16} className="mr-2"/> Turn Timer
                                 </span>
                             </div>
                             {settings.turnTimerEnabled && (
                                 <span className="text-brand-yellow font-mono text-sm">{settings.turnTimerSeconds}s</span>
                             )}
                        </div>
                        {settings.turnTimerEnabled && (
                            <input 
                                type="range" 
                                min="10" 
                                max="120" 
                                step="5"
                                value={settings.turnTimerSeconds} 
                                onChange={(e) => setSettings({...settings, turnTimerSeconds: parseInt(e.target.value)})}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-yellow"
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
                         
                         <div className="flex justify-between items-center">
                            <span className="text-sm flex items-center"><Calculator size={14} className="mr-2 text-white/70"/> Show My Win Odds</span>
                            <input type="checkbox" checked={settings.allowCalculator} onChange={() => setSettings({...settings, allowCalculator: !settings.allowCalculator})} className="accent-green-500 w-5 h-5" />
                         </div>

                         <div className="flex justify-between items-center">
                            <span className="text-sm flex items-center"><Brain size={14} className="mr-2 text-white/70"/> Show All Players Odds (Cheat)</span>
                            <input type="checkbox" checked={settings.allowAllCalculator} onChange={() => setSettings({...settings, allowAllCalculator: !settings.allowAllCalculator})} className="accent-red-500 w-5 h-5" />
                         </div>

                         {hasApiKey && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm flex items-center"><Sparkles size={14} className="mr-2 text-purple-400"/> AI Bots see Win Ratio</span>
                                <input type="checkbox" checked={settings.aiCanSeeOdds} onChange={() => setSettings({...settings, aiCanSeeOdds: !settings.aiCanSeeOdds})} className="accent-purple-500 w-5 h-5" />
                            </div>
                         )}

                         <div className="flex justify-between items-center">
                            <span className="text-sm text-red-300">Open Cards (Debug/Cheat)</span>
                            <input type="checkbox" checked={userSettings.gameplay.allowCheats} onChange={() => toggleSetting('gameplay', 'allowCheats')} className="accent-brand-red w-5 h-5" />
                         </div>
                    </div>
                </Card>
            </>
        )}

        {isClient ? (
            <div className="text-center py-4 bg-white/5 rounded-xl animate-pulse">
                <span className="text-lg font-bold text-white/50">Waiting for Host to start...</span>
                <p className="text-xs text-white/30 mt-2">Lobby updates live.</p>
            </div>
        ) : (
            <Button size="lg" className="w-full" onClick={handleStart}>
                Start Match
            </Button>
        )}

      </div>
    </div>
  );
};