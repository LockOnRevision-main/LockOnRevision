import React from 'react';

export function StatsCard({ label, value, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-primary/10 text-primary border-primary/20",
    green: "bg-success/10 text-success border-success/20",
    purple: "bg-secondary/10 text-secondary border-secondary/20",
     orange: "bg-warning/10 text-warning border-warning/20",

    red: "bg-error/10 text-error border-error/20",
    slate: "bg-surface/50 text-text-secondary border-border",
  };

  return (
    <div className={`min-w-0 rounded-2xl border p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
      colorClasses[color] || colorClasses.blue
    }`}>
      <div className="mb-2 flex items-center gap-3">
        {Icon && <Icon size={20} className="shrink-0" />}
        <span className="min-w-0 text-xs font-bold uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <div className="break-words text-3xl font-black tabular-nums tracking-tighter text-text-primary">{value}</div>
    </div>
  );
}
