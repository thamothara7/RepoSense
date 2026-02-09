import React, { useState } from 'react';
import { GithubIcon, SearchIcon, Activity, AlertTriangle, Layers, Zap, Cpu, Shield, Layout } from './components/Icons';
import { SectionCard } from './components/SectionCard';
import { ArchitectureView } from './components/ArchitectureView';
import { MetaStats } from './components/MetaStats';
import { AnalysisState, AnalysisMode } from './types';
import { parseRepoUrl, getRepoContext } from './services/github';
import { analyzeRepo } from './services/gemini';

const EXAMPLE_REPOS = [
  "facebook/react",
  "vercel/next.js",
  "expressjs/express",
  "tensorflow/tensorflow",
  "fastapi/fastapi"
];

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('full');
  const [deepReasoning, setDeepReasoning] = useState(false);
  const [state, setState] = useState<AnalysisState>({ status: 'idle', message: '' });

  const handleAnalyze = async (e: React.FormEvent, overrideUrl?: string) => {
    e.preventDefault();
    const targetUrl = overrideUrl || url;
    
    if (!targetUrl.trim()) {
      setState({ status: 'error', message: 'Please enter a valid GitHub repository URL.' });
      return;
    }

    const repoInfo = parseRepoUrl(targetUrl);
    if (!repoInfo) {
      setState({ status: 'error', message: 'Invalid GitHub URL. Please use format: https://github.com/owner/repo' });
      return;
    }

    setState({ status: 'fetching', message: 'Fetching repository structure...' });

    try {
      // 1. Fetch Data
      const context = await getRepoContext(repoInfo.owner, repoInfo.repo);
      
      let loadingMsg = 'Gemini is analyzing system architecture...';
      if (deepReasoning) {
        loadingMsg = 'Performing deep architectural reasoning (this may take longer)...';
      }

      setState({ status: 'analyzing', message: loadingMsg });

      // 2. Analyze with Gemini
      const analysis = await analyzeRepo(repoInfo.repo, context.fileTree, context.files, mode, deepReasoning);
      
      setState({ status: 'complete', message: 'Analysis complete.', data: analysis });
    } catch (err: any) {
      setState({ 
        status: 'error', 
        message: err.message || 'An unexpected error occurred.' 
      });
    }
  };

  const handleExampleClick = (example: string) => {
    const fullUrl = `https://github.com/${example}`;
    setUrl(fullUrl);
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
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">
            Instant Codebase <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Intelligence
            </span>
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Understand complex GitHub repositories in seconds. Deep system analysis, architecture visualization, and risk assessment.
          </p>

          <form onSubmit={(e) => handleAnalyze(e)} className="relative group mb-8">
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

          {/* Controls & Examples */}
          <div className="space-y-6">
            
            {/* Analysis Mode & Reasoning Toggle */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setMode('full')}
                  className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-all ${mode === 'full' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <Layers className="w-3.5 h-3.5" /> Full
                </button>
                <button
                  type="button"
                  onClick={() => setMode('architecture')}
                  className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-all ${mode === 'architecture' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <Layout className="w-3.5 h-3.5" /> Architecture
                </button>
                <button
                  type="button"
                  onClick={() => setMode('risks')}
                  className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-all ${mode === 'risks' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <Shield className="w-3.5 h-3.5" /> Risks
                </button>
              </div>

              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-1.5 h-[42px]">
                <Cpu className={`w-4 h-4 ${deepReasoning ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className={`font-medium ${deepReasoning ? 'text-blue-100' : 'text-slate-400'}`}>Deep Reasoning</span>
                <button 
                  type="button"
                  onClick={() => setDeepReasoning(!deepReasoning)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${deepReasoning ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${deepReasoning ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Example Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-mono text-slate-500 uppercase mr-2">Try examples:</span>
              {EXAMPLE_REPOS.map(repo => (
                <button
                  key={repo}
                  onClick={() => handleExampleClick(repo)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1 rounded-full transition-colors font-mono"
                >
                  {repo}
                </button>
              ))}
            </div>

          </div>

          {state.status === 'error' && (
            <div className="mt-8 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-center justify-center gap-2">
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
                {deepReasoning 
                  ? "Applying advanced thinking models to infer design patterns and trade-offs..." 
                  : "Reading file structure, selecting key components, and synthesizing system architecture..."}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {state.status === 'complete' && state.data && (
          <div className="animate-fade-in-up">
            
            <MetaStats data={state.data.metaAnalysis} />

            {/* Render sections based on mode or availability */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {state.data.projectOverview.items.length > 0 && (
                <SectionCard 
                  title="Project Overview" 
                  items={state.data.projectOverview.items}
                  icon={<Activity className="w-5 h-5" />}
                />
              )}
              {state.data.architectureSummary.items.length > 0 && (
                <SectionCard 
                  title="Architecture Summary" 
                  items={state.data.architectureSummary.items}
                  icon={<Layers className="w-5 h-5" />}
                />
              )}
            </div>

            {state.data.architectureDiagram && (
              <ArchitectureView diagram={state.data.architectureDiagram} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {state.data.componentBreakdown.items.length > 0 && (
                <div className="lg:col-span-2">
                  <SectionCard 
                    title="Component Breakdown" 
                    items={state.data.componentBreakdown.items}
                  />
                </div>
              )}
              {state.data.dataControlFlow.items.length > 0 && (
                <SectionCard 
                  title="Data Flow" 
                  items={state.data.dataControlFlow.items}
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {state.data.codeQualityRisks.items.length > 0 && (
                <SectionCard 
                  title="Code Quality & Risks" 
                  items={state.data.codeQualityRisks.items}
                  variant="danger"
                  icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                />
              )}
              {state.data.improvementSuggestions.items.length > 0 && (
                <SectionCard 
                  title="Improvement Suggestions" 
                  items={state.data.improvementSuggestions.items}
                  variant="success"
                  icon={<Zap className="w-5 h-5 text-emerald-400" />}
                />
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;