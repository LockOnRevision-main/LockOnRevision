import React, { useState } from 'react';
import { X } from 'lucide-react';

export function EditProfileModal({ profile, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bio: profile?.bio || '',
    username: profile?.username || '',
    goals: profile?.goals || '',
    theme: profile?.theme || 'light',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface">
          <h3 className="text-xl font-black text-text-primary tracking-tight">Edit Profile</h3>
          <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Display Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all min-h-[100px] resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Learning Goals</label>
            <textarea
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all min-h-[100px] resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Theme Preference</label>
            <select
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all appearance-none"
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="system">System Default</option>
            </select>
          </div>
           <button
             type="submit"
             className="w-full py-4 rounded-xl bg-primary text-white font-black transition-all hover:bg-primary-active shadow-lg shadow-primary/20 active:scale-95"
           >
             Save Changes
           </button>

        </form>
      </div>
    </div>
  );
}
