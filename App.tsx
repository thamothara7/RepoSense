import React, { useState, useEffect } from 'react';
import { GithubIcon, SearchIcon, Activity, AlertTriangle, Layers, Zap, Cpu, Shield, Layout, RepoSenseLogo, Sun, Moon, Settings, Key, X, Check, FileCode, XIcon, LinkedInIcon, CoffeeIcon } from './components/Icons';
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

// Progress Steps Configuration
const LOADING_STEPS = [
  { id: 'scan', label: 'Scanning Repository', icon: GithubIcon },
  { id: 'context', label: 'Extracting Context', icon: FileCode },
  { id: 'reasoning', label: 'System Reasoning', icon: Cpu },
  { id: 'generation', label: 'Report Generation', icon: Zap },
];

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('full');
  const [deepReasoning, setDeepReasoning] = useState(false);
  const [state, setState] = useState<AnalysisState>({ status: 'idle', message: '' });
  const [currentStep, setCurrentStep] = useState(0);
  
  // Theme management
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  // Settings & Token
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const storedGhToken = localStorage.getItem('github_token');
    const storedGeminiKey = localStorage.getItem('gemini_api_key');
    if (storedGhToken) setGithubToken(storedGhToken);
    if (storedGeminiKey) setGeminiApiKey(storedGeminiKey);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSaveSettings = () => {
    localStorage.setItem('github_token', githubToken);
    localStorage.setItem('gemini_api_key', geminiApiKey);
    setIsSettingsOpen(false);
  };

  const handleAnalyze = async (e: React.FormEvent, overrideUrl?: string) => {
    e.preventDefault();
    const targetUrl = overrideUrl || url;
    
    // Strict BYOK: Only use the key from state (loaded from local storage)
    const hasKey = !!geminiApiKey;

    if (!hasKey) {
        setIsSettingsOpen(true);
        setState({ status: 'error', message: 'Gemini API Key is required. Please add it in Settings.' });
        return;
    }

    if (!targetUrl.trim()) {
      setState({ status: 'error', message: 'Please enter a GitHub repository URL.' });
      return;
    }

    const repoInfo = parseRepoUrl(targetUrl);
    if (!repoInfo) {
      setState({ status: 'error', message: 'Invalid URL. Please use format: https://github.com/owner/repo' });
      return;
    }

    // STEP 1: SCANNING
    setState({ status: 'fetching', message: 'Scanning repository...' });
    setCurrentStep(1); 

    try {
      // 1. Fetch Data
      const context = await getRepoContext(repoInfo.owner, repoInfo.repo, githubToken);
      
      // STEP 2: CONTEXT
      setCurrentStep(2);
      // Short delay to show the step change visually
      await new Promise(r => setTimeout(r, 600));

      let loadingMsg = 'Analyzing system structure...';
      if (context.isFallback) {
         loadingMsg = 'GitHub API limit reached. Using inferred analysis...';
      }

      setState({ status: 'analyzing', message: loadingMsg });
      
      // STEP 3: REASONING (Gemini is thinking)
      setCurrentStep(3);

      // 2. Analyze with Gemini (Streaming)
      const analysis = await analyzeRepo(
        repoInfo.repo, 
        context.fileTree, 
        context.files,
        geminiApiKey,
        mode, 
        deepReasoning,
        context.isFallback,
        (partialData) => {
          // STEP 4: GENERATION (Streaming has started)
          setCurrentStep(4);
          
          // Dynamic Message Updates based on content
          let dynamicMsg = "Generating technical report...";
          if (partialData.architectureDiagram) dynamicMsg = "Drawing architecture diagram...";
          else if (partialData.codeQualityRisks.items.length > 0) dynamicMsg = "Identifying security risks...";
          else if (partialData.componentBreakdown.items.length > 0) dynamicMsg = "Analyzing core components...";
          
          setState(prev => ({
            ...prev,
            status: 'analyzing',
            message: dynamicMsg,
            data: partialData
          }));
        }
      );
      
      setState({ status: 'complete', message: 'Analysis complete.', data: analysis });
      setCurrentStep(4); // Ensure we stay at 4 (Completed state)
      
    } catch (err: any) {
      let msg = err.message || 'An unexpected error occurred.';
      
      if (msg.includes('404')) msg = `Repository "${repoInfo.owner}/${repoInfo.repo}" not found. It may be private or deleted.`;
      if (msg.includes('Failed to fetch')) msg = 'Network error. Please check your internet connection.';
      if (msg.includes('Invalid GitHub Token')) msg = 'The provided GitHub Token is invalid. Please update it in settings.';
      if (msg.includes('timeout')) msg = 'Repository scan timed out. Try a smaller repo or add a Token.';

      setState({ 
        status: 'error', 
        message: msg 
      });
      setCurrentStep(0);
    }
  };

  const handleExampleClick = (example: string) => {
    const fullUrl = `https://github.com/${example}`;
    setUrl(fullUrl);
  };

  const showResults = (state.status === 'complete' || state.status === 'analyzing') && state.data;
  const showLoading = (state.status === 'fetching' || (state.status === 'analyzing' && !state.data));

  return (
    <div className="min-h-screen selection:bg-indigo-500/30 font-sans relative overflow-x-hidden flex flex-col">
      
      {/* --- LIQUID BACKGROUND --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 dark:bg-purple-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-cyan-500/20 dark:bg-cyan-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/10 dark:bg-black/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuration
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              
              {/* Gemini API Key */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                   Gemini API Key <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">Required</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input 
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50/50 dark:bg-black/30 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 text-sm font-mono placeholder-slate-400"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your key is stored locally in your browser. 
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1 font-medium">
                    Get a Gemini API Key here.
                  </a>
                </p>
              </div>

              <div className="w-full h-px bg-slate-200/50 dark:bg-white/10"></div>

              {/* GitHub Token */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  GitHub Personal Access Token <span className="text-[10px] font-normal normal-case opacity-70">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <GithubIcon className="w-4 h-4" />
                  </div>
                  <input 
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50/50 dark:bg-black/30 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 text-sm font-mono placeholder-slate-400"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Increases rate limit from 60 to 5,000 req/hr.
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
                    Generate a classic token
                  </a>.
                </p>
              </div>

              <button 
                onClick={handleSaveSettings}
                className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Glass */}
      <header className="glass sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3 group cursor-default flex-shrink-0">
            <div className="relative flex items-center justify-center">
               <RepoSenseLogo className="w-8 h-8 group-hover:scale-105 transition-transform duration-300 ease-out drop-shadow-lg" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight leading-none pt-0.5">
              RepoSense
            </h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <Tooltip content="Settings & API Keys">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-200 relative border border-transparent hover:border-white/10 hover:scale-110 active:scale-95"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
                {!geminiApiKey && (
                   <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></span>
                )}
              </button>
            </Tooltip>

            <Tooltip content={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/10 hover:scale-110 active:scale-95"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </Tooltip>

            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 hidden md:block"></div>

            <div className="text-xs font-mono text-slate-500 dark:text-slate-500 hidden md:block whitespace-nowrap">
              POWERED BY GEMINI 3
            </div>
            
            <Tooltip content="View Source on GitHub">
              <a 
                href="https://github.com/thamothara7/RepoSense" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 group relative block hover:scale-110 active:scale-95 transform"
              >
                <GithubIcon className="w-5 h-5" />
              </a>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 relative z-0 flex-grow w-full">
        
        {/* Hero / Input */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-xs font-mono mb-6 shadow-sm">
            <Zap className="w-3 h-3" />
            <span>Next-Gen System Intelligence</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-slate-900 dark:text-white leading-tight drop-shadow-sm">
            Instant Codebase <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400">
              Intelligence
            </span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Understand complex GitHub repositories in seconds. Deep system analysis, architecture visualization, and risk assessment powered by AI.
          </p>

          <form onSubmit={(e) => handleAnalyze(e)} className="relative w-full max-w-2xl mx-auto mb-10 group z-10">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
            
            <div className="relative flex items-center glass-panel rounded-2xl transition-all duration-300 overflow-hidden h-16">
              
              <div className="pl-5 pr-3 flex items-center justify-center text-slate-400 dark:text-slate-400 transition-colors group-focus-within:text-indigo-500">
                <GithubIcon className="w-5 h-5" />
              </div>

              <input
                type="text"
                placeholder="https://github.com/owner/repository"
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 px-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm h-full w-full min-w-0"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={state.status === 'fetching' || state.status === 'analyzing'}
                spellCheck={false}
              />

              <div className="pr-2">
                <button
                  type="submit"
                  disabled={state.status === 'fetching' || state.status === 'analyzing'}
                  className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-indigo-500/20 whitespace-nowrap flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-indigo-400/20"
                >
                  {state.status === 'fetching' ? (
                    <Activity className="animate-spin w-4 h-4" />
                  ) : state.status === 'analyzing' ? (
                     <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                     </div>
                  ) : (
                    <SearchIcon className="w-4 h-4" />
                  )}
                  <span>{state.status === 'fetching' || state.status === 'analyzing' ? 'Processing' : 'Analyze'}</span>
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-col items-center space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm glass p-2 rounded-2xl">
              <div className="flex bg-slate-100 dark:bg-black/20 rounded-xl p-1 shadow-inner">
                <Tooltip content="Comprehensive system analysis">
                  <button
                    type="button"
                    onClick={() => setMode('full')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${mode === 'full' ? 'bg-white dark:bg-slate-700/80 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Full
                  </button>
                </Tooltip>
                <Tooltip content="Focus on structural design & patterns">
                  <button
                    type="button"
                    onClick={() => setMode('architecture')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${mode === 'architecture' ? 'bg-white dark:bg-slate-700/80 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                    <Layout className="w-3.5 h-3.5" /> Architecture
                  </button>
                </Tooltip>
                <Tooltip content="Identify bugs & security flaws">
                  <button
                    type="button"
                    onClick={() => setMode('risks')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${mode === 'risks' ? 'bg-white dark:bg-slate-700/80 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                    <Shield className="w-3.5 h-3.5" /> Risks
                  </button>
                </Tooltip>
              </div>

              <div className="w-px h-8 bg-slate-300 dark:bg-white/10 hidden md:block"></div>

              <Tooltip content="Deep Reasoning uses Gemini 3 Pro (Slower but deeper). Default is Gemini 3 Flash (Instant).">
                <button 
                  type="button"
                  onClick={() => setDeepReasoning(!deepReasoning)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200 ${deepReasoning ? 'bg-indigo-50/50 dark:bg-indigo-900/30 border-indigo-200/50 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-200' : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5'}`}
                >
                  <Cpu className={`w-4 h-4 ${deepReasoning ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="font-medium">Deep Reasoning</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${deepReasoning ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm ${deepReasoning ? 'left-4.5' : 'left-0.5'}`} style={{ left: deepReasoning ? '18px' : '2px' }} />
                  </div>
                </button>
              </Tooltip>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-500 uppercase tracking-widest mr-1">Examples:</span>
              {EXAMPLE_REPOS.map(repo => (
                <button
                  key={repo}
                  onClick={() => handleExampleClick(repo)}
                  className="group relative text-xs font-mono px-3 py-1.5 rounded-md border transition-all duration-300
                    glass-panel
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
            <div className="mt-8 p-4 glass-panel border-red-500/30 bg-red-50/50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-200 text-sm flex items-center justify-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {state.message}
            </div>
          )}
        </div>

        {/* LOADING STEPS INDICATOR */}
        {showLoading && (
           <div className="max-w-2xl mx-auto mt-16">
              <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
                <h3 className="text-center font-mono font-bold text-slate-800 dark:text-white mb-6 tracking-wide relative z-10">SYSTEM ANALYSIS IN PROGRESS</h3>
                
                {/* Visual Progress Bar */}
                <div className="relative h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full mb-8 overflow-hidden z-10">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${Math.min((currentStep / LOADING_STEPS.length) * 100, 100)}%` }}
                  >
                     <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  {LOADING_STEPS.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isActive = currentStep === stepNum;
                    const isCompleted = currentStep > stepNum;

                    return (
                      <div key={step.id} className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/30' : 'border border-transparent'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                          isCompleted ? 'bg-emerald-500 text-white' : 
                          isActive ? 'bg-indigo-600 text-white' : 
                          'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400'
                        }`}>
                           {isCompleted ? <Check className="w-4 h-4" /> : 
                            isActive ? <step.icon className="w-4 h-4 animate-pulse" /> : 
                            <step.icon className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className={`font-medium text-sm ${isActive || isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                              {step.label}
                            </span>
                            {isActive && <span className="text-xs text-indigo-500 font-mono animate-pulse">Processing...</span>}
                            {isCompleted && <span className="text-xs text-emerald-500 font-mono">Done</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-center text-xs text-slate-500 dark:text-slate-500 font-mono">
                  {state.message}
                </div>
              </div>
           </div>
        )}

        {/* Results */}
        {showResults && state.data && (
          <div className="animate-fade-in-up transition-all duration-500">
            
            {/* Status Bar for Streaming */}
            {state.status === 'analyzing' && (
               <div className="mb-8 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-cyan-400 w-full animate-progress-indeterminate origin-left"></div>
               </div>
            )}

            {/* Rate Limit Banner */}
            {state.data.isFallback && (
              <div className="mb-8 p-4 glass-panel border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
                    GitHub API rate limit reached. Switching to fallback analysis mode.
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400/80 leading-relaxed">
                    RepoSense is currently analyzing this repository based on its name and ecosystem context because direct file access was limited.
                    <button onClick={() => setIsSettingsOpen(true)} className="underline ml-1 hover:text-amber-900 dark:hover:text-white">
                      Add a GitHub Token to fix this.
                    </button>
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

      {/* Footer */}
      <footer className="w-full glass py-8 border-t border-white/10 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
             {/* GitHub */}
             <Tooltip content="GitHub">
                <a 
                  href="https://github.com/thamothara7" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full"
                >
                  <GithubIcon className="w-5 h-5" />
                </a>
             </Tooltip>

             {/* X (Twitter) */}
             <Tooltip content="X (Twitter)">
                <a 
                  href="https://x.com/ThamotharaNata1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full"
                >
                  <XIcon className="w-5 h-5" />
                </a>
             </Tooltip>

             {/* LinkedIn */}
             <Tooltip content="LinkedIn">
                <a 
                  href="https://www.linkedin.com/in/thamotharanatarajan/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors p-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full"
                >
                  <LinkedInIcon className="w-5 h-5" />
                </a>
             </Tooltip>

             {/* Buy Me A Coffee */}
             <Tooltip content="Buy Me A Coffee">
                <a 
                  href="https://buymeacoffee.com/thamothara7" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-yellow-500 dark:text-slate-400 dark:hover:text-yellow-400 transition-colors p-2 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full"
                >
                  <CoffeeIcon className="w-5 h-5" />
                </a>
             </Tooltip>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Designed & Built by Thamothara
            </p>
          </div>
        </div>
      </footer>
      
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(0.2); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default App;