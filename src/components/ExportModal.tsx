import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  FileText, 
  FileImage, 
  FileIcon as FilePdf, 
  Monitor, 
  Layout, 
  FileBox,
  Check,
  Settings,
  Eye,
  Loader2
} from 'lucide-react';
import { ExportFormat, ExportOptions, exportContent } from '../services/exportService';

interface ExportModalProps {
  onClose: () => void;
  fileName: string;
  content: string;
  elementRef?: HTMLElement;
}

const FORMATS: { id: ExportFormat, name: string, icon: any, color: string, description: string }[] = [
  { id: 'pdf', name: 'PDF Document', icon: FilePdf, color: 'text-red-500 bg-red-50', description: 'Best for sharing and printing' },
  { id: 'docx', name: 'Word Document', icon: FileText, color: 'text-blue-500 bg-blue-50', description: 'Fully editable in Microsoft Word' },
  { id: 'pptx', name: 'PowerPoint', icon: Monitor, color: 'text-orange-500 bg-orange-50', description: 'Convert sections to slides' },
  { id: 'png', name: 'PNG Image', icon: FileImage, color: 'text-emerald-500 bg-emerald-50', description: 'High quality lossless image' },
  { id: 'jpeg', name: 'JPEG Image', icon: FileImage, color: 'text-indigo-500 bg-indigo-50', description: 'Compressed web-friendly image' },
];

export default function ExportModal({ onClose, fileName, content, elementRef }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportName, setExportName] = useState(fileName);
  const [quality, setQuality] = useState(0.9);
  const [resolution, setResolution] = useState(2);
  const [isExporting, setIsExporting] = useState(false);
  const [stage, setStage] = useState<'options' | 'success'>('options');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportContent(content, {
        fileName: exportName,
        format: selectedFormat,
        quality,
        resolution
      }, elementRef);
      setStage('success');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Download size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Export Document</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select format and settings</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {stage === 'options' ? (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* Filename Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">File Name</label>
                  <input 
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter file name..."
                  />
                </div>

                {/* Format Grid */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Format</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FORMATS.map((f) => {
                      const Icon = f.icon;
                      const isSelected = selectedFormat === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFormat(f.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50/50' 
                              : 'border-slate-100 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${f.color}`}>
                            <Icon size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm">{f.name}</h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{f.description}</p>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">
                              <Check size={14} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Settings size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest">Advanced Settings</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                         Quality
                         <span className="text-blue-600">{Math.round(quality * 100)}%</span>
                       </label>
                       <input 
                         type="range" 
                         min="0.1" 
                         max="1" 
                         step="0.1" 
                         value={quality}
                         onChange={(e) => setQuality(parseFloat(e.target.value))}
                         className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                         Resolution
                         <span className="text-blue-600">{resolution}x Scale</span>
                       </label>
                       <input 
                         type="range" 
                         min="1" 
                         max="4" 
                         step="1" 
                         value={resolution}
                         onChange={(e) => setResolution(parseInt(e.target.value))}
                         className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        Export Now
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-bounce">
                  <Check size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Export Complete!</h3>
                  <p className="text-slate-400 font-medium">Your file has been downloaded successfully.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
