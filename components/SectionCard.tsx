import React from 'react';

interface SectionCardProps {
  title: string;
  items: string[];
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, items, icon, variant = 'default' }) => {
  const getGlassStyles = () => {
    switch (variant) {
      case 'danger': 
        return 'glass-panel border-red-500/20 dark:border-red-500/30 bg-red-50/40 dark:bg-red-900/10 shadow-lg shadow-red-500/5';
      case 'success': 
        return 'glass-panel border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-900/10 shadow-lg shadow-emerald-500/5';
      default: 
        return 'glass-panel';
    }
  };

  const getTitleColor = () => {
    switch (variant) {
      case 'danger': return 'text-red-700 dark:text-red-400';
      case 'success': return 'text-emerald-700 dark:text-emerald-400';
      default: return 'text-slate-800 dark:text-slate-200';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'danger': return 'text-red-500';
      case 'success': return 'text-emerald-500';
      default: return 'text-indigo-500 dark:text-blue-400';
    }
  };

  return (
    <div className={`p-6 rounded-xl ${getGlassStyles()} transition-all hover:scale-[1.01] duration-300`}>
      <div className="flex items-center gap-3 mb-4">
        {icon && <div className={`${getIconColor()}`}>{icon}</div>}
        <h3 className={`text-sm font-bold tracking-wider uppercase font-mono ${getTitleColor()}`}>{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="leading-relaxed text-sm border-l-2 border-slate-300/50 dark:border-slate-600/50 pl-4 py-1 text-slate-700 dark:text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};