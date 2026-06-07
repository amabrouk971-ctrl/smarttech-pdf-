import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text as KonvaText, Transformer } from 'react-konva';
import useImage from 'use-image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Layers, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Image as ImageIcon, 
  Sparkles, 
  Trash2, 
  MoveUp, 
  MoveDown,
  Download,
  Plus,
  MousePointer2,
  Undo2,
  Redo2,
  Maximize2,
  Group,
  Ungroup,
  GripVertical
} from 'lucide-react';
import { magicDecompose, LayerObject, removeBackground } from '../services/geminiService';
import { Reorder } from 'motion/react';

// Helper to remove green screen from base64 image
async function removeGreenScreen(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Simple chroma key for green (#00FF00)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If green is significantly dominant, make it transparent
        if (g > 150 && r < 100 && b < 100) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = base64;
  });
}

interface DesignStudioProps {
  onInsert: (imageUrl: string) => void;
  onClose: () => void;
}

type ElementType = 'image' | 'rect' | 'circle' | 'text';

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  src?: string;
  text?: string;
  fontFamily?: string;
  rotation: number;
  zIndex: number;
  groupId?: string;
}

const SHAPES = [
  { type: 'rect', icon: <Square size={18} />, label: 'Rectangle' },
  { type: 'circle', icon: <CircleIcon size={18} />, label: 'Circle' },
  { type: 'text', icon: <Type size={18} />, label: 'Heading' },
];

export default function DesignStudio({ onInsert, onClose }: DesignStudioProps) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');

  const selectedElements = elements.filter(el => selectedIds.includes(el.id));
  const isMultiSelected = selectedIds.length > 1;

  const startEditingText = (id: string, currentText: string) => {
    setEditingTextId(id);
    setEditingTextValue(currentText);
  };

  const finishEditingText = () => {
    if (editingTextId) {
      setElements(elements.map(el => el.id === editingTextId ? { ...el, text: editingTextValue } : el));
      setEditingTextId(null);
    }
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (selectedIds.length > 0 && transformerRef.current) {
      const nodes = selectedIds.map(id => stageRef.current.findOne('#' + id)).filter(n => !!n);
      if (nodes.length > 0) {
        transformerRef.current.nodes(nodes);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedIds]);

  const addElement = (type: ElementType) => {
    const newElement: CanvasElement = {
      id: `el-${Date.now()}`,
      type,
      x: stageSize.width / 2 - 50,
      y: stageSize.height / 2 - 50,
      width: 100,
      height: 100,
      fill: type === 'text' ? '#000000' : '#4f46e5',
      rotation: 0,
      zIndex: elements.length,
      text: type === 'text' ? 'Double click to edit' : undefined,
      fontFamily: type === 'text' ? 'Plus Jakarta Sans' : undefined
    };
    setElements([...elements, newElement]);
    setSelectedIds([newElement.id]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(stageSize.width * 0.5 / img.width, stageSize.height * 0.5 / img.height);
          const newEl: CanvasElement = {
            id: `el-${Date.now()}`,
            type: 'image',
            src,
            x: stageSize.width / 2 - (img.width * ratio) / 2,
            y: stageSize.height / 2 - (img.height * ratio) / 2,
            width: img.width * ratio,
            height: img.height * ratio,
            rotation: 0,
            zIndex: elements.length
          };
          setElements([...elements, newEl]);
          setSelectedIds([newEl.id]);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = async () => {
    if (selectedIds.length !== 1) return;
    const selected = elements.find(el => el.id === selectedIds[0]);
    if (!selected || selected.type !== 'image' || !selected.src) return;

    setIsProcessing(true);
    try {
      // Isolate the main subject automatically
      const isolatedBase64 = await removeBackground(selected.src, "main subject");
      const finalSrc = await removeGreenScreen(isolatedBase64);

      setElements(prev => prev.map(el => el.id === selectedIds[0] ? { ...el, src: finalSrc } : el));
    } catch (err) {
      console.error("Remove background error:", err);
      alert("Failed to remove background. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMagicLayers = async () => {
    if (selectedIds.length !== 1) return;
    const selected = elements.find(el => el.id === selectedIds[0]);
    if (!selected || selected.type !== 'image' || !selected.src) return;

    setIsProcessing(true);
    try {
      const rawLayers = await magicDecompose(selected.src);
      
      const originalImg = new Image();
      originalImg.src = selected.src;
      await new Promise(resolve => originalImg.onload = resolve);

      const newLayers: CanvasElement[] = [];

      for (const [index, layer] of rawLayers.entries()) {
        const [ymin, xmin, ymax, xmax] = layer.box_2d;
        
        const cropX = (xmin / 1000) * originalImg.width;
        const cropY = (ymin / 1000) * originalImg.height;
        const cropW = ((xmax - xmin) / 1000) * originalImg.width;
        const cropH = ((ymax - ymin) / 1000) * originalImg.height;

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(originalImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const croppedSrc = canvas.toDataURL('image/png');
          
          let finalSrc = croppedSrc;
          try {
            // Try to remove background for each layer using Gemini's extract capability
            const isolatedBase64 = await removeBackground(croppedSrc, layer.label);
            finalSrc = await removeGreenScreen(isolatedBase64);
          } catch (bgErr) {
            console.warn("Background removal failed for layer:", layer.label, bgErr);
            // Fallback to crop if bg removal fails
          }
          
          newLayers.push({
            id: `el-layer-${Date.now()}-${index}`,
            type: 'image',
            src: finalSrc,
            x: selected.x + (xmin / 1000) * selected.width,
            y: selected.y + (ymin / 1000) * selected.height,
            width: ((xmax - xmin) / 1000) * selected.width,
            height: ((ymax - ymin) / 1000) * selected.height,
            rotation: 0,
            zIndex: elements.length + index
          });
        }
      }

      setElements(prev => [...prev.map(el => el.id === selectedIds[0] ? { ...el, zIndex: -1 } : el), ...newLayers]);
      setSelectedIds(newLayers.map(l => l.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteSelected = () => {
    setElements(elements.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  };

  const moveLayer = (direction: 'up' | 'down') => {
    if (selectedIds.length !== 1) return;
    const selectedId = selectedIds[0];
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex(el => el.id === selectedId);
    
    if (direction === 'up' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const current = sorted[index];
      const temp = next.zIndex;
      next.zIndex = current.zIndex;
      current.zIndex = temp;
    } else if (direction === 'down' && index > 0) {
      const prev = sorted[index - 1];
      const current = sorted[index];
      const temp = prev.zIndex;
      prev.zIndex = current.zIndex;
      current.zIndex = temp;
    }
    setElements([...sorted]);
  };

  const handleGroup = () => {
    if (selectedIds.length < 2) return;
    const gid = `group-${Date.now()}`;
    setElements(elements.map(el => 
      selectedIds.includes(el.id) ? { ...el, groupId: gid } : el
    ));
    setSelectedIds([]); // Select the group? Actually we handle selection by children
  };

  const handleUngroup = () => {
    const groupIds = new Set(selectedElements.map(el => el.groupId).filter(Boolean));
    setElements(elements.map(el => 
      el.groupId && groupIds.has(el.groupId) ? { ...el, groupId: undefined } : el
    ));
  };

  const reorderLayers = (newOrder: CanvasElement[]) => {
    const updated = newOrder.map((el, i) => ({
      ...el,
      zIndex: newOrder.length - 1 - i
    }));
    setElements(updated);
  };

  const handleExport = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      onInsert(uri);
    }
  };

  const fonts = [
    'Plus Jakarta Sans',
    'Inter',
    'Space Grotesk',
    'Playfair Display',
    'JetBrains Mono'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full h-full flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header - Canva Style */}
        <div className="bg-white h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Magic Design Studio</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded w-fit">Draft Pro 2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button className="p-1 px-2 hover:bg-white rounded transition-all text-slate-400 cursor-not-allowed"><Undo2 size={16} /></button>
              <button className="p-1 px-2 hover:bg-white rounded transition-all text-slate-400 cursor-not-allowed"><Redo2 size={16} /></button>
            </div>
            <button 
              onClick={handleExport}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
            >
              <Download size={14} />
              Insert to Doc
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          {/* Sidebar - Tools */}
          <div className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 gap-6 shrink-0">
            <label className="sidebar-btn group cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all group-active:scale-90">
                <ImageIcon size={22} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Upload</span>
            </label>

            {SHAPES.map(shape => (
              <button key={shape.type} onClick={() => addElement(shape.type as any)} className="sidebar-btn group flex flex-col items-center">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all group-active:scale-90">
                  {shape.icon}
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">{shape.label}</span>
              </button>
            ))}
          </div>

          {/* Main Canvas Workspace */}
          <div className="flex-1 relative flex flex-col" ref={containerRef}>
             {/* Toolbar Overlay */}
            {selectedIds.length > 0 && (
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white shadow-xl border border-slate-100 rounded-2xl px-6 py-2.5 flex items-center gap-6"
              >
                {selectedIds.length === 1 && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Arrange</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveLayer('up')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><MoveUp size={14} /></button>
                        <button onClick={() => moveLayer('down')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><MoveDown size={14} /></button>
                      </div>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                  </>
                )}

                {isMultiSelected && (
                  <>
                    <button 
                      onClick={handleGroup}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      <Group size={14} />
                      Group
                    </button>
                    <div className="w-px h-6 bg-slate-100" />
                  </>
                )}

                {selectedElements.some(el => el.groupId) && (
                   <>
                    <button 
                      onClick={handleUngroup}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      <Ungroup size={14} />
                      Ungroup
                    </button>
                    <div className="w-px h-6 bg-slate-100" />
                  </>
                )}

                {selectedIds.length === 1 && selectedElements[0].type !== 'image' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Color</span>
                    <div className="flex gap-1">
                      {['#000000', '#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map(color => (
                        <button 
                          key={color}
                          onClick={() => {
                            setElements(elements.map(el => el.id === selectedIds[0] ? { ...el, fill: color } : el));
                          }}
                          className={`w-5 h-5 rounded-full border border-slate-200 transition-transform active:scale-90 ${selectedElements[0].fill === color ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedIds.length === 1 && selectedElements[0].type === 'text' && (
                  <>
                    <div className="w-px h-6 bg-slate-100" />
                    <select 
                      value={selectedElements[0].fontFamily}
                      onChange={(e) => {
                        setElements(elements.map(el => el.id === selectedIds[0] ? { ...el, fontFamily: e.target.value } : el));
                      }}
                      className="text-[10px] font-bold bg-slate-50 border-none rounded-lg px-2 py-1 outline-none cursor-pointer"
                    >
                      {fonts.map(font => (
                        <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                      ))}
                    </select>
                  </>
                )}

                {selectedIds.length === 1 && selectedElements[0].type === 'image' && (
                  <button 
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={14} className={isProcessing ? 'animate-spin' : ''} />
                    {isProcessing ? 'Removing...' : 'Remove Background'}
                  </button>
                )}

                {selectedIds.length === 1 && selectedElements[0].type === 'image' && (
                   <>
                    <div className="w-px h-6 bg-slate-100" />
                    <button 
                      onClick={handleMagicLayers}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all disabled:opacity-50"
                    >
                      <Sparkles size={14} className={isProcessing ? 'animate-spin' : ''} />
                      {isProcessing ? 'Decomposing...' : 'Magic Layers'}
                    </button>
                  </>
                )}

                <div className="w-px h-6 bg-slate-100" />

                <button onClick={deleteSelected} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                  <Trash2 size={16} />
                </button>

                <div className="w-px h-6 bg-slate-100" />

                <button 
                  onClick={() => {
                    if (stageRef.current) {
                      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
                      const link = document.createElement('a');
                      link.download = `design-${Date.now()}.png`;
                      link.href = dataUrl;
                      link.click();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                  title="Download Design as PNG"
                >
                  <Download size={14} />
                  Export
                </button>
              </motion.div>
            )}

            <div className="flex-1 cursor-crosshair relative">
              <Stage 
                width={stageSize.width} 
                height={stageSize.height}
                ref={stageRef}
                onMouseDown={(e) => {
                  if (e.target === stageRef.current) {
                    setSelectedIds([]);
                    return;
                  }
                  
                  const id = e.target.id();
                  if (!id) return;

                  const isShift = e.evt.shiftKey || e.evt.metaKey;
                  if (isShift) {
                    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                  } else {
                    setSelectedIds([id]);
                  }
                }}
              >
                <Layer>
                  {elements.sort((a, b) => a.zIndex - b.zIndex).map((el) => (
                    <CanvasNode 
                      key={el.id} 
                      element={el} 
                      isSelected={selectedIds.includes(el.id)}
                      onSelect={() => {}} // Handled by Stage
                      onDblClick={() => {
                        if (el.type === 'text') {
                          startEditingText(el.id, el.text || '');
                        }
                      }}
                      onChange={(newAttrs) => {
                        setElements(elements.map(e => {
                          if (selectedIds.includes(e.id)) {
                             // If moving/resizing multiple, we need to apply delta
                             // For simplicity here, we use common onChange for single and basic for multi
                             return e.id === el.id ? { ...e, ...newAttrs } : e;
                          }
                          return e;
                        }));
                      }}
                    />
                  ))}
                  {selectedIds.length > 0 && <Transformer ref={transformerRef} borderDash={[3, 3]} />}
                </Layer>
              </Stage>

              {editingTextId && (
                <div 
                  className="absolute z-30"
                  style={{
                    left: elements.find(el => el.id === editingTextId)?.x,
                    top: (elements.find(el => el.id === editingTextId)?.y || 0) + 10,
                  }}
                >
                  <textarea
                    autoFocus
                    value={editingTextValue}
                    onChange={(e) => setEditingTextValue(e.target.value)}
                    onBlur={finishEditingText}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        finishEditingText();
                        e.preventDefault();
                      }
                    }}
                    className="bg-white/90 backdrop-blur-sm border-2 border-indigo-500 rounded p-1 text-xl font-bold shadow-2xl outline-none min-w-[200px] resize-none overflow-hidden"
                    style={{
                      width: elements.find(el => el.id === editingTextId)?.width,
                    }}
                  />
                </div>
              )}
            </div>

             {/* Canvas Footer */}
            <div className="absolute bottom-4 left-6 flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>{Math.round(stageSize.width)} x {Math.round(stageSize.height)} px</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>{elements.length} Layers</span>
            </div>
          </div>

          {/* Layers Panel - Desktop only */}
          <div className="w-72 bg-white border-l border-slate-100 hidden lg:flex flex-col shrink-0">
             <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Layers</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">{elements.length}</span>
                <Layers size={14} className="text-slate-400" />
              </div>
            </div>
            <Reorder.Group 
              axis="y" 
              values={[...elements].sort((a, b) => b.zIndex - a.zIndex)} 
              onReorder={reorderLayers}
              className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
            >
              {[...elements].sort((a, b) => b.zIndex - a.zIndex).map(el => (
                <Reorder.Item
                  key={el.id}
                  value={el}
                  className={`w-full p-3 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-grab active:cursor-grabbing ${
                    selectedIds.includes(el.id)
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                    : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'
                  }`}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      setSelectedIds(prev => prev.includes(el.id) ? prev.filter(i => i !== el.id) : [...prev, el.id]);
                    } else {
                      setSelectedIds([el.id]);
                    }
                  }}
                >
                  <div className="text-slate-300 cursor-grab">
                    <GripVertical size={14} />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                    {el.type === 'image' ? (
                      <ImageIcon size={16} />
                    ) : el.type === 'text' ? (
                      <Type size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase truncate">{el.text || el.id}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-bold text-slate-400 uppercase">{el.type}</span>
                      {el.groupId && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 rounded text-[8px] font-bold text-indigo-400 uppercase flex items-center gap-1">
                          <Group size={8} />
                          Grouped
                        </span>
                      )}
                    </div>
                  </div>
                </Reorder.Item>
              ))}
              {elements.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-8 mt-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Layers size={24} className="text-slate-400" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">No layers discovered</p>
                  <p className="text-[9px] mt-2 leading-relaxed">Add elements to start your creation</p>
                </div>
              )}
            </Reorder.Group>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CanvasNode({ element, isSelected, onSelect, onDblClick, onChange }: { 
  element: CanvasElement, 
  isSelected: boolean,
  onSelect: () => void,
  onDblClick: () => void,
  onChange: (newAttrs: any) => void
}) {
  const [img] = useImage(element.src || '');
  const shapeRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && shapeRef.current) {
      // Transformer is handled in Stage
    }
  }, [isSelected]);

  const commonProps = {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: onDblClick,
    onDblTap: onDblClick,
    onDragEnd: (e: any) => {
      onChange({
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    onTransformEnd: (e: any) => {
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation()
      });
    }
  };

  if (element.type === 'image') {
    return <KonvaImage {...commonProps} ref={shapeRef} image={img} />;
  }
  if (element.type === 'rect') {
    return <Rect {...commonProps} ref={shapeRef} fill={element.fill} cornerRadius={8} />;
  }
  if (element.type === 'circle') {
    return <Circle {...commonProps} ref={shapeRef} radius={element.width / 2} fill={element.fill} />;
  }
  if (element.type === 'text') {
    return (
      <KonvaText 
        {...commonProps} 
        ref={shapeRef} 
        text={element.text} 
        fontSize={24} 
        fontFamily={element.fontFamily || "Plus Jakarta Sans"} 
        fontStyle="bold"
        fill={element.fill}
      />
    );
  }
  return null;
}
