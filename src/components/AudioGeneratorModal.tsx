import React, { useState } from 'react';
import { Mic, Loader2, X, Play, Download } from 'lucide-react';
import { generateAudio } from '../services/geminiService';

interface AudioGeneratorProps {
  onClose: () => void;
  initialText?: string;
}

export default function AudioGeneratorModal({ onClose, initialText = '' }: AudioGeneratorProps) {
  const [text, setText] = useState(initialText);
  const [speaker, setSpeaker] = useState<'lady' | 'male' | 'kid'>('lady');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    
    try {
      const url = await generateAudio(text, speaker);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Mic className="text-blue-600" size={20} />
            <h2>Egyptian Voiceover Generator</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Text to Speak</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text here... (Egyptian Arabic recommended)"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Voice</label>
            <div className="grid grid-cols-3 gap-3">
              {(['lady', 'male', 'kid'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSpeaker(s)}
                  className={`py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm capitalize ${
                    speaker === s 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-slate-100 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {audioUrl && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
              <audio src={audioUrl} controls className="w-full" autoPlay />
              <a 
                href={audioUrl} 
                download="voiceover.wav" 
                className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                <Download size={14} /> Download Audio
              </a>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Generating...
              </>
            ) : (
              <>
                <Mic size={18} />
                Generate Voiceover
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
