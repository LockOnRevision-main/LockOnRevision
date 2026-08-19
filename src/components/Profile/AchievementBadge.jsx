import React from 'react';

export function AchievementBadge({ badge }) {
  return (
    <div className="group flex flex-col items-center p-5 rounded-2xl border border-border bg-surface transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/50">
      <div className="text-4xl mb-3 transition-transform group-hover:scale-110 duration-300">
        {badge.icon}
      </div>
      <span className="text-xs font-black text-center text-text-primary tracking-tight">
        {badge.label}
      </span>
    </div>
  );
}
