import React, { useState, useRef } from 'react';
import { Camera, X, Palette } from 'lucide-react';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../utils/cloudinary';
import { ProfileIconPicker, ProfileIconRenderer } from './ProfileIconPicker';
import { getLeaderAvatar } from '../../utils/avatar';

const GRADE_OPTIONS = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8",
  "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

const CURRICULUM_OPTIONS = [
  "IGCSE", "A-Level", "GCSE", "IB", "AP",
  "Cambridge", "National", "CBSE", "ICSE",
  "South African CAPS",
];

export function EditProfileModal({ profile, onClose, onSave }) {
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    grade: profile?.grade || '',
    curriculum: profile?.curriculum || '',
    goals: profile?.goals || '',
    theme: profile?.theme || 'system',
    favoriteSubjects: profile?.favoriteSubjects || [],
    avatarUrl: profile?.avatarUrl || '',
    avatarIcon: profile?.avatarIcon || '',
    hasCustomAvatar: profile?.hasCustomAvatar || false,
  });
  const [newSubject, setNewSubject] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const addSubject = () => {
    const sub = newSubject.trim();
    if (sub && !formData.favoriteSubjects.includes(sub)) {
      setFormData({ ...formData, favoriteSubjects: [...formData.favoriteSubjects, sub] });
      setNewSubject('');
    }
  };

  const removeSubject = (subject) => {
    setFormData({
      ...formData,
      favoriteSubjects: formData.favoriteSubjects.filter((s) => s !== subject),
    });
  };

  const handleSelectIcon = (iconId) => {
    setFormData({ ...formData, avatarIcon: iconId, avatarUrl: '', hasCustomAvatar: false });
    setShowIconPicker(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('Image must be smaller than 5MB.');
      return;
    }
    setUploadingAvatar(true);
    setSaveError('');
    try {
      if (isCloudinaryConfigured()) {
        const result = await uploadToCloudinary(file, {
          folder: `lockon-revision/${profile.id || 'user'}/avatar`,
        });
        setFormData({ ...formData, avatarUrl: result.url, avatarIcon: '', hasCustomAvatar: true });
      } else {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setFormData({ ...formData, avatarUrl: dataUrl, avatarIcon: '', hasCustomAvatar: true });
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      window.alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!formData.name?.trim()) {
      setSaveError('Display name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setSaveError(error?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface shrink-0">
          <h3 className="text-xl font-black text-text-primary tracking-tight">Edit Profile</h3>
          <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {(() => {
                const previewAvatar = formData.avatarIcon
                  ? { type: "icon", iconId: formData.avatarIcon }
                  : formData.avatarUrl
                  ? { type: "image", src: formData.avatarUrl }
                  : getLeaderAvatar(profile, profile?.id);
                if (previewAvatar.type === "image") {
                  return (
                    <img
                      src={previewAvatar.src}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-2xl border-4 border-border bg-background object-cover"
                    />
                  );
                }
                if (previewAvatar.type === "icon") {
                  return (
                    <div className="w-20 h-20 rounded-2xl border-4 border-border bg-background overflow-hidden p-2">
                      <ProfileIconRenderer iconId={previewAvatar.iconId} className="w-full h-full" />
                    </div>
                  );
                }
                return (
                  <div
                    className="w-20 h-20 rounded-2xl border-4 border-border bg-background overflow-hidden p-2.5"
                    dangerouslySetInnerHTML={{ __html: previewAvatar.svg }}
                  />
                );
              })()}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="font-bold text-text-primary text-sm">Profile Picture</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    formData.avatarIcon
                      ? 'bg-background text-text-muted border border-border opacity-60'
                      : 'bg-primary text-white hover:bg-primary-active shadow-sm active:scale-95'
                  }`}
                >
                  <Camera size={12} />
                  Photo
                </button>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    formData.avatarIcon
                      ? 'bg-primary text-white shadow-sm hover:bg-primary-active active:scale-95'
                      : 'bg-background text-text-secondary border border-border hover:bg-surface hover:border-primary'
                  }`}
                >
                  <Palette size={12} />
                  Icon
                </button>
              </div>
              <p className="text-text-muted text-xs">
                {uploadingAvatar ? 'Uploading...' : formData.avatarIcon ? 'Icon selected' : 'Photo or icon'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

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
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, numbers, underscores, and hyphens only"
            />
          </div>

          {/* Grade */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Grade / Year</label>
            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all appearance-none"
            >
              <option value="">Select your grade...</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Curriculum */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Curriculum</label>
            <select
              value={formData.curriculum}
              onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all appearance-none"
            >
              <option value="">Select your curriculum...</option>
              {CURRICULUM_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Favorite Subjects */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Favorite Subjects</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.favoriteSubjects.map((sub, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() => removeSubject(sub)}
                    className="hover:text-error transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }}
                placeholder="Add a subject..."
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={addSubject}
                className="px-4 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-active transition-all"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted">Learning Goals</label>
            <textarea
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary outline-none focus:border-primary transition-all min-h-[80px] resize-none"
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
          {saveError && (
            <p className="text-sm font-bold text-error bg-error/10 p-3 rounded-xl border border-error/20 text-center">
              {saveError}
            </p>
          )}
           <button
               type="submit"
               disabled={uploadingAvatar || saving}
               className="w-full py-4 rounded-xl bg-primary text-white font-black transition-all hover:bg-primary-active shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
             >
               {uploadingAvatar ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
             </button>

        </form>
        {showIconPicker && (
          <ProfileIconPicker
            currentId={formData.avatarIcon}
            onSelect={handleSelectIcon}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
