import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisSection, RepoAnalysis, SectionContent, FileData, MetaAnalysisData, AnalysisMode } from '../types';

const BASE_SYSTEM_INSTRUCTION = `
You are RepoSense, a professional code intelligence engine. 
Your task is to analyze the provided GitHub repository context and generate a deep, system-level technical report in structured JSON format.
Do not use Markdown formatting in the JSON values. Keep strings clean and concise.
`;

// Schema definition for the JSON output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectOverview: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Purpose, Target Users, Core Problem Solved."
    },
    architectureSummary: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Arch style, Major modules, Design decisions."
    },
    componentBreakdown: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of key components. Format each string as: 'Name: [Name] | Responsibility: [Resp] | Key Logic: [Logic]'"
    },
    dataControlFlow: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Entry points, Data flow, Dependencies."
    },
    codeQualityRisks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Bugs, Security risks, Scalability."
    },
    improvementSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Short/Medium/Long term fixes."
    },
    metaAnalysis: {
      type: Type.OBJECT,
      properties: {
        qualityScore: { type: Type.NUMBER, description: "Score 1-10" },
        complexity: { type: Type.STRING, description: "Beginner, Intermediate, or Advanced" },
        maintainability: { type: Type.STRING, description: "Low, Medium, or High" }
      },
      required: ["qualityScore", "complexity", "maintainability"]
    },
    architectureDiagram: {
      type: Type.STRING,
      description: "A detailed ASCII art diagram of the system architecture."
    }
  },
  required: ["projectOverview", "architectureSummary", "componentBreakdown", "dataControlFlow", "codeQualityRisks", "improvementSuggestions", "metaAnalysis", "architectureDiagram"]
};

export const analyzeRepo = async (
  repoName: string,
  fileTree: string[],
  files: FileData[],
  mode: AnalysisMode = 'full',
  deepReasoning: boolean = false,
  isFallback: boolean = false,
  onProgress?: (partialData: RepoAnalysis) => void
): Promise<RepoAnalysis> => {

  // 1. Prepare Context
  let contextSection = "";
  if (isFallback) {
    contextSection = `
    CRITICAL NOTICE: The repository files could not be fetched due to GitHub API Rate Limiting.
    You must perform a "Clean Room" analysis based SOLELY on:
    1. The repository name: "${repoName}"
    2. Your internal knowledge base if this is a well-known project.
    3. Standard architectural patterns for this type of application.
    `;
  } else {
    // Optimization: Truncate file content
    const MAX_CHAR_COUNT = deepReasoning ? 30000 : 10000;
    
    const fileContext = files.map(f => `
--- START FILE: ${f.path} ---
${f.content.substring(0, MAX_CHAR_COUNT)} 
--- END FILE: ${f.path} ---
`).join('\n');

    const treeContext = `
--- FILE STRUCTURE (First 200 files) ---
${fileTree.join('\n')}
--- END STRUCTURE ---
`;
    contextSection = `${treeContext}\n\n${fileContext}`;
  }

  let modeInstruction = "";
  if (deepReasoning) {
    modeInstruction = "CRITICAL: ENABLE DEEP REASONING. Explain WHY architectural decisions were likely made.";
  }

  const prompt = `
Analyze the repository "${repoName}".
Mode: ${mode}
${modeInstruction}

${contextSection}
`;

  // 3. Initialize Client & Call API
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Model Selection
  const modelName = deepReasoning ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  // Thinking Config
  const thinkingBudget = deepReasoning ? 8192 : 0;

  try {
    const streamResponse = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: BASE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
        thinkingConfig: { thinkingBudget }
      }
    });

    let accumulatedText = "";
    
    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        accumulatedText += text;
        // Optional: Attempt to parse partial JSON for progress (advanced)
        // For now, we just accumulate. The UI will show "Generating..." based on state.status
      }
    }

    // Clean and Parse
    let cleanJsonStr = accumulatedText.trim();
    // Remove markdown code blocks if present (sometimes model adds them despite config)
    cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '');

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.error("JSON Parse Error:", e, cleanJsonStr);
      throw new Error("Failed to parse analysis results. The model output was not valid JSON.");
    }

    const finalResult = transformJsonToAnalysis(parsedData);
    finalResult.isFallback = isFallback;
    return finalResult;

  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    let msg = error.message || "An error occurred during analysis.";
    if (msg.includes('429')) msg = "Too many requests. Please wait a moment.";
    if (msg.includes('500') || msg.includes('503')) msg = "Gemini API is temporarily unavailable.";
    throw new Error(msg);
  }
};

const transformJsonToAnalysis = (data: any): RepoAnalysis => {
  // Helper to ensure array of strings
  const getList = (items: any): string[] => {
    if (Array.isArray(items)) return items.map(String);
    return [];
  };

  return {
    projectOverview: { title: AnalysisSection.Overview, items: getList(data.projectOverview) },
    architectureSummary: { title: AnalysisSection.Architecture, items: getList(data.architectureSummary) },
    componentBreakdown: { title: AnalysisSection.Components, items: getList(data.componentBreakdown) },
    dataControlFlow: { title: AnalysisSection.DataFlow, items: getList(data.dataControlFlow) },
    codeQualityRisks: { title: AnalysisSection.Quality, items: getList(data.codeQualityRisks) },
    improvementSuggestions: { title: AnalysisSection.Improvements, items: getList(data.improvementSuggestions) },
    metaAnalysis: {
      qualityScore: Number(data.metaAnalysis?.qualityScore) || 5,
      complexity: (data.metaAnalysis?.complexity as any) || 'Intermediate',
      maintainability: (data.metaAnalysis?.maintainability as any) || 'Medium'
    },
    architectureDiagram: data.architectureDiagram || ''
  };
};

