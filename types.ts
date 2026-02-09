export type AnalysisMode = 'full' | 'architecture' | 'risks';

export interface RepoAnalysis {
  projectOverview: SectionContent;
  architectureSummary: SectionContent;
  componentBreakdown: SectionContent;
  dataControlFlow: SectionContent;
  codeQualityRisks: SectionContent;
  improvementSuggestions: SectionContent;
  metaAnalysis: MetaAnalysisData;
  architectureDiagram: string;
  isFallback?: boolean;
}

export interface SectionContent {
  title: string;
  items: string[];
}

export interface MetaAnalysisData {
  qualityScore: number;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  maintainability: 'Low' | 'Medium' | 'High';
}

export interface AnalysisState {
  status: 'idle' | 'fetching' | 'analyzing' | 'complete' | 'error';
  message: string;
  error?: string;
  data?: RepoAnalysis;
}

export interface FileData {
  path: string;
  content: string;
}

export enum AnalysisSection {
  Overview = "PROJECT OVERVIEW",
  Architecture = "ARCHITECTURE SUMMARY",
  Components = "COMPONENT BREAKDOWN",
  DataFlow = "DATA & CONTROL FLOW",
  Quality = "CODE QUALITY & RISKS",
  Improvements = "IMPROVEMENT SUGGESTIONS",
  Meta = "META ANALYSIS",
  Diagram = "ARCHITECTURE DIAGRAM"
}