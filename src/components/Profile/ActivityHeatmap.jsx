import React from 'react';

export function ActivityHeatmap({ activity = {} }) {
  const days = [];
  const today = new Date();
  
  // Generate last 365 days
  for (let i = 364; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const hours = activity[dateStr] || 0;
    days.push({ date: dateStr, hours });
  }

  const getColor = (hours) => {
    if (hours === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (hours < 1) return 'bg-blue-200 dark:bg-blue-900';
    if (hours < 2) return 'bg-blue-400 dark:bg-blue-700';
    if (hours < 5) return 'bg-indigo-600 dark:bg-indigo-500';
    return 'bg-blue-800 dark:bg-blue-300';
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <h3 className="text-lg font-black mb-4">Study Activity</h3>
      <div className="flex flex-wrap gap-1 justify-center">
        {days.map((day, i) => (
          <div
            key={i}
            title={`${day.date}: ${day.hours.toFixed(2)} hours`}
            className={`w-3 h-3 rounded-sm transition-colors ${getColor(day.hours)}`}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-xs font-bold text-slate-500">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
        <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900" />
        <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-700" />
        <div className="w-3 h-3 rounded-sm bg-indigo-600 dark:bg-indigo-500" />
        <div className="w-3 h-3 rounded-sm bg-blue-800 dark:bg-blue-300" />
        <span>More</span>
      </div>
    </div>
  );
}
