import React from 'react';

interface SectionCardProps {
  title: string;
  items: string[];
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, items, icon, variant = 'default' }) => {
  const getBorderColor = () => {
    switch (variant) {
      case 'danger': 
        return 'border-red-500/30 bg-red-50/50 dark:bg-red-900/10 text-red-900 dark:text-red-100';
      case 'success': 
        return 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-900 dark:text-emerald-100';
      default: 
        return 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300';
    }
  };

  const getTitleColor = () => {
    switch (variant) {
      case 'danger': return 'text-red-600 dark:text-red-400';
      case 'success': return 'text-emerald-600 dark:text-emerald-400';
      default: return 'text-slate-900 dark:text-slate-100';
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
    <div className={`p-6 rounded-xl border ${getBorderColor()} backdrop-blur-sm transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600`}>
      <div className="flex items-center gap-3 mb-4">
        {icon && <div className={`${getIconColor()}`}>{icon}</div>}
        <h3 className={`text-sm font-bold tracking-wider uppercase font-mono ${getTitleColor()}`}>{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="leading-relaxed text-sm border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};