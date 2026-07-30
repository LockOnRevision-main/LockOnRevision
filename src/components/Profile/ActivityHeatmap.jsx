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
    if (hours === 0) return 'bg-border';
    if (hours < 1) return 'bg-primary/20';
    if (hours < 2) return 'bg-primary/40';
    if (hours < 5) return 'bg-primary/70';
    return 'bg-primary';
  };

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm">
      <h3 className="text-xl font-black text-text-primary mb-6 tracking-tight">Study Activity</h3>
      <div className="flex flex-wrap gap-1 justify-center">
        {days.map((day, i) => (
          <div
            key={i}
            title={`${day.date}: ${day.hours.toFixed(2)} hours`}
            className={`w-3 h-3 rounded-[2px] transition-all hover:scale-150 hover:z-10 ${getColor(day.hours)}`}
          />
        ))}
      </div>
      <div className="mt-6 flex items-center justify-end gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
        <span>Less</span>
        <div className="w-3 h-3 rounded-[2px] bg-border" />
        <div className="w-3 h-3 rounded-[2px] bg-primary/20" />
        <div className="w-3 h-3 rounded-[2px] bg-primary/40" />
        <div className="w-3 h-3 rounded-[2px] bg-primary/70" />
        <div className="w-3 h-3 rounded-[2px] bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
