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

export const analyzeRepo = async (
  repoName: string,
  fileTree: string[],
  files: FileData[],
  mode: AnalysisMode = 'full',
  deepReasoning: boolean = false,
  isFallback: boolean = false,
  onProgress?: (partialData: RepoAnalysis) => void
): Promise<RepoAnalysis> => {

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
    // Optimization: Truncate file content to 5000 chars to reduce prompt size and speed up generation.
    // Large prompts significantly increase Time To First Token.
    const MAX_CHAR_COUNT = deepReasoning ? 12000 : 5000;
    
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

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        deepReasoning
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server Error: ${response.status}`);
    }

    if (!response.body) throw new Error("No response body received");

    // Streaming Logic
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      accumulatedText += chunk;

      // Incrementally parse and notify UI
      if (onProgress) {
        const partialData = parseAnalysisResult(accumulatedText, mode);
        partialData.isFallback = isFallback;
        onProgress(partialData);
      }
    }

    // Final Parse
    const finalResult = parseAnalysisResult(accumulatedText, mode);
    finalResult.isFallback = isFallback;
    return finalResult;

  } catch (error: any) {
    console.error("Analysis Failed:", error);
    let msg = error.message;
    if (msg.includes('504')) msg = "Analysis timed out. The repository might be too large.";
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
      // Preserve indentation for diagrams
      if (line !== trimmed) {
         diagram += line + '\n';
      } else {
         diagram += trimmed + '\n';
      }
      continue;
    }

    if (currentSection && trimmed) {
      // Remove Markdown bullets for cleaner cards
      const cleanLine = trimmed.replace(/^[-•*]\s/, '');
      if (cleanLine) {
        sections[currentSection].push(cleanLine);
      }
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