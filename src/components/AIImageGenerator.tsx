import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Plus, 
  X, 
  Wand2,
  RefreshCw,
  Settings2,
  Download
} from 'lucide-react';
import { generateImage, enhancePrompt } from '../services/geminiService';

interface AIImageGeneratorProps {
  onInsert: (imageUrl: string) => void;
  onClose: () => void;
}

export default function AIImageGenerator({ onInsert, onClose }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedModel, setSelectedModel] = useState('gemini-3-pro-image-preview');

  const models = [
    { id: 'gemini-3-pro-image-preview', name: 'NanoBanana-Pro', description: 'Highest quality, 4K support' },
    { id: 'gemini-2.5-flash-image', name: 'NanoBanana', description: 'Fast, efficient generation' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const url = await generateImage(prompt, aspectRatio, selectedModel);
      setImageUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt, 'image');
      setPrompt(enhanced);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `smarttech-ai-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI Image Studio</h2>
              <p className="text-xs text-slate-500 font-medium">Generate high-fidelity visuals from text</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Settings2 size={16} className="text-rose-500" />
              Image Description
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: A futuristic lab with holographic displays and researchers in white coats, hyper-realistic, 8k, soft lighting..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all resize-none font-medium leading-relaxed"
              />
              <button
                onClick={handleEnhance}
                disabled={!prompt.trim() || isEnhancing || isGenerating}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-rose-500 hover:text-rose-600 transition-all shadow-sm disabled:opacity-50"
              >
                {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
              </button>
            </div>
            
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Examples</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "A minimalist workspace with a laptop, plant, and sunlight, photorealistic",
                  "Abstract geometric shapes in vibrant blue and orange hues, 3d render",
                  "Corporate team collaborating around a modern glass table",
                  "A vintage typewriter with glowing futuristic neon keys"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    className="px-3 py-1.5 bg-rose-50/50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold rounded-lg transition-colors border border-rose-100/50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ImageIcon size={16} className="text-rose-500" />
                AI Model
              </label>
              <div className="flex gap-2">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`flex-1 p-3 rounded-2xl border text-left transition-all ${
                      selectedModel === model.id
                        ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-xs font-bold ${selectedModel === model.id ? 'text-rose-700' : 'text-slate-900'}`}>{model.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{model.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Settings2 size={16} className="text-rose-500" />
                Aspect Ratio
              </label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                {['1:1', '16:9', '4:3', '9:16'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {imageUrl ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={`relative group rounded-2xl overflow-hidden bg-slate-100 shadow-xl border border-slate-200 mx-auto transition-all duration-500 ${
                  aspectRatio === '16:9' ? 'aspect-video w-full' :
                  aspectRatio === '9:16' ? 'aspect-[9/16] h-[400px]' :
                  aspectRatio === '4:3' ? 'aspect-[4/3] w-full' :
                  'aspect-square w-full max-w-md'
                }`}>
                  <img 
                    src={imageUrl} 
                    alt="AI Generated" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                    <button 
                      onClick={handleDownload}
                      className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-lg text-white transition-colors"
                      title="Download Image"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setImageUrl(null); }}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Regenerate
                  </button>
                  <button
                    onClick={() => onInsert(imageUrl)}
                    className="flex-[2] py-3 px-4 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                  >
                    <Plus size={18} />
                    Insert Content
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
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-slate-500 font-medium mb-6">Your generated image will appear here</p>
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || isGenerating}
                      className="px-8 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center gap-2 group disabled:opacity-50"
                    >
                      <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                      Generate Vision
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-rose-100 rounded-full animate-pulse" />
                      <Loader2 size={32} className="absolute inset-0 m-auto animate-spin text-rose-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">Painting with neurons...</p>
                      <p className="text-sm text-slate-500">Bringing your imagination to life</p>
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
            SmartTech Imaging Engine v3.1
          </p>
        </div>
      </motion.div>
    </div>
  );
}
