import React, { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'bottom' }) => {
  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div className={`absolute ${side === 'bottom' ? 'top-full mt-2' : ''} px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-700/50 z-[60] transform scale-95 group-hover:scale-100 translate-y-[-4px] group-hover:translate-y-0`}>
        {content}
      </div>
    </div>
  );
};