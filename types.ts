
export type InputType = 'url' | 'file' | 'text' | 'camera';

export enum AnalysisType {
  SUMMARY = 'Summary',
  COMPARE = 'Compare',
  MIND_MAP = 'Mind Map',
  REPORT = 'Report',
  FLASHCARDS = 'Flashcards',
  QUIZ = 'Quiz',
  SLIDE_DECK = 'Slide Deck',
  INFOGRAPHIC = 'Infographic',
  DEEP_ANALYSIS = 'Deep Analysis',
  CONTEXT_ANALYZER = 'Context Analyzer',
  KEYWORD_INSIGHT = 'Keyword Insight',
  CHAT = 'Chat'
}

export interface AnalysisResult {
  id: string;
  type: AnalysisType;
  title: string;
  content: string; // Markdown text or JSON string
  imageUrl?: string;
  timestamp: number;
}

export interface QuickTool {
  id: AnalysisType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}