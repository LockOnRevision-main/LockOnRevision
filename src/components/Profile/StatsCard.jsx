import React from 'react';

export function StatsCard({ label, value, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-primary/10 text-primary border-primary/20",
    green: "bg-status-success/10 text-status-success border-status-success/20",
    purple: "bg-secondary/10 text-secondary border-secondary/20",
     orange: "bg-warning/10 text-warning border-warning/20",

    red: "bg-status-error/10 text-status-error border-status-error/20",
    slate: "bg-surface/50 text-text-secondary border-border",
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
      colorClasses[color] || colorClasses.blue
    }`}>
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon size={20} className="shrink-0" />}
        <span className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <div className="text-3xl font-black text-text-primary tracking-tighter">{value}</div>
    </div>
  );
}
