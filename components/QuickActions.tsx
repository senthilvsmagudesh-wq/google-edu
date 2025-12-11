import React from 'react';
import { AnalysisType, QuickTool } from '../types';
import { 
  FileText, 
  GitCompare, 
  Network, 
  FileBarChart, 
  Layers, 
  BrainCircuit, 
  Presentation, 
  Image as ImageIcon,
  Zap,
  Globe,
  Search,
  Loader2
} from 'lucide-react';

interface QuickActionsProps {
  onSelect: (type: AnalysisType) => void;
  analyzingAction: AnalysisType | 'MAIN' | null;
}

const TOOLS: QuickTool[] = [
  { id: AnalysisType.SUMMARY, label: 'Smart Summary', icon: 'FileText', color: 'bg-blue-100 text-blue-600', description: 'Quick overview' },
  { id: AnalysisType.COMPARE, label: 'Compare Mode', icon: 'GitCompare', color: 'bg-purple-100 text-purple-600', description: 'Contrast ideas' },
  { id: AnalysisType.MIND_MAP, label: 'Knowledge Map', icon: 'Network', color: 'bg-green-100 text-green-600', description: 'Visualize connections' },
  { id: AnalysisType.REPORT, label: 'Detailed Report', icon: 'FileBarChart', color: 'bg-orange-100 text-orange-600', description: 'Full analysis' },
  { id: AnalysisType.FLASHCARDS, label: 'Flashcards', icon: 'Layers', color: 'bg-yellow-100 text-yellow-600', description: 'Study aid' },
  { id: AnalysisType.QUIZ, label: 'Auto Quiz', icon: 'BrainCircuit', color: 'bg-pink-100 text-pink-600', description: 'Test knowledge' },
  { id: AnalysisType.SLIDE_DECK, label: 'Slide Deck', icon: 'Presentation', color: 'bg-indigo-100 text-indigo-600', description: 'Presentation outline' },
  { id: AnalysisType.INFOGRAPHIC, label: 'Infographic', icon: 'ImageIcon', color: 'bg-cyan-100 text-cyan-600', description: 'Visual concept' },
  { id: AnalysisType.DEEP_ANALYSIS, label: 'Deep Analysis', icon: 'Zap', color: 'bg-rose-100 text-rose-600', description: 'Thinking mode' },
  { id: AnalysisType.CONTEXT_ANALYZER, label: 'Context', icon: 'Globe', color: 'bg-emerald-100 text-emerald-600', description: 'Search grounding' },
  { id: AnalysisType.KEYWORD_INSIGHT, label: 'Keywords', icon: 'Search', color: 'bg-sky-100 text-sky-600', description: 'Fast extraction' },
];

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={20} />,
  GitCompare: <GitCompare size={20} />,
  Network: <Network size={20} />,
  FileBarChart: <FileBarChart size={20} />,
  Layers: <Layers size={20} />,
  BrainCircuit: <BrainCircuit size={20} />,
  Presentation: <Presentation size={20} />,
  ImageIcon: <ImageIcon size={20} />,
  Zap: <Zap size={20} />,
  Globe: <Globe size={20} />,
  Search: <Search size={20} />,
};

const QuickActions: React.FC<QuickActionsProps> = ({ onSelect, analyzingAction }) => {
  const isAnyAnalyzing = analyzingAction !== null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      <h3 className="text-gray-500 font-semibold text-sm mb-4 uppercase tracking-wider ml-1">Quick AI Tools</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {TOOLS.map((tool) => {
          const isThisAnalyzing = analyzingAction === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              disabled={isAnyAnalyzing}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border bg-white shadow-sm h-full min-h-[110px] transition-all group relative
                ${isThisAnalyzing ? 'border-primary ring-1 ring-primary' : 'border-gray-100 hover:shadow-md'}
                ${isAnyAnalyzing && !isThisAnalyzing ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-1'}
              `}
            >
              <div className={`p-3 rounded-full mb-3 transition-transform ${isThisAnalyzing ? 'bg-primary text-white scale-110' : `${tool.color} group-hover:scale-110`}`}>
                {isThisAnalyzing ? <Loader2 size={20} className="animate-spin" /> : iconMap[tool.icon]}
              </div>
              <span className={`font-semibold text-sm md:text-base ${isThisAnalyzing ? 'text-primary' : 'text-gray-800'}`}>
                {isThisAnalyzing ? 'Analyzing...' : tool.label}
              </span>
              <span className="text-xs text-gray-400 mt-1 hidden md:block">{tool.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
