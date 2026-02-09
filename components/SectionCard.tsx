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
      case 'danger': return 'border-red-500/30 bg-red-900/10';
      case 'success': return 'border-emerald-500/30 bg-emerald-900/10';
      default: return 'border-slate-700 bg-slate-800/50';
    }
  };

  return (
    <div className={`p-6 rounded-xl border ${getBorderColor()} backdrop-blur-sm transition-all hover:border-slate-600`}>
      <div className="flex items-center gap-3 mb-4">
        {icon && <div className="text-blue-400">{icon}</div>}
        <h3 className="text-lg font-semibold tracking-wide text-slate-100 uppercase font-mono">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="text-slate-300 leading-relaxed text-sm border-l-2 border-slate-700 pl-4 py-1">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};