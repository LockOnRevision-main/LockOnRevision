import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, 
  Zap, 
  BookOpen, 
  Target, 
  CheckCircle, 
  Award, 
  Share2, 
  Edit3,
  Flame
} from 'lucide-react';
import { 
  updateUserProfile, 
  calculateLevel, 
  getRank, 
  getBadge 
} from '../services/userService';
import { StatsCard } from '../components/Profile/StatsCard';
import { ActivityHeatmap } from '../components/Profile/ActivityHeatmap';
import { AchievementBadge } from '../components/Profile/AchievementBadge';
import { EditProfileModal } from '../components/Profile/EditProfileModal';

export function ProfilePage() {
  const { profile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!profile) return <div className="p-8 text-center font-black">Loading profile...</div>;

  const level = calculateLevel(profile.xp || 0);
  const rank = getRank(level);
  const badges = getBadge(profile.xp || 0, profile.completedUnits?.length || 0, profile.streak || 0);
  
  // Derived statistics
  const totalLessons = profile.completedUnits?.length || 0;
  const totalExercises = profile.completedTests?.length || 0; // Mapping completedTests to exercises for now
  const accuracy = profile.totalScore ? `${((profile.totalScore / (totalExercises * 100 || 1)) * 100).toFixed(1)}%` : '0%';
  const studyHours = (profile.totalStudyHours || 0).toFixed(1);

  const handleSaveProfile = async (updates) => {
    try {
      await updateUserProfile(user.uid, updates);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/profile/${profile.username || user.uid}`;
    navigator.clipboard.writeText(url);
    window.alert("Profile link copied to clipboard!");
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-indigo-600" />
        <div className="px-8 pb-8">
          <div className="relative flex flex-col md:flex-row items-end gap-6 -mt-12">
            <div className="relative">
              <img 
                src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Avatar"
                className="w-32 h-32 rounded-3xl border-4 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 object-cover shadow-xl"
              />
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute bottom-2 right-2 p-2 rounded-full bg-white dark:bg-slate-800 text-indigo-600 shadow-lg hover:scale-110 transition-transform"
              >
                <Edit3 size={16} />
              </button>
            </div>
            <div className="flex-1 mb-2 text-center md:text-left">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                {profile.name || 'LockOn Learner'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                @{profile.username || 'learner'} • Joined {profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'Recently'}
              </p>
            </div>
            <div className="flex gap-3 mb-2">
              <button 
                onClick={shareProfile}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <Share2 size={18} />
                Share
              </button>
            </div>
          </div>
          <div className="mt-6 max-w-2xl">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {profile.bio || "No bio yet. Share something about your learning journey!"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Progress */}
        <div className="lg:col-span-2 space-y-8">
          {/* Top Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard 
              label="Level" 
              value={level} 
              icon={Trophy} 
              color="purple" 
            />
            <StatsCard 
              label="Rank" 
              value={rank} 
              icon={Award} 
              color="orange" 
            />
            <StatsCard 
              label="Streak" 
              value={`${profile.streak || 0} Days`} 
              icon={Flame} 
              color="red" 
            />
            <StatsCard 
              label="Total XP" 
              value={profile.xp || 0} 
              icon={Zap} 
              color="blue" 
            />
          </div>

          {/* Learning Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                Learning Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-500">Lessons Completed</span>
                  <span className="font-black">{totalLessons}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-500">Exercises Solved</span>
                  <span className="font-black">{totalExercises}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-500">Accuracy Rate</span>
                  <span className="font-black text-green-600">{accuracy}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="text-sm font-medium text-slate-500">Study Time</span>
                  <span className="font-black">{studyHours}h</span>
                </div>
              </div>
            </div>
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Target size={20} className="text-indigo-600" />
                Current Goals
              </h3>
              <div className="space-y-3">
                {profile.goals ? (
<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
  &quot;{profile.goals}&quot;
</p>
                ) : (
                  <p className="text-sm text-slate-500 italic">No goals set yet.</p>
                )}
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Edit Goals
                </button>
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <ActivityHeatmap activity={profile.activity} />
        </div>

        {/* Right Column: Badges & Favorites */}
        <div className="space-y-8">
          {/* Achievements */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <Award size={20} className="text-yellow-500" />
              Achievements
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {badges.length > 0 ? (
                badges.map(badge => (
                  <AchievementBadge key={badge.id} badge={badge} />
                ))
              ) : (
                <p className="col-span-3 text-sm text-slate-500 text-center py-4">
                  Earn badges by studying!
                </p>
              )}
            </div>
          </div>

          {/* Favorite Subjects */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Favorite Subjects
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.favoriteSubjects?.length > 0 ? (
                profile.favoriteSubjects.map((sub, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    {sub}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No favorites added.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <EditProfileModal 
          profile={profile} 
          onClose={() => setIsEditing(false)} 
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
