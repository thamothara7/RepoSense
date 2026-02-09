import { GoogleGenAI } from "@google/genai";
import { AnalysisSection, RepoAnalysis, SectionContent, FileData, MetaAnalysisData } from '../types';

const API_KEY = process.env.API_KEY || '';

// Initialize GenAI
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
You are RepoSense, a professional code intelligence engine. 
Your task is to analyze the provided GitHub repository context (file structure and key file contents) and generate a deep, system-level technical report.

Your output must be structured exactly into the following sections with their specific headers. 
Do not add conversational filler. Be technical, concise, and professional.

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

export const analyzeRepo = async (
  repoName: string,
  fileTree: string[],
  files: FileData[]
): Promise<RepoAnalysis> => {
  
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

  const prompt = `
Analyze the repository "${repoName}".

${treeContext}

${fileContext}

Provide the RepoSense analysis now.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using pro for complex code reasoning
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 2048 }, // Enable thinking for better architecture analysis
      }
    });

    const text = response.text || '';
    return parseAnalysisResult(text);
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("Failed to generate analysis. The repository might be too large or the API key is invalid.");
  }
};

const parseAnalysisResult = (text: string): RepoAnalysis => {
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
      // Remove bullet points for cleaner array storage if needed, or keep them
      sections[currentSection].push(trimmed.replace(/^[-•*]\s/, ''));
    }
  }

  // Helper to get section safely
  const getSection = (key: string): SectionContent => ({
    title: key,
    items: sections[key] || ['No data available.']
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