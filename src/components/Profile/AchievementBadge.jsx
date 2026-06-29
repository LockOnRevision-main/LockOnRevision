import React from 'react';

export function AchievementBadge({ badge }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all hover:scale-105">
      <div className="text-4xl mb-2">{badge.icon}</div>
      <span className="text-xs font-black text-center text-slate-800 dark:text-slate-200">
        {badge.label}
      </span>
    </div>
  );
}
