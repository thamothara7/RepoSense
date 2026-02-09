import React, { useState } from 'react';
import { GithubIcon, SearchIcon, Activity, AlertTriangle, Layers, Zap } from './components/Icons';
import { SectionCard } from './components/SectionCard';
import { ArchitectureView } from './components/ArchitectureView';
import { MetaStats } from './components/MetaStats';
import { AnalysisState, AnalysisSection } from './types';
import { parseRepoUrl, getRepoContext } from './services/github';
import { analyzeRepo } from './services/gemini';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<AnalysisState>({ status: 'idle', message: '' });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;

    const repoInfo = parseRepoUrl(url);
    if (!repoInfo) {
      setState({ status: 'error', message: 'Invalid GitHub URL. Please use format: https://github.com/owner/repo' });
      return;
    }

    setState({ status: 'fetching', message: 'Fetching repository structure...' });

    try {
      // 1. Fetch Data
      const context = await getRepoContext(repoInfo.owner, repoInfo.repo);
      
      setState({ status: 'analyzing', message: 'Gemini is analyzing system architecture...' });

      // 2. Analyze with Gemini
      const analysis = await analyzeRepo(repoInfo.repo, context.fileTree, context.files);
      
      setState({ status: 'complete', message: 'Analysis complete.', data: analysis });
    } catch (err: any) {
      setState({ 
        status: 'error', 
        message: err.message || 'An unexpected error occurred.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-bold text-white font-mono">R</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 font-mono tracking-tight">
              RepoSense
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-500 hidden sm:block">
            POWERED BY GEMINI 3
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Hero / Input */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">
            Instant Codebase <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Intelligence
            </span>
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Understand complex GitHub repositories in seconds. Deep system analysis, architecture visualization, and risk assessment.
          </p>

          <form onSubmit={handleAnalyze} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative flex items-center bg-slate-900 rounded-lg p-2 border border-slate-700 shadow-2xl">
              <GithubIcon className="ml-3 text-slate-500 w-6 h-6" />
              <input
                type="text"
                placeholder="https://github.com/owner/repository"
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-600 px-4 py-2 font-mono text-sm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={state.status === 'fetching' || state.status === 'analyzing'}
              />
              <button
                type="submit"
                disabled={state.status === 'fetching' || state.status === 'analyzing'}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {state.status === 'fetching' || state.status === 'analyzing' ? (
                  <Activity className="animate-spin w-4 h-4" />
                ) : (
                  <SearchIcon className="w-4 h-4" />
                )}
                <span>Analyze</span>
              </button>
            </div>
          </form>

          {state.status === 'error' && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {state.message}
            </div>
          )}
        </div>

        {/* Loading State */}
        {(state.status === 'fetching' || state.status === 'analyzing') && (
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-blue-400 font-mono animate-pulse">{state.message}</p>
              <div className="text-xs text-slate-500 max-w-md mx-auto">
                Reading file structure, selecting key components, and synthesizing system architecture using Gemini 3 Pro...
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {state.status === 'complete' && state.data && (
          <div className="animate-fade-in-up">
            
            <MetaStats data={state.data.metaAnalysis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard 
                title="Project Overview" 
                items={state.data.projectOverview.items}
                icon={<Activity className="w-5 h-5" />}
              />
              <SectionCard 
                title="Architecture Summary" 
                items={state.data.architectureSummary.items}
                icon={<Layers className="w-5 h-5" />}
              />
            </div>

            <ArchitectureView diagram={state.data.architectureDiagram} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2">
                <SectionCard 
                  title="Component Breakdown" 
                  items={state.data.componentBreakdown.items}
                />
              </div>
              <SectionCard 
                title="Data Flow" 
                items={state.data.dataControlFlow.items}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <SectionCard 
                title="Code Quality & Risks" 
                items={state.data.codeQualityRisks.items}
                variant="danger"
                icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
              />
              <SectionCard 
                title="Improvement Suggestions" 
                items={state.data.improvementSuggestions.items}
                variant="success"
                icon={<Zap className="w-5 h-5 text-emerald-400" />}
              />
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;