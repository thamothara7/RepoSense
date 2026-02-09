import React, { useState, useEffect } from 'react';
import { GithubIcon, SearchIcon, Activity, AlertTriangle, Layers, Zap, Cpu, Shield, Layout, RepoSenseLogo, Sun, Moon } from './components/Icons';
import { SectionCard } from './components/SectionCard';
import { ArchitectureView } from './components/ArchitectureView';
import { MetaStats } from './components/MetaStats';
import { Tooltip } from './components/Tooltip';
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
  
  // Theme management
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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
      
      let loadingMsg = 'Analyzing repository architecture using Gemini 3...';
      if (context.isFallback) {
         loadingMsg = 'GitHub API limit reached. Inferring architecture from repo context...';
      } else if (deepReasoning) {
        loadingMsg = 'Performing deep architectural reasoning (this may take longer)...';
      }

      setState({ status: 'analyzing', message: loadingMsg });

      // 2. Analyze with Gemini
      const analysis = await analyzeRepo(
        repoInfo.repo, 
        context.fileTree, 
        context.files, 
        mode, 
        deepReasoning,
        context.isFallback
      );
      
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
    <div className="min-h-screen selection:bg-indigo-500/30 font-sans">
      
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-white/5 bg-white/70 dark:bg-[#0a0f1e]/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-out">
              <RepoSenseLogo className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 font-mono tracking-tight">
              RepoSense
            </h1>
          </div>

          {/* Right Nav */}
          <div className="flex items-center gap-4 md:gap-6">
            <Tooltip content={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all duration-200"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </Tooltip>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

            <div className="text-xs font-mono text-slate-500 dark:text-slate-500 hidden md:block">
              POWERED BY GEMINI 3
            </div>
            
            <Tooltip content="View Source on GitHub">
              <a 
                href="https://github.com/thamothara7/RepoSense" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 group relative block"
              >
                <GithubIcon className="w-5 h-5" />
              </a>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        
        {/* Hero / Input */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-mono mb-6 shadow-sm">
            <Zap className="w-3 h-3" />
            <span>Next-Gen System Intelligence</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-slate-900 dark:text-white leading-tight">
            Instant Codebase <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400">
              Intelligence
            </span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Understand complex GitHub repositories in seconds. Deep system analysis, architecture visualization, and risk assessment powered by AI.
          </p>

          <form onSubmit={(e) => handleAnalyze(e)} className="relative group mb-10 max-w-2xl mx-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl blur opacity-20 dark:opacity-30 group-hover:opacity-40 dark:group-hover:opacity-60 transition duration-500"></div>
            <div className="relative flex items-center bg-white dark:bg-[#0f1629] rounded-xl p-2 border border-slate-200 dark:border-slate-700/50 shadow-xl transition-all duration-300 focus-within:border-indigo-500/50 focus-within:shadow-indigo-500/10 dark:focus-within:shadow-indigo-500/20">
              <GithubIcon className="ml-4 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="https://github.com/owner/repository"
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 px-4 py-3 font-mono text-sm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={state.status === 'fetching' || state.status === 'analyzing'}
              />
              <button
                type="submit"
                disabled={state.status === 'fetching' || state.status === 'analyzing'}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
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
          <div className="flex flex-col items-center space-y-8">
            
            {/* Analysis Mode & Reasoning Toggle */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm bg-slate-100 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex bg-white dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none">
                <Tooltip content="Comprehensive system analysis">
                  <button
                    type="button"
                    onClick={() => setMode('full')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${mode === 'full' ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Full
                  </button>
                </Tooltip>
                <Tooltip content="Focus on structural design & patterns">
                  <button
                    type="button"
                    onClick={() => setMode('architecture')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${mode === 'architecture' ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <Layout className="w-3.5 h-3.5" /> Architecture
                  </button>
                </Tooltip>
                <Tooltip content="Identify bugs & security flaws">
                  <button
                    type="button"
                    onClick={() => setMode('risks')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${mode === 'risks' ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <Shield className="w-3.5 h-3.5" /> Risks
                  </button>
                </Tooltip>
              </div>

              <div className="w-px h-8 bg-slate-300 dark:bg-white/10 hidden md:block"></div>

              <Tooltip content="Enable extended thinking budget for deeper insights (slower)">
                <button 
                  type="button"
                  onClick={() => setDeepReasoning(!deepReasoning)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200 ${deepReasoning ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-200' : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
                >
                  <Cpu className={`w-4 h-4 ${deepReasoning ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="font-medium">Deep Reasoning</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${deepReasoning ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm ${deepReasoning ? 'left-4.5' : 'left-0.5'}`} style={{ left: deepReasoning ? '18px' : '2px' }} />
                  </div>
                </button>
              </Tooltip>
            </div>

            {/* Example Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-500 uppercase tracking-widest mr-1">Examples:</span>
              {EXAMPLE_REPOS.map(repo => (
                <button
                  key={repo}
                  onClick={() => handleExampleClick(repo)}
                  className="group relative text-xs font-mono px-3 py-1.5 rounded-md border transition-all duration-300
                    bg-white dark:bg-slate-800/80 
                    border-slate-200 dark:border-slate-700
                    text-slate-600 dark:text-slate-400
                    hover:border-indigo-300 dark:hover:border-indigo-500/30
                    hover:text-indigo-600 dark:hover:text-indigo-200
                    hover:shadow-md hover:shadow-indigo-500/10 dark:hover:shadow-none
                    hover:scale-105 active:scale-95
                    overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10">{repo}</span>
                </button>
              ))}
            </div>

          </div>

          {state.status === 'error' && (
            <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-200 text-sm flex items-center justify-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {state.message}
            </div>
          )}
        </div>

        {/* Loading State */}
        {(state.status === 'fetching' || state.status === 'analyzing') && (
          <div className="max-w-2xl mx-auto mt-16 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800/50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-600 dark:border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-3 border-4 border-slate-200 dark:border-slate-800/50 rounded-full"></div>
                <div className="absolute inset-3 border-4 border-b-cyan-500 border-r-transparent border-t-transparent border-l-transparent rounded-full animate-spin-reverse"></div>
              </div>
              <div>
                <p className="text-indigo-600 dark:text-indigo-300 font-mono text-lg animate-pulse mb-2">{state.message}</p>
                <div className="text-sm text-slate-500 dark:text-slate-500 max-w-md mx-auto">
                  {deepReasoning 
                    ? "Applying advanced thinking models to infer design patterns and trade-offs..." 
                    : "Synthesizing system intelligence..."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {state.status === 'complete' && state.data && (
          <div className="animate-fade-in-up transition-all duration-500">
            
            {/* Rate Limit Banner */}
            {state.data.isFallback && (
              <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-lg flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
                    GitHub API rate limit reached. Switching to fallback analysis mode.
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400/80 leading-relaxed">
                    RepoSense is currently analyzing this repository based on its name and ecosystem context because direct file access was limited by GitHub. 
                    This is a temporary state.
                  </p>
                </div>
              </div>
            )}

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
                  icon={<AlertTriangle className="w-5 h-5" />}
                />
              )}
              {state.data.improvementSuggestions.items.length > 0 && (
                <SectionCard 
                  title="Improvement Suggestions" 
                  items={state.data.improvementSuggestions.items}
                  variant="success"
                  icon={<Zap className="w-5 h-5" />}
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