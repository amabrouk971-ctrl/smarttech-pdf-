import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  MessageSquare,
  X,
  Sparkles,
  RefreshCcw,
  Image as ImageIcon,
  Film,
  Plus,
  Search,
  Globe,
  Zap
} from 'lucide-react';
import { getChatResponse, ChatMessage } from '../services/chatService';
import { generateImage, generateVideo, analyzeImage } from '../services/geminiService';

interface ChatAgentProps {
  documentContent: string;
  onApplyChange: (newContent: string) => void;
  onInsertContent: (content: string) => void;
  onClose?: () => void;
  initialInput?: string;
  analyzingImage?: string | null;
}

interface MessageWithSuggestion extends ChatMessage {
  suggestion?: string;
  asset?: {
    type: 'image' | 'video';
    url: string;
  };
}

export default function ChatAgent({ documentContent, onApplyChange, onInsertContent, onClose, initialInput = '', analyzingImage = null }: ChatAgentProps) {
  const [messages, setMessages] = useState<MessageWithSuggestion[]>([
    { role: 'model', text: "Hello! I'm your SmartTech Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId] = useState('gemini-3.1-pro-preview');
  const [enableGrounding, setEnableGrounding] = useState(false);
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialInput && !hasProcessedInitial) {
      setHasProcessedInitial(true);
      // Directly call handleSend logic for the initial input
      processMessage(initialInput);
    }
  }, [initialInput, hasProcessedInitial]);

  useEffect(() => {
    if (analyzingImage) {
      handleImageAnalysis(analyzingImage, "Analyze this image and describe it for the document.");
    }
  }, [analyzingImage]);

  const handleImageAnalysis = async (base64: string, prompt: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: prompt,
      asset: { type: 'image', url: base64 }
    }]);
    
    try {
      const description = await analyzeImage(prompt, base64);
      setMessages(prev => [...prev, { role: 'model', text: description }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error analyzing image: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        handleImageAnalysis(url, "Analyze this uploaded image.");
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const processMessage = async (userMessage: string) => {
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Logic to detect image/video generation keywords
      if (userMessage.toLowerCase().startsWith('generate image:') || userMessage.toLowerCase().startsWith('generate photo:')) {
        const prompt = userMessage.split(':')[1].trim();
        const imageUrl = await generateImage(prompt);
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: `I've generated this image for you based on "${prompt}":`, 
          asset: { type: 'image', url: imageUrl } 
        }]);
      } else if (userMessage.toLowerCase().startsWith('generate video:')) {
        const prompt = userMessage.split(':')[1].trim();
        const videoUrl = await generateVideo(prompt);
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: `I've generated this video for you based on "${prompt}":`, 
          asset: { type: 'video', url: videoUrl } 
        }]);
      } else {
        const response = await getChatResponse(userMessage, documentContent, messages, { modelId, enableGrounding });
        
        const suggestionMatch = response.match(/\[SUGGESTION\]([\s\S]*?)\[\/SUGGESTION\]/);
        let cleanText = response.replace(/\[SUGGESTION\][\s\S]*?\[\/SUGGESTION\]/, '').trim();
        
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: cleanText || "I've generated a suggestion for you. See below:", 
          suggestion: suggestionMatch ? suggestionMatch[1].trim() : undefined 
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}. Please try again.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    await processMessage(msg);
  };

  const handleRewrite = async (style: string) => {
    setInput(`Rewrite the whole document in a ${style} style.`);
  };

  const handleInsertAsset = (asset: { type: 'image' | 'video', url: string }) => {
    if (asset.type === 'image') {
      onInsertContent(`<img src="${asset.url}" alt="AI Generated Image" />`);
    } else {
      onInsertContent(`<video src="${asset.url}" controls width="100%"></video>`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full min-w-[320px]">
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">AI Assistant</h3>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button aria-label="Close Chat" onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2 shadow-sm relative z-10">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Zap size={12} className="text-amber-500" />
            Model
          </label>
          <select 
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded text-slate-700 px-2 py-1 outline-none focus:ring-2 ring-blue-500/20"
          >
            <option value="gemini-3.1-pro-preview">Pro (Best Quality)</option>
            <option value="gemini-3.1-flash-8b-preview">Flash 8B (Fastest)</option>
            <option value="gemini-3-flash-preview">Flash (Balanced)</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Globe size={12} className={enableGrounding ? "text-blue-500" : "text-slate-400"} />
            Web Grounding
          </label>
          <button 
            aria-label={enableGrounding ? "Disable web grounding" : "Enable web grounding"}
            onClick={() => setEnableGrounding(!enableGrounding)}
            className={`w-12 h-6 rounded-full relative transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] ${enableGrounding ? 'bg-blue-500' : 'bg-slate-200'}`}
          >
            <div className={`w-12 h-6 rounded-full relative transition-colors flexitems-center ${enableGrounding ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enableGrounding ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}>
                {m.text}
                
                {m.asset && (
                  <div className="mt-2 space-y-2">
                    {m.asset.type === 'image' ? (
                      <img src={m.asset.url} alt="Generated" className="rounded-lg w-full" />
                    ) : (
                      <video src={m.asset.url} controls className="rounded-lg w-full" />
                    )}
                    <button
                      onClick={() => handleInsertAsset(m.asset!)}
                      aria-label={`Insert ${m.asset!.type} into project`}
                      className="w-full py-2 min-h-[44px] bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-bold text-[10px] flex items-center justify-center gap-1"
                    >
                      <Plus size={12} />
                      Insert into project
                    </button>
                  </div>
                )}

                {m.suggestion && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      aria-label="Apply suggested changes"
                      onClick={() => onApplyChange(m.suggestion!)}
                      className="flex items-center gap-2 w-full px-3 py-2 min-h-[44px] bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-bold group/apply"
                    >
                      <RefreshCcw size={14} className="group-hover/apply:rotate-180 transition-transform duration-500" />
                      Apply changes to document
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex flex-wrap gap-2 mb-3 max-h-24 overflow-y-auto custom-scrollbar">
          <QuickAction 
            icon={<Sparkles size={12} />} 
            label="Gen Photo" 
            onClick={() => setInput("Generate image: ")} 
          />
          <QuickAction 
            icon={<Film size={12} />} 
            label="Gen Video" 
            onClick={() => setInput("Generate video: ")} 
          />
          <QuickAction 
            icon={<Search size={12} />} 
            label="Analyze Image" 
            onClick={() => fileInputRef.current?.click()} 
          />
          <QuickAction 
            icon={<RefreshCcw size={12} />} 
            label="Rewrite Formal" 
            onClick={() => handleRewrite('professional and formal')} 
          />
          <QuickAction 
            icon={<RefreshCcw size={12} />} 
            label="Summarize" 
            onClick={() => setInput('Summarize this document into 3 key bullet points.')} 
          />
          <QuickAction 
            icon={<RefreshCcw size={12} />} 
            label="Translate to FR" 
            onClick={() => setInput('Translate this document perfectly to French.')} 
          />
          <QuickAction 
            icon={<RefreshCcw size={12} />} 
            label="Expand text" 
            onClick={() => setInput('Expand on the current topic with more details and examples.')} 
          />
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
        </div>
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything..."
            className="w-full pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-20"
          />
          <button 
            aria-label="Send Message"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      aria-label={label}
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1.5 min-h-[44px] bg-slate-50 border border-slate-100 rounded-lg text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all text-left"
    >
      {icon}
      <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
    </button>
  );
}
