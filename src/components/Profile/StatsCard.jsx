import React from 'react';

export function StatsCard({ label, value, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-indigo-50 text-indigo-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  const darkColorClasses = {
    blue: "bg-blue-900/20 text-blue-400 border-blue-800/30",
    green: "bg-green-900/20 text-green-400 border-green-800/30",
    purple: "bg-purple-900/20 text-purple-400 border-purple-800/30",
    orange: "bg-orange-900/20 text-orange-400 border-orange-800/30",
    red: "bg-red-900/20 text-red-400 border-red-800/30",
    slate: "bg-slate-900/20 text-slate-400 border-slate-800/30",
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
      colorClasses[color] || colorClasses.blue
    } dark:${darkColorClasses[color] || darkColorClasses.blue}`}>
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon size={20} />}
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
