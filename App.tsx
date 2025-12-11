import React, { useState, useRef } from 'react';
import { Settings, Home, PenTool, History as HistoryIcon, Newspaper, MessageCircle } from 'lucide-react';
import InputSection from './components/InputSection';
import QuickActions from './components/QuickActions';
import ResultDisplay from './components/ResultDisplay';
import ChatBot from './components/ChatBot';
import { AnalysisResult, AnalysisType, InputType } from './types';
import { generateAnalysis } from './services/geminiService';

function App() {
  const [inputType, setInputType] = useState<InputType>('url');
  const [inputValue, setInputValue] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  
  // Refs for scrolling
  const toolsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  
  // Changed from simple boolean to specific action tracking
  const [analyzingAction, setAnalyzingAction] = useState<AnalysisType | 'MAIN' | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);
  
  // ChatBot visibility state (lifted up)
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Initial mock history
  useState(() => {
    // Only for visual mock
    const initialHistory: AnalysisResult[] = [
      { id: '1', type: AnalysisType.REPORT, title: 'Report on Climate Change', content: '# Climate Change Report\n\nExecutive summary...', timestamp: Date.now() },
      { id: '2', type: AnalysisType.MIND_MAP, title: 'Mind Map: Machine Learning', content: '- Machine Learning\n  - Supervised\n  - Unsupervised', timestamp: Date.now() - 100000 },
    ];
    setResults(initialHistory);
  });

  const handleAnalysis = async (
    type: AnalysisType = AnalysisType.SUMMARY, 
    source: 'MAIN' | 'QUICK' = 'MAIN',
    overrideValue?: string,
    overrideType?: InputType
  ) => {
    const contentToAnalyze = overrideValue !== undefined ? overrideValue : inputValue;
    const typeToUse = overrideType !== undefined ? overrideType : inputType;

    if (!contentToAnalyze && !fileData) {
        setError("Please enter text, a URL, or upload a file before analyzing.");
        return;
    }

    setAnalyzingAction(source === 'MAIN' ? 'MAIN' : type);
    setError(null);

    try {
      const output = await generateAnalysis(
          type, 
          contentToAnalyze, 
          typeToUse, 
          fileData || undefined,
          fileMimeType || undefined
      );
      
      let content = "";
      let imageUrl = undefined;

      if (typeof output === 'string') {
        content = output;
      } else {
        content = output.text;
        imageUrl = output.imageUrl;
      }

      const newResult: AnalysisResult = {
        id: Date.now().toString(),
        type,
        title: `${type}: ${contentToAnalyze.slice(0, 30)}${contentToAnalyze.length > 30 ? '...' : ''}`,
        content,
        imageUrl,
        timestamp: Date.now()
      };

      setResults(prev => [newResult, ...prev]);
      setActiveResult(newResult);

    } catch (err: any) {
      setError(err.message || "Failed to analyze content. Please try again.");
      console.error(err);
    } finally {
      setAnalyzingAction(null);
    }
  };

  const handleQuickAction = (type: AnalysisType) => {
    handleAnalysis(type, 'QUICK');
  };

  const handleFetchNews = () => {
    const newsUrl = 'https://news.google.com';
    setInputType('url');
    setInputValue(newsUrl);
    // Clear any file data to avoid confusion
    setFileData(null);
    setFileMimeType(null);
    handleAnalysis(AnalysisType.SUMMARY, 'MAIN', newsUrl, 'url');
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0 bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-lg">
              A
            </div>
            <h1 className="font-bold text-xl tracking-tight text-gray-900">AI Analyzer</h1>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Text */}
        <div className="text-center mb-8 animate-fade-in-down">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            AI Knowledge Analyzer
          </h2>
          <p className="text-gray-500 text-lg">
            Transform any file, link, or text instantly
          </p>
        </div>

        {/* Input Section */}
        <InputSection
          inputType={inputType}
          setInputType={setInputType}
          inputValue={inputValue}
          setInputValue={setInputValue}
          fileData={fileData}
          setFileData={setFileData}
          fileMimeType={fileMimeType}
          setFileMimeType={setFileMimeType}
          onAnalyze={() => handleAnalysis(AnalysisType.SUMMARY, 'MAIN')}
          isAnalyzing={analyzingAction === 'MAIN'}
          error={error}
        />

        {/* Fetch News Button */}
        <div className="flex justify-center mb-10 -mt-2">
            <button
                onClick={handleFetchNews}
                disabled={analyzingAction !== null}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-full shadow-sm hover:shadow-md hover:text-primary hover:border-primary transition-all text-sm font-medium group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="bg-blue-50 text-primary p-1 rounded-full group-hover:scale-110 transition-transform">
                    <Newspaper size={16} />
                </div>
                Fetch Latest News & Analyze
            </button>
        </div>

        {/* Quick Actions */}
        <div ref={toolsRef} className="scroll-mt-24">
            <QuickActions 
                onSelect={handleQuickAction} 
                analyzingAction={analyzingAction} 
            />
        </div>

        {/* Recent Results */}
        <div ref={historyRef} className="w-full max-w-4xl mx-auto scroll-mt-24">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider ml-1">Recent Analyses</h3>
              <button className="text-primary text-sm font-medium hover:underline">View All</button>
           </div>
           
           <div className="space-y-3">
             {results.slice(0, 5).map(item => (
               <div 
                 key={item.id} 
                 onClick={() => setActiveResult(item)}
                 className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
               >
                  <div className="p-2 rounded-lg bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                     {item.type === AnalysisType.INFOGRAPHIC ? <PenTool size={20} /> : <PenTool size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm md:text-base truncate">{item.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="text-gray-300">
                    →
                  </div>
               </div>
             ))}
           </div>
        </div>
      </main>

      {/* Modal Result */}
      {activeResult && (
        <ResultDisplay result={activeResult} onClose={() => setActiveResult(null)} />
      )}

      {/* Chat Bot */}
      <ChatBot isOpen={isChatOpen} onToggle={setIsChatOpen} />

      {/* Mobile Footer Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30 pb-safe">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary transition-colors focus:text-primary"
          >
            <Home size={22} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button 
            onClick={() => scrollToSection(toolsRef)}
            className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary transition-colors focus:text-primary"
          >
            <PenTool size={22} />
            <span className="text-[10px] font-medium">Tools</span>
          </button>
          <button 
            onClick={() => scrollToSection(historyRef)}
            className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary transition-colors focus:text-primary"
          >
            <HistoryIcon size={22} />
            <span className="text-[10px] font-medium">History</span>
          </button>
          {/* Changed Account to Chat */}
          <button 
            onClick={() => setIsChatOpen(prev => !prev)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${isChatOpen ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}
          >
            <MessageCircle size={22} />
            <span className="text-[10px] font-medium">Chat</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;