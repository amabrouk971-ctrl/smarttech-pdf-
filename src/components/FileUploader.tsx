import React, { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  uploadError?: string | null;
}

export default function FileUploader({ onFileSelect, isLoading, uploadError }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const error = uploadError || localError;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateAndProcess = (file: File) => {
    // Only block completely unsupported things, but we'll allow images, pdfs, office docs
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && file.type) {
      setLocalError(`Unsupported file format: ${file.type || 'Unknown'}. Please upload a supported format such as PDF, JPEG, PNG, WEBP, or a Word document.`);
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setLocalError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size allowed is 50MB. Please select a smaller file.`);
      return;
    }

    setLocalError(null);
    onFileSelect(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative group h-64 border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center p-8 text-center
          ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-blue-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-400'}
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isLoading && inputRef.current?.click()}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          accept="*/*"
          onChange={handleChange}
          disabled={isLoading}
        />

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-bold text-slate-900 tracking-tight">AI is analyzing document...</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Smart processing in progress</p>
            </motion.div>
          ) : (
            <motion.div 
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="p-4 bg-blue-50 text-blue-500 rounded-xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Upload Any Document or Image</h3>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">Drag and drop your file here, or click to browse files</p>
              <div className="mt-6 flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Support for PDF, Images, Word &bull; max 50MB
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 overflow-hidden"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
