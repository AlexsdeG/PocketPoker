import React, { useState, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../Button';
import { Card } from '../Card';
import { ArrowLeft, Plus, Check, Upload, Trash, RotateCcw } from 'lucide-react';

export const ProfileManager: React.FC = () => {
  const { userSettings, setView, addProfile, setActiveProfile, updateActiveProfile, deleteProfile } = useGameStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProfile = userSettings.profiles.find(p => p.id === userSettings.activeProfileId);

  const handleAdd = () => {
    if (newName.trim()) {
        addProfile(newName, 'default');
        setNewName('');
        setIsAdding(false);
    }
  };

  const handleUpdateName = (val: string) => {
      updateActiveProfile({ username: val });
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2000000) { // 2MB Limit
              alert("Image too large. Max 2MB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              updateActiveProfile({ avatarUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  }

  const handleResetBankroll = () => {
      if (window.confirm("Are you sure? This will reset your bankroll and ALL career statistics to zero. This cannot be undone.")) {
          updateActiveProfile({ 
              bankroll: 10000,
              bestSessionWin: 0,
              worstSessionLoss: 0,
              biggestPotWon: 0,
              handsPlayed: 0,
              handsWon: 0
          });
      }
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent selecting the profile while deleting
      if (userSettings.profiles.length <= 1) {
          alert("You cannot delete the only profile.");
          return;
      }
      if (window.confirm("Are you sure you want to delete this profile? This cannot be undone.")) {
          deleteProfile(id);
      }
  };

  const calculateWinRate = () => {
      if (!activeProfile || !activeProfile.handsPlayed) return "0%";
      return `${Math.round((activeProfile.handsWon / activeProfile.handsPlayed) * 100)}%`;
  };

  return (
    <div className="min-h-screen w-full bg-felt-dark flex flex-col p-4 text-white relative">
      {/* Background Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      <div className="max-w-md w-full mx-auto space-y-6 backdrop-blur-sm z-10">
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setView('MENU')}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold">Profiles</h1>
        </div>

        {/* Active Profile Editor */}
        {activeProfile && (
            <Card title="Current Profile">
                <div className="space-y-6">
                    <div className="flex items-center space-x-6">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-20 w-20 rounded-full bg-brand-blue flex items-center justify-center text-3xl font-bold overflow-hidden border-2 border-white/20">
                                 {activeProfile.avatarUrl ? (
                                     <img src={activeProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                 ) : (
                                     activeProfile.username.charAt(0).toUpperCase()
                                 )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload size={20} />
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>

                        <div className="flex-1 space-y-2">
                            <label className="text-xs text-white/50 uppercase block">Display Name</label>
                            <input 
                                value={activeProfile.username}
                                onChange={(e) => handleUpdateName(e.target.value)}
                                className="w-full bg-transparent border-b border-white/20 py-1 text-lg focus:outline-none focus:border-brand-blue"
                            />
                            {activeProfile.avatarUrl && (
                                <button onClick={() => updateActiveProfile({ avatarUrl: undefined })} className="text-xs text-red-400 hover:text-red-300 flex items-center mt-1">
                                    <Trash size={10} className="mr-1" /> Remove Photo
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center space-x-2">
                            <span className="text-white/70">Total Bankroll</span>
                            <Button 
                                variant="ghost"
                                size="icon"
                                onClick={handleResetBankroll}
                                className="text-white/50 hover:text-white transition-colors h-6 w-6"
                                title="Reset Profile"
                            >
                                <RotateCcw size={14} />
                            </Button>
                        </div>
                        <span className="text-green-400 font-mono text-xl font-bold">${activeProfile.bankroll.toLocaleString()}</span>
                    </div>
                </div>

                {/* Statistics Card */}
                <div className="bg-black/20 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs uppercase text-white/40 font-bold tracking-wider mb-2">Career Statistics</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">Win Rate</span>
                            <span className="text-xl font-mono text-brand-yellow">{calculateWinRate()}</span>
                            <div className="text-[10px] text-white/30 mt-1">
                                {activeProfile.handsWon} Won / {activeProfile.handsPlayed} Played
                            </div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">Biggest Pot</span>
                            <span className="text-xl font-mono text-blue-400">${(activeProfile.biggestPotWon || 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">Best Session</span>
                            <span className="text-xl font-mono text-green-400">+${(activeProfile.bestSessionWin || 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">Worst Session</span>
                            <span className="text-xl font-mono text-red-400">-${(activeProfile.worstSessionLoss || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </Card>
        )}

        {/* Profile Switcher */}
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/50 uppercase px-2">Switch Account</h3>
            {userSettings.profiles.map(p => (
                <div 
                    key={p.id}
                    onClick={() => setActiveProfile(p.id)}
                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                        p.id === userSettings.activeProfileId 
                        ? 'bg-brand-blue/10 border-brand-blue' 
                        : 'bg-surface-dark border-transparent hover:bg-white/5'
                    }`}
                >
                    <div className="flex items-center space-x-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${p.id === userSettings.activeProfileId ? 'bg-brand-blue' : 'bg-white/20'}`}>
                             {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover"/> : p.username.charAt(0)}
                        </div>
                        <span className="font-medium">{p.username}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        {p.id === userSettings.activeProfileId && <Check size={18} className="text-brand-blue" />}
                        {userSettings.profiles.length > 1 && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-white/5"
                                onClick={(e) => handleDeleteProfile(p.id, e)}
                                title="Delete Profile"
                            >
                                <Trash size={14} />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
            
            {!isAdding ? (
                <Button variant="ghost" className="w-full border border-dashed border-white/20 text-white/50" onClick={() => setIsAdding(true)}>
                    <Plus size={16} className="mr-2" /> Add Profile
                </Button>
            ) : (
                <div className="p-4 bg-surface-dark rounded-xl border border-white/10 space-y-3">
                    <input 
                        placeholder="New Profile Name" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                    <div className="flex space-x-2">
                        <Button size="sm" onClick={handleAdd}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};