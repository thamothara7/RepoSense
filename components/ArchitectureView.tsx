import React from 'react';

export const ArchitectureView: React.FC<{ diagram: string }> = ({ diagram }) => {
  return (
    <div className="mt-8 p-6 rounded-xl border border-indigo-200 dark:border-blue-500/30 bg-[#1e1e1e] dark:bg-slate-900/80 shadow-2xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-3 opacity-50 text-xs font-mono text-slate-400 dark:text-blue-400">Architecture.txt</div>
      <h3 className="text-xl font-bold text-slate-200 dark:text-blue-400 mb-4 font-mono">SYSTEM ARCHITECTURE</h3>
      <div className="overflow-x-auto custom-scrollbar">
        <pre className="font-mono text-xs sm:text-sm text-indigo-100 dark:text-blue-200 leading-normal whitespace-pre select-all">
          {diagram}
        </pre>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>
    </div>
  );
};