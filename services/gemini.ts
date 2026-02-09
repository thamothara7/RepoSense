import { GoogleGenAI } from "@google/genai";
import { AnalysisSection, RepoAnalysis, SectionContent, FileData, MetaAnalysisData, AnalysisMode } from '../types';

const BASE_SYSTEM_INSTRUCTION = `
You are RepoSense, a professional code intelligence engine. 
Your task is to analyze the provided GitHub repository context (file structure and key file contents) and generate a deep, system-level technical report.
Do not add conversational filler. Be technical, concise, and professional.
`;

const FULL_STRUCTURE = `
Required Output Structure:

=== PROJECT OVERVIEW ===
- Purpose of the project
- Target users
- Core problem solved

=== ARCHITECTURE SUMMARY ===
- Architectural style
- Major modules
- Key design decisions

=== COMPONENT BREAKDOWN ===
For each important component identified:
- Name: [Name] | Responsibility: [Responsibility] | Key Logic: [Logic]

=== DATA & CONTROL FLOW ===
- Entry points
- Data flow description
- External dependencies

=== CODE QUALITY & RISKS ===
- Potential bugs
- Security risks
- Scalability concerns
- Anti-patterns

=== IMPROVEMENT SUGGESTIONS ===
- Short-term fixes
- Medium-term improvements
- Long-term recommendations

=== META ANALYSIS ===
- Code Quality Score: [1-10]
- Project Complexity Level: [Beginner/Intermediate/Advanced]
- Maintainability Rating: [Low/Medium/High]

=== ARCHITECTURE DIAGRAM ===
[Generate a detailed ASCII diagram here]
`;

const ARCHITECTURE_STRUCTURE = `
Required Output Structure (Architecture Mode):

=== ARCHITECTURE SUMMARY ===
- Architectural style
- Major modules
- Key design decisions

=== META ANALYSIS ===
- Code Quality Score: [1-10]
- Project Complexity Level: [Beginner/Intermediate/Advanced]
- Maintainability Rating: [Low/Medium/High]

=== ARCHITECTURE DIAGRAM ===
[Generate a detailed ASCII diagram here]
`;

const RISKS_STRUCTURE = `
Required Output Structure (Risks Mode):

=== CODE QUALITY & RISKS ===
- Potential bugs
- Security risks
- Scalability concerns
- Anti-patterns

=== IMPROVEMENT SUGGESTIONS ===
- Short-term fixes
- Medium-term improvements
- Long-term recommendations

=== META ANALYSIS ===
- Code Quality Score: [1-10]
- Project Complexity Level: [Beginner/Intermediate/Advanced]
- Maintainability Rating: [Low/Medium/High]
`;

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get AI instance safely
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please add VITE_API_KEY to your .env file or Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeRepo = async (
  repoName: string,
  fileTree: string[],
  files: FileData[],
  mode: AnalysisMode = 'full',
  deepReasoning: boolean = false,
  isFallback: boolean = false
): Promise<RepoAnalysis> => {
  
  // Initialize AI client lazily
  const ai = getAIClient();

  let contextSection = "";

  if (isFallback) {
    contextSection = `
    CRITICAL NOTICE: The repository files could not be fetched due to GitHub API Rate Limiting.
    
    You must perform a "Clean Room" analysis based SOLELY on:
    1. The repository name: "${repoName}"
    2. Your internal knowledge base if this is a well-known project.
    3. Standard architectural patterns for this type of application.

    Rules for Fallback Mode:
    - Explicitly mention in the PROJECT OVERVIEW that this is an inferred analysis.
    - Infer the likely technology stack and architecture.
    - Provide general best-practice improvement suggestions for this specific type of project.
    - Do NOT hallucinate specific file names unless they are standard conventions (e.g., package.json, Dockerfile).
    `;
  } else {
    const fileContext = files.map(f => `
--- START FILE: ${f.path} ---
${f.content.substring(0, 8000)} 
--- END FILE: ${f.path} ---
`).join('\n');

    const treeContext = `
--- FILE STRUCTURE (First 300 files) ---
${fileTree.join('\n')}
--- END STRUCTURE ---
`;
    contextSection = `${treeContext}\n\n${fileContext}`;
  }

  let structureInstruction = FULL_STRUCTURE;
  if (mode === 'architecture') structureInstruction = ARCHITECTURE_STRUCTURE;
  if (mode === 'risks') structureInstruction = RISKS_STRUCTURE;

  let reasoningInstruction = "";
  if (deepReasoning) {
    reasoningInstruction = "\nCRITICAL: ENABLE DEEP REASONING. Explain WHY architectural decisions were likely made. Highlight trade-offs and alternative designs in your analysis. Be verbose in your architectural reasoning.";
  }

  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n${structureInstruction}\n${reasoningInstruction}`;

  const prompt = `
Analyze the repository "${repoName}".

${contextSection}

Provide the RepoSense analysis now.
`;

  // Increase budget for deep reasoning
  const thinkingBudget = deepReasoning ? 8192 : 2048;

  const performAnalysis = async (useFallbackModel: boolean) => {
      // If we are using the fallback model, use 'gemini-3-flash-preview' or 'gemini-2.5-flash-latest' for better quota
      const modelName = useFallbackModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
      
      const config: any = {
        systemInstruction: systemInstruction,
      };
      
      // Thinking budget is only for Gemini 3 models; if we ever fallback to 2.5, remove this.
      // Currently defaulting to Flash Preview which supports it.
      if (!useFallbackModel) {
          config.thinkingConfig = { thinkingBudget };
      }

      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: config
      });
  };

  try {
    const response = await performAnalysis(false);
    const text = response.text || '';
    const result = parseAnalysisResult(text, mode);
    result.isFallback = isFallback;
    return result;
  } catch (error: any) {
    const errString = error.toString().toLowerCase();
    
    // Improved Error Handling: Catch 429 (Too Many Requests), 503 (Unavailable), 500 (Internal), or Quota Exceeded
    const isRateLimit = errString.includes('429') || errString.includes('quota') || errString.includes('exhausted');
    const isServerError = errString.includes('500') || errString.includes('503') || errString.includes('internal error');

    if (isRateLimit || isServerError) {
        console.warn(`Primary model failed (Rate Limit or Server Error). Retrying with Flash model... Error: ${error.message}`);
        
        // Wait 1 second before retrying to let the API breathe
        await delay(1500);

        try {
            const fallbackResponse = await performAnalysis(true);
            const text = fallbackResponse.text || '';
            const result = parseAnalysisResult(text, mode);
            result.isFallback = isFallback;
            return result;
        } catch (fallbackError: any) {
            console.error("Fallback model also failed:", fallbackError);
            
            // If fallback also fails on rate limit, return a specific message
            if (fallbackError.toString().includes('429')) {
                 throw new Error("Gemini API is currently overloaded (Rate Limit Exceeded). Please wait a minute and try again.");
            }
        }
    }

    console.error("Gemini Analysis Failed:", error);

    let msg = "Failed to generate analysis. The repository might be too large or complex.";
    
    if (errString.includes('api key') || errString.includes('403')) {
        msg = "Invalid or missing API Key. Please check your environment configuration.";
    } else if (isRateLimit) {
        msg = "Gemini API rate limit exceeded. Please try again later.";
    } else if (isServerError) {
        msg = "Gemini API service is temporarily unavailable. Please try again.";
    }

    throw new Error(msg);
  }
};

const parseAnalysisResult = (text: string, mode: AnalysisMode): RepoAnalysis => {
  const sections: Record<string, string[]> = {};
  let currentSection: string | null = null;
  let diagram = '';

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect Headers
    if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
      currentSection = trimmed.replace(/===/g, '').trim();
      sections[currentSection] = [];
      continue;
    }

    if (currentSection === AnalysisSection.Diagram) {
      diagram += line + '\n';
      continue;
    }

    if (currentSection && trimmed) {
      sections[currentSection].push(trimmed.replace(/^[-•*]\s/, ''));
    }
  }

  // Helper to get section safely
  const getSection = (key: string): SectionContent => ({
    title: key,
    items: sections[key] || []
  });

  // Parse Meta Analysis specifically
  const metaLines = sections[AnalysisSection.Meta] || [];
  const metaData: MetaAnalysisData = {
    qualityScore: 5,
    complexity: 'Intermediate',
    maintainability: 'Medium'
  };

  metaLines.forEach(l => {
    if (l.includes('Score')) metaData.qualityScore = parseInt(l.match(/\d+/)?.[0] || '5');
    if (l.includes('Complexity')) {
        if (l.toLowerCase().includes('beginner')) metaData.complexity = 'Beginner';
        if (l.toLowerCase().includes('advanced')) metaData.complexity = 'Advanced';
    }
    if (l.includes('Maintainability')) {
        if (l.toLowerCase().includes('low')) metaData.maintainability = 'Low';
        if (l.toLowerCase().includes('high')) metaData.maintainability = 'High';
    }
  });

  return {
    projectOverview: getSection(AnalysisSection.Overview),
    architectureSummary: getSection(AnalysisSection.Architecture),
    componentBreakdown: getSection(AnalysisSection.Components),
    dataControlFlow: getSection(AnalysisSection.DataFlow),
    codeQualityRisks: getSection(AnalysisSection.Quality),
    improvementSuggestions: getSection(AnalysisSection.Improvements),
    metaAnalysis: metaData,
    architectureDiagram: diagram.trim()
  };
};