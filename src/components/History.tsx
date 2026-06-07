import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Clock, 
  ChevronRight, 
  History as HistoryIcon, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  CheckSquare, 
  Square,
  Download,
  X
} from 'lucide-react';
import { ConversionRecord } from '../services/firebaseService';

interface HistoryProps {
  records: ConversionRecord[];
  onSelect: (record: ConversionRecord) => void;
  onDelete: (id: string) => void;
  onBatchExport: (records: ConversionRecord[]) => void;
  onClose: () => void;
}

export default function History({ records, onSelect, onDelete, onBatchExport, onClose }: HistoryProps) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchExport = () => {
    const selectedRecords = records.filter(r => r.id && selectedIds.includes(r.id));
    onBatchExport(selectedRecords);
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const selectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map(r => r.id!).filter(Boolean));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
    >
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <HistoryIcon size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Recent Activity</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isSelectMode ? `${selectedIds.length} items selected` : 'Syncing with Cloud'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <button 
              aria-label={isSelectMode ? "Cancel Selection" : "Select Multiple"}
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
              }}
              className={`p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${isSelectMode ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
              title={isSelectMode ? "Cancel Selection" : "Select Multiple"}
            >
              {isSelectMode ? <X size={20} /> : <CheckSquare size={20} />}
            </button>
          )}
          <button 
            aria-label="Close history"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSelectMode && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between overflow-hidden"
          >
            <button 
              onClick={selectAll}
              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-blue-600 min-h-[44px] px-2"
            >
              {selectedIds.length === records.length ? 'Deselect All' : 'Select All'}
            </button>
            <button 
              disabled={selectedIds.length === 0}
              onClick={handleBatchExport}
              className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              <Download size={14} />
              Export Selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {records.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <HistoryIcon size={24} className="text-slate-200" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">No history found</p>
          </div>
        ) : (
          records.map((record) => (
            <motion.div
              key={record.id}
              whileHover={{ x: 4 }}
              onClick={() => isSelectMode ? toggleSelect(record.id!) : onSelect(record)}
              className={`p-3 rounded-xl border transition-all group relative cursor-pointer ${
                isSelectMode && selectedIds.includes(record.id!)
                  ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/10'
                  : 'border-slate-100 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {isSelectMode ? (
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    selectedIds.includes(record.id!) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'
                  }`}>
                    {selectedIds.includes(record.id!) && <CheckCircle2 size={12} />}
                  </div>
                ) : (
                  <div className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-[10px] transition-colors ${
                    record.status === 'draft' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {record.status === 'draft' ? <Edit3 size={14} /> : 'PDF'}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 truncate text-xs">
                      {record.fileName}{record.status === 'completed' && '.pdf'}
                    </h4>
                    {record.status === 'draft' && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-bold uppercase rounded border border-amber-100">Draft</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>
                      {record.updatedAt?.toDate 
                        ? new Date(record.updatedAt.toDate()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                        : 'Just now'}
                    </span>
                  </div>
                </div>
                {!isSelectMode && (
                  <div className="flex items-center gap-1">
                    <button 
                      aria-label="Delete history record"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (record.id) onDelete(record.id);
                      }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

