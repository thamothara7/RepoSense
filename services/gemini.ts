import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisSection, RepoAnalysis, SectionContent, FileData, MetaAnalysisData, AnalysisMode } from '../types';

const BASE_SYSTEM_INSTRUCTION = `
You are RepoSense, a professional code intelligence engine. 
Your task is to analyze the provided GitHub repository context and generate a deep, system-level technical report in structured JSON format.
CRITICAL FORMATTING RULES:
1. Return ONLY valid JSON.
2. Do NOT use Markdown formatting (no **bold**, no *italics*, no \`code\`) inside the JSON string values.
3. Keep text clean, professional, and concise.
4. For the 'architectureDiagram', provide ONLY the ASCII art, no surrounding markdown code blocks.
`;

// Schema definition for the JSON output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectOverview: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Purpose, Target Users, Core Problem Solved. Plain text only."
    },
    architectureSummary: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Arch style, Major modules, Design decisions. Plain text only."
    },
    componentBreakdown: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of key components. Format: 'Name | Responsibility | Logic'. Plain text only."
    },
    dataControlFlow: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Entry points, Data flow, Dependencies. Plain text only."
    },
    codeQualityRisks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Bugs, Security risks, Scalability. Plain text only."
    },
    improvementSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 items: Short/Medium/Long term fixes. Plain text only."
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
      description: "A detailed ASCII art diagram of the system architecture. Plain text."
    }
  },
  required: ["projectOverview", "architectureSummary", "componentBreakdown", "dataControlFlow", "codeQualityRisks", "improvementSuggestions", "metaAnalysis", "architectureDiagram"]
};

export const analyzeRepo = async (
  repoName: string,
  fileTree: string[],
  files: FileData[],
  userApiKey: string,
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
  // Strict BYOK: No fallback to process.env.API_KEY
  const finalApiKey = userApiKey;
  
  if (!finalApiKey) {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  
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
      }
    }

    // Clean and Parse
    let cleanJsonStr = accumulatedText.trim();
    // Remove markdown code blocks if present (sometimes model adds them despite config)
    cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '');
    cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '');

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
    if (msg.includes('API key not valid')) msg = "Invalid Gemini API Key. Please check your settings.";
    if (msg.includes('500') || msg.includes('503')) msg = "Gemini API is temporarily unavailable.";
    throw new Error(msg);
  }
};

// Helper to remove markdown artifacts like **bold**, *italic*, or `code`
const cleanText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic
    .replace(/`(.*?)`/g, '$1')       // Remove inline code
    .replace(/^[-*•]\s+/, '')        // Remove leading bullets
    .trim();
};

const transformJsonToAnalysis = (data: any): RepoAnalysis => {
  // Helper to ensure array of strings and clean them
  const getList = (items: any): string[] => {
    if (Array.isArray(items)) {
      return items.map(String).map(cleanText);
    }
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
      complexity: cleanText((data.metaAnalysis?.complexity as any) || 'Intermediate') as any,
      maintainability: cleanText((data.metaAnalysis?.maintainability as any) || 'Medium') as any
    },
    // For diagram, we just want to strip outer code blocks, but preserve internal structure
    architectureDiagram: (data.architectureDiagram || '').replace(/^```(\w+)?/, '').replace(/```$/, '').trim()
  };
};