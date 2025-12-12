import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithGemini } from '../services/geminiService';

interface ChatBotProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onToggle }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Hi! I can help you analyze content or answer questions. Ask me anything!' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Transform history for API
      const historyForApi = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));
      
      const response = await chatWithGemini(historyForApi, userMsg);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Desktop Button */}
      <button
        onClick={() => onToggle(true)}
        className={`fixed bottom-24 md:bottom-6 right-6 p-4 rounded-full bg-secondary text-white shadow-2xl hover:scale-110 transition-all z-40 ${isOpen ? 'hidden' : 'hidden md:flex'}`}
      >
        <MessageCircle size={28} />
      </button>

      {isOpen && (
        <div className="fixed bottom-0 md:bottom-6 right-0 md:right-6 w-full md:w-[400px] h-[calc(100vh-64px)] md:h-[600px] md:max-h-[80vh] bg-white md:rounded-2xl shadow-2xl flex flex-col z-50 animate-scale-up border-t md:border border-gray-200 mb-[64px] md:mb-0">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-secondary to-primary md:rounded-t-2xl flex justify-between items-center text-white flex-shrink-0">
            <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    <Sparkles size={18} />
                </div>
                <span className="font-bold text-lg">AI Assistant</span>
            </div>
            <button onClick={() => onToggle(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
              <X size={22} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                  {msg.role === 'model' ? (
                      <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.text}
                          </ReactMarkdown>
                      </div>
                  ) : (
                      msg.text
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100 bg-white md:rounded-b-2xl flex-shrink-0">
            <div className="flex gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                className="flex-1 p-3.5 bg-gray-50 rounded-xl outline-none border border-gray-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all text-sm text-gray-800 placeholder:text-gray-400"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-3.5 bg-gradient-to-r from-secondary to-primary text-white rounded-xl hover:shadow-lg hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;