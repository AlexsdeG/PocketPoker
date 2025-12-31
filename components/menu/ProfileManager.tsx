import React, { useState, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../Button';
import { Card } from '../Card';
import { ArrowLeft, Plus, Check, Upload, Trash } from 'lucide-react';

export const ProfileManager: React.FC = () => {
  const { userSettings, setView, addProfile, setActiveProfile, updateActiveProfile } = useGameStore();
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
                        <span className="text-white/70">Total Bankroll</span>
                        <span className="text-green-400 font-mono text-xl font-bold">${activeProfile.bankroll.toLocaleString()}</span>
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
                    {p.id === userSettings.activeProfileId && <Check size={18} className="text-brand-blue" />}
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