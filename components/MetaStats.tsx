import React from 'react';
import { MetaAnalysisData } from '../types';
import { Activity, Zap, Layers } from './Icons';

export const MetaStats: React.FC<{ data: MetaAnalysisData }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">Quality Score</p>
          <p className={`text-2xl font-mono font-bold ${data.qualityScore > 7 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {data.qualityScore}/10
          </p>
        </div>
        <Zap className="text-slate-500" />
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">Complexity</p>
          <p className="text-2xl font-mono font-bold text-blue-400">{data.complexity}</p>
        </div>
        <Layers className="text-slate-500" />
      </div>

      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">Maintainability</p>
          <p className={`text-2xl font-mono font-bold ${
            data.maintainability === 'High' ? 'text-emerald-400' : 
            data.maintainability === 'Medium' ? 'text-blue-400' : 'text-red-400'
          }`}>
            {data.maintainability}
          </p>
        </div>
        <Activity className="text-slate-500" />
      </div>
    </div>
  );
};