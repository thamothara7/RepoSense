import React from 'react';

export const ArchitectureView: React.FC<{ diagram: string }> = ({ diagram }) => {
  return (
    <div className="mt-8 p-6 rounded-xl glass border border-indigo-500/20 dark:border-blue-500/30 bg-slate-900/90 dark:bg-black/40 shadow-2xl relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-50 text-xs font-mono text-slate-400 dark:text-blue-400">Architecture.txt</div>
      <h3 className="text-xl font-bold text-slate-200 dark:text-blue-400 mb-4 font-mono relative z-10">SYSTEM ARCHITECTURE</h3>
      
      {/* Scrollable Container with Custom Scrollbar */}
      <div className="overflow-x-auto custom-scrollbar relative z-10">
        <pre className="font-mono text-xs sm:text-sm text-indigo-100 dark:text-blue-200 leading-normal whitespace-pre select-all p-2">
          {diagram}
        </pre>
      </div>
      
      {/* Decoration */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
    </div>
  );
};