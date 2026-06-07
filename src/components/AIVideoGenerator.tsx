import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, 
  Sparkles, 
  Loader2, 
  Plus, 
  X, 
  Wand2,
  Play,
  Settings2
} from 'lucide-react';
import { generateVideo, enhancePrompt } from '../services/geminiService';

interface AIVideoGeneratorProps {
  onInsert: (videoUrl: string) => void;
  onClose: () => void;
}

export default function AIVideoGenerator({ onInsert, onClose }: AIVideoGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('veo-3.1-generate-preview');

  const models = [
    { id: 'veo-3.1-generate-preview', name: 'Veo3', description: 'Cinematic 4K quality' },
    { id: 'veo-3.1-lite-generate-preview', name: 'Veo3 Lite', description: 'Fast 1080p generation' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const url = await generateVideo(prompt, selectedModel);
      setVideoUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt, 'video');
      setPrompt(enhanced);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Film size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI Video Studio</h2>
              <p className="text-xs text-slate-500 font-medium">Create cinematic moments for your document</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Film size={16} className="text-indigo-500" />
              AI Model
            </label>
            <div className="flex gap-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`flex-1 p-3 rounded-2xl border text-left transition-all ${
                    selectedModel === model.id
                      ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${selectedModel === model.id ? 'text-indigo-700' : 'text-slate-900'}`}>{model.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{model.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Settings2 size={16} className="text-indigo-500" />
              Describe your video
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: A futuristic city in the clouds with flying vehicles, 4k, cinematic lighting..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none font-medium leading-relaxed"
              />
              <button
                onClick={handleEnhance}
                disabled={!prompt.trim() || isEnhancing || isGenerating}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm disabled:opacity-50"
              >
                {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isEnhancing ? 'Enhancing...' : 'Magic Enhance'}
              </button>
            </div>
            
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Examples</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Cinematic drone shot of an ancient mountain temple at sunrise",
                  "A futuristic self-driving car navigating neon-lit city streets",
                  "Macro shot of coffee brewing with elegant steam rising",
                  "3D animation of a data network expanding across a globe"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    className="px-3 py-1.5 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold rounded-lg transition-colors border border-indigo-100"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {videoUrl ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="relative group rounded-2xl overflow-hidden bg-black aspect-video shadow-xl border border-slate-200">
                  <video 
                    src={videoUrl} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setVideoUrl(null); }}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Try Another
                  </button>
                  <button
                    onClick={() => onInsert(videoUrl)}
                    className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    <Plus size={18} />
                    Insert into Document
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50"
              >
                {!isGenerating ? (
                  <>
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                      <Play size={24} />
                    </div>
                    <p className="text-slate-500 font-medium mb-6">Your generated clip will appear here</p>
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || isGenerating}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 group disabled:opacity-50"
                    >
                      <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                      Create Video
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-pulse" />
                      <Loader2 size={32} className="absolute inset-0 m-auto animate-spin text-indigo-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">Crafting your masterpiece...</p>
                      <p className="text-sm text-slate-500">This may take up to a minute</p>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="mt-4 px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Powered by SmartTech Veo-3.1 AI
          </p>
        </div>
      </motion.div>
    </div>
  );
}
