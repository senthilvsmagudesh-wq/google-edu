import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnalysisResult, AnalysisType } from '../types';
import { X, Download, Copy, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ResultDisplayProps {
  result: AnalysisResult | null;
  onClose: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onClose }) => {
  // Track user answers for Quiz mode: { questionIndex: selectedOptionString }
  const [userSelections, setUserSelections] = useState<Record<number, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Reset state when result changes
  useEffect(() => {
    setUserSelections({});
  }, [result?.id]);

  if (!result) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content);
  };

  const handleExportPdf = () => {
    if (!contentRef.current || !result) return;
    
    const originalElement = contentRef.current;
    const safeTitle = result.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    const date = new Date().toISOString().split('T')[0];
    
    // Check if html2pdf is available (loaded from CDN in index.html)
    if ((window as any).html2pdf) {
        // Create a clone to render the full content without scrollbars
        const clone = originalElement.cloneNode(true) as HTMLElement;
        
        // Style the clone to ensure it renders fully for the PDF
        clone.style.width = '750px'; // Fixed width for A4 (approx)
        clone.style.height = 'auto'; // Expand to full height
        clone.style.maxHeight = 'none';
        clone.style.overflow = 'visible';
        
        // Position it fixed at top-left but behind everything
        // This ensures it is "in the viewport" for html2canvas to render, but user doesn't see it
        clone.style.position = 'fixed';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.zIndex = '-9999';
        
        // Force visual styles for print
        clone.style.background = '#ffffff';
        clone.style.color = '#000000';
        clone.style.padding = '40px'; 
        
        // Remove Tailwind scroll classes if present on the clone root
        clone.classList.remove('overflow-y-auto');

        // FORCE BLACK TEXT: Iterate all children and override color
        // This solves the issue where text might be white or light gray on white background
        const allElements = clone.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            el.style.color = '#000000';
            // Also ensure backgrounds are transparent or white, unless specific
            // We keep backgrounds for quiz options (green/red) but might want to border them strongly
            if (el.classList.contains('bg-white')) {
                el.style.backgroundColor = '#ffffff';
            }
        }
        
        document.body.appendChild(clone);

        const opt = {
            margin:       [10, 10], // top/bottom, left/right
            filename:     `${safeTitle}_${date}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                windowWidth: 800 // Simulate window width
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        (window as any).html2pdf()
            .set(opt)
            .from(clone)
            .save()
            .then(() => {
                if (document.body.contains(clone)) {
                    document.body.removeChild(clone);
                }
            })
            .catch((err: any) => {
                console.error("PDF generation failed", err);
                if (document.body.contains(clone)) {
                    document.body.removeChild(clone);
                }
            });
    } else {
        alert("PDF generator is loading... please try again in a moment.");
    }
  };

  const cleanAndParseJson = (content: string) => {
    try {
      let cleaned = content.replace(/```json/gi, '').replace(/```/g, '');
      const firstBracket = cleaned.search(/[\[\{]/);
      const lastSq = cleaned.lastIndexOf(']');
      const lastCur = cleaned.lastIndexOf('}');
      const lastBracket = Math.max(lastSq, lastCur);
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
         cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      }
      
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
      
      if (typeof parsed === 'object' && parsed !== null) {
          const values = Object.values(parsed);
          const foundArray = values.find(v => Array.isArray(v));
          if (foundArray) return foundArray;
      }

      return null;
    } catch (e) {
      console.warn("JSON Parsing failed, falling back to raw text", e);
      return null;
    }
  };

  // Helper to extract options if they are embedded in the question text (fallback)
  const extractOptionsFromQuestion = (q: any) => {
    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        return { question: q.question, options: q.options };
    }

    // Fallback: Try to parse options like "Question? - A) Option 1 - B) Option 2"
    let questionText = q.question || "";
    const options: string[] = [];
    
    // Regex for patterns like "A)", "A.", "(A)", "1.", "- "
    const optionSplitRegex = /(?:^|\s)(?:[A-D][\)\.]|\d[\)\.]|[\u2022\-])\s/g;
    
    const parts = questionText.split(optionSplitRegex);
    
    // If we successfully split it
    if (parts.length > 2) {
        questionText = parts[0].trim();
        for (let i = 1; i < parts.length; i++) {
            if (parts[i].trim()) options.push(parts[i].trim());
        }
    }

    return { question: questionText, options: options };
  };

  const renderContent = () => {
    // 1. Image / Infographic
    if (result.imageUrl) {
      return (
        <div className="flex flex-col items-center">
            <img src={result.imageUrl} alt="Generated Infographic" className="rounded-xl shadow-lg max-w-full mb-6 border border-gray-200" />
            <div className="prose prose-blue max-w-none text-gray-700 bg-gray-50 p-6 rounded-xl w-full">
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
            </div>
        </div>
      );
    }

    // 2. Interactive Interactive Quiz / Flashcards
    if (result.type === AnalysisType.QUIZ || result.type === AnalysisType.FLASHCARDS) {
        const rawData = cleanAndParseJson(result.content);
            
        if (rawData && Array.isArray(rawData)) {
            if (result.type === AnalysisType.QUIZ) {
                return (
                    <div className="space-y-6">
                        {rawData.map((rawQ: any, i: number) => {
                            // Apply fallback extraction in case model failed structure
                            const { question, options } = extractOptionsFromQuestion(rawQ);
                            const correctAnswer = rawQ.correctAnswer || "";
                            
                            const userAnswer = userSelections[i];
                            const hasAnswered = userAnswer !== undefined;

                            return (
                                <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                                        <div className="flex gap-4 items-start">
                                            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm shadow-sm mt-0.5">
                                                {i + 1}
                                            </span>
                                            <div className="font-semibold text-gray-800 text-lg leading-snug">
                                                <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} /> }}>
                                                    {question || "Question missing"}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        {options && options.length > 0 ? (
                                            options.map((opt: string, j: number) => {
                                                // If we had to extract options manually, we might not know the correct answer string perfectly.
                                                // So we check if the correct answer string contains the option, or vice versa.
                                                const isCorrect = correctAnswer === opt || (correctAnswer.length < 5 && opt.startsWith(correctAnswer));
                                                
                                                // If we tracked selection
                                                const isSelected = userAnswer === opt;
                                                
                                                // Determine style based on state
                                                let containerClass = "bg-white border-gray-100 text-gray-600 hover:bg-gray-50 cursor-pointer";
                                                let icon = null;

                                                if (hasAnswered) {
                                                    if (isCorrect) {
                                                        containerClass = "bg-green-50 border-green-200 text-green-900 shadow-sm";
                                                        icon = <CheckCircle size={16} className="text-green-600" />;
                                                    } else if (isSelected) {
                                                        containerClass = "bg-red-50 border-red-200 text-red-900";
                                                        icon = <XCircle size={16} className="text-red-500" />;
                                                    } else {
                                                        containerClass = "opacity-50 bg-gray-50 border-gray-100";
                                                    }
                                                }

                                                return (
                                                    <div 
                                                        key={j} 
                                                        onClick={() => !hasAnswered && setUserSelections(prev => ({...prev, [i]: opt}))}
                                                        className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${containerClass}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                                hasAnswered && (isCorrect || isSelected) ? 'border-transparent' : 'border-gray-300'
                                                            }`}>
                                                                {icon ? icon : (isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />)}
                                                            </div>
                                                            <span className="font-medium leading-snug">
                                                                <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} /> }}>
                                                                    {opt}
                                                                </ReactMarkdown>
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex items-center text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                                                <AlertCircle size={16} className="mr-2"/>
                                                Unable to load options for this question. The model may have returned a summary instead of a test.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }

            if (result.type === AnalysisType.FLASHCARDS) {
                 return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {rawData.map((card: any, i: number) => (
                            <div key={i} className="group min-h-[220px]">
                                <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between h-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
                                    
                                    <div className="mb-4 pb-4 border-b border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question / Term</span>
                                            <span className="text-xs font-bold text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">#{i + 1}</span>
                                        </div>
                                        <h4 className="font-bold text-xl text-gray-900 leading-snug">
                                            <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} /> }}>
                                                {card.front}
                                            </ReactMarkdown>
                                        </h4>
                                    </div>
                                    <div>
                                         <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2 block opacity-80">Answer / Definition</span>
                                        <div className="text-gray-700 leading-relaxed">
                                            <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} /> }}>
                                                {card.back}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
        } else {
             // Fallback if parsing failed
             return (
                <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 flex items-start">
                         <AlertCircle className="flex-shrink-0 mt-0.5 mr-3" size={20} />
                         <div>
                             <h4 className="font-bold text-sm uppercase tracking-wide mb-1">Display Warning</h4>
                             <p className="text-sm">We couldn't automatically format this interactive content. The raw output is displayed below.</p>
                         </div>
                    </div>
                    <div className="prose prose-slate prose-lg max-w-none text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result.content}
                        </ReactMarkdown>
                    </div>
                </div>
             );
        }
    }

    // 3. Default Text / Markdown Rendering
    return (
        <div className="prose prose-slate prose-lg max-w-none text-gray-700">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-extrabold text-gray-900 mb-6 pb-4 border-b border-gray-200" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 leading-7 text-gray-700" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2 marker:text-primary" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2 marker:text-primary font-medium" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/30 pl-4 italic text-gray-600 my-6 bg-gray-50 py-2 pr-2 rounded-r" {...props} />,
                    code: ({node, ...props}) => <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200" {...props} />,
                    pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-4 rounded-xl overflow-x-auto mb-6" {...props} />,
                    table: ({node, ...props}) => <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 shadow-sm"><table className="min-w-full divide-y divide-gray-200" {...props} /></div>,
                    thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                    tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
                    tr: ({node, ...props}) => <tr className="hover:bg-gray-50/50 transition-colors" {...props} />,
                    th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200" {...props} />,
                    td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-gray-700 align-top leading-relaxed border-b border-gray-100 min-w-[140px]" {...props} />,
                }}
            >
                {result.content}
            </ReactMarkdown>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex-shrink-0 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                {result.type}
            </span>
            <h2 className="text-xl font-bold text-gray-800 truncate" title={result.title}>{result.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleCopy} className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-colors" title="Copy Content">
                <Copy size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Close">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="overflow-y-auto p-6 md:p-10 bg-surface">
          {renderContent()}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-3">
             <button onClick={onClose} className="order-2 sm:order-1 px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">
                Close
            </button>
            <div className="order-1 sm:order-2 flex gap-2">
                <button 
                    onClick={handleExportPdf}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 transform active:scale-95"
                >
                    <Download size={18} /> Export as PDF
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;