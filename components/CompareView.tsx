import React from 'react';
import { Activity, Layers, AlertTriangle, Zap, GithubIcon } from './Icons';
import { SectionCard } from './SectionCard';
import { ArchitectureView } from './ArchitectureView';
import { AnalysisState } from '../types';

interface RepoColumnProps {
  state: AnalysisState;
}

const RepoColumn: React.FC<RepoColumnProps> = ({ state }) => {
  if (state.status === 'error') {
    return (
      <div className="p-4 glass-panel border-red-500/30 bg-red-50/50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-200 text-sm">
        {state.message}
      </div>
    );
  }

  if (!state.data) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 glass-panel rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-3 rounded-xl text-center">
          <div className={`text-2xl font-bold font-mono ${data.metaAnalysis.qualityScore >= 7 ? 'text-emerald-500' : data.metaAnalysis.qualityScore >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
            {data.metaAnalysis.qualityScore}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono uppercase tracking-wider">Quality</div>
        </div>
        <div className="glass-panel p-3 rounded-xl text-center">
          <div className="text-sm font-bold font-mono text-indigo-500 dark:text-indigo-400">{data.metaAnalysis.complexity}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono uppercase tracking-wider">Complexity</div>
        </div>
        <div className="glass-panel p-3 rounded-xl text-center">
          <div className={`text-sm font-bold font-mono ${data.metaAnalysis.maintainability === 'High' ? 'text-emerald-500' : data.metaAnalysis.maintainability === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>
            {data.metaAnalysis.maintainability}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono uppercase tracking-wider">Maintain.</div>
        </div>
      </div>

      {data.projectOverview.items.length > 0 && (
        <SectionCard title="Project Overview" items={data.projectOverview.items} icon={<Activity className="w-5 h-5" />} />
      )}
      {data.architectureSummary.items.length > 0 && (
        <SectionCard title="Architecture" items={data.architectureSummary.items} icon={<Layers className="w-5 h-5" />} />
      )}
      {data.architectureDiagram && (
        <ArchitectureView diagram={data.architectureDiagram} />
      )}
      {data.componentBreakdown.items.length > 0 && (
        <SectionCard title="Components" items={data.componentBreakdown.items} />
      )}
      {data.dataControlFlow.items.length > 0 && (
        <SectionCard title="Data Flow" items={data.dataControlFlow.items} />
      )}
      {data.codeQualityRisks.items.length > 0 && (
        <SectionCard title="Code Quality & Risks" items={data.codeQualityRisks.items} variant="danger" icon={<AlertTriangle className="w-5 h-5" />} />
      )}
      {data.improvementSuggestions.items.length > 0 && (
        <SectionCard title="Improvements" items={data.improvementSuggestions.items} variant="success" icon={<Zap className="w-5 h-5" />} />
      )}
    </div>
  );
};

interface CompareViewProps {
  repo1Name: string;
  repo2Name: string;
  state1: AnalysisState;
  state2: AnalysisState;
}

export const CompareView: React.FC<CompareViewProps> = ({ repo1Name, repo2Name, state1, state2 }) => {
  const statusLabel = (s: AnalysisState) => {
    if (s.status === 'complete') return { text: 'Analysis complete', cls: 'text-emerald-500' };
    if (s.status === 'analyzing') return { text: 'Analyzing...', cls: 'text-indigo-400 animate-pulse' };
    if (s.status === 'fetching') return { text: 'Scanning...', cls: 'text-indigo-400 animate-pulse' };
    if (s.status === 'error') return { text: 'Failed', cls: 'text-red-400' };
    return { text: 'Waiting', cls: 'text-slate-400' };
  };

  const repos = [
    { name: repo1Name, state: state1 },
    { name: repo2Name, state: state2 },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="grid grid-cols-2 gap-4 mb-8">
        {repos.map(({ name, state }, i) => {
          const { text, cls } = statusLabel(state);
          return (
            <div key={i} className="glass-panel rounded-xl p-4 flex items-center gap-3">
              <GithubIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{name || `Repo ${i + 1}`}</div>
                <div className={`text-xs font-mono mt-0.5 ${cls}`}>{text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <RepoColumn state={state1} />
        <RepoColumn state={state2} />
      </div>
    </div>
  );
};
