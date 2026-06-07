import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';

const Video = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: '100%',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)]
  },
})

import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Undo, 
  Redo,
  Wand2,
  Loader2,
  CheckCircle2,
  TableOfContents,
  Film,
  Image as ImageIcon,
  Plus,
  Crop as CropIcon,
  Sparkles,
  Layers,
  Mic,
  RectangleHorizontal,
  RectangleVertical,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { checkSpellingAndGrammar, enhanceDocument } from '../services/geminiService';
import AIVideoGenerator from './AIVideoGenerator';
import AIImageGenerator from './AIImageGenerator';
import PhotoEditor from './PhotoEditor';
import DesignStudio from './DesignStudio';
import AudioGeneratorModal from './AudioGeneratorModal';

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showVideoGen, setShowVideoGen] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [showDesignStudio, setShowDesignStudio] = useState(false);
  const [showAudioGenerator, setShowAudioGenerator] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [isEnhancingDoc, setIsEnhancingDoc] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageSize, setPageSize] = useState<'A4' | 'Custom'>('A4');
  const [customWidth, setCustomWidth] = useState(794);
  const [customHeight, setCustomHeight] = useState(1123);
  const [showPageSettings, setShowPageSettings] = useState(false);

  const getDimensions = () => {
    let w = customWidth;
    let h = customHeight;
    if (pageSize === 'A4') {
      w = 794;
      h = 1123;
    }
    if (orientation === 'landscape') {
      return { width: h, height: w };
    }
    return { width: w, height: h };
  };
  const dims = getDimensions();

  const [stats, setStats] = useState({ words: 0, characters: 0, paragraphs: 0 });

  const updateStats = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const paragraphs = html.split('</p>').length - 1;
    setStats({ words, characters: text.length, paragraphs });
  };

  const handleEnhanceDocument = async () => {
    if (!editor || isEnhancingDoc) return;
    setIsEnhancingDoc(true);
    try {
      const currentHtml = editor.getHTML();
      const enhancedHtml = await enhanceDocument(currentHtml);
      editor.commands.setContent(enhancedHtml);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to enhance document: " + err.message);
    } finally {
      setIsEnhancingDoc(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
      }),
      Video,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      updateStats(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-8 focus:outline-none min-h-[400px] max-w-none',
        spellcheck: 'true',
      },
    },
  });

  if (!editor) return null;

  const handleGenerateToC = () => {
    if (!editor) return;

    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2');

    if (headings.length === 0) return;

    let tocHtml = '<div class="toc bg-slate-50 p-4 rounded-xl mb-8 border border-slate-200"><h3>Table of Contents</h3><ul>';
    
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.setAttribute('id', id);
      
      const level = heading.tagName.toLowerCase() === 'h1' ? 'ml-0 font-bold' : 'ml-4';
      tocHtml += `<li class="${level} text-blue-600 hover:underline cursor-pointer"><a href="#${id}">${heading.textContent}</a></li>`;
    });
    
    tocHtml += '</ul></div>';
    
    editor.commands.setContent(doc.body.innerHTML);
    editor.commands.insertContentAt(0, tocHtml);
  };
  const handleSmartFix = async () => {
    
    try {
      setIsChecking(true);
      const currentHtml = editor.getHTML();
      const fixedHtml = await checkSpellingAndGrammar(currentHtml);
      
      editor.commands.setContent(fixedHtml);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Smart fix failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const MenuBar = () => {
    return (
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={<Bold size={16} />}
          label="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={<Italic size={16} />}
          label="Italic"
        />
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          icon={<Heading1 size={16} />}
          label="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          icon={<Heading2 size={16} />}
          label="Heading 2"
        />
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={<List size={16} />}
          label="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={<ListOrdered size={16} />}
          label="Ordered List"
        />
        
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={handleGenerateToC}
          active={false}
          icon={<TableOfContents size={16} />}
          label="Generate Table of Contents"
        />
        
        <button
          onClick={handleSmartFix}
          aria-label="AI Smart Fix - Grammar & Spelling"
          disabled={isChecking}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg min-h-[44px] text-[10px] font-bold uppercase tracking-widest transition-all
            ${showSuccess ? 'bg-green-600 text-white shadow-md' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200/50'}
            ${isChecking ? 'opacity-50 cursor-wait' : 'hover:-translate-y-0.5 active:scale-95'}
          `}
          title="AI Smart Fix - Grammar & Spelling"
        >
          {isChecking ? (
            <Loader2 size={12} className="animate-spin" />
          ) : showSuccess ? (
            <CheckCircle2 size={12} />
          ) : (
            <Wand2 size={12} />
          )}
          <span>{isChecking ? 'Checking...' : showSuccess ? 'Fixed!' : 'AI Smart Fix'}</span>
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={() => setShowVideoGen(true)}
          icon={<Film size={16} className="text-indigo-500" />}
          label="AI Video Gen"
        />
        <ToolbarButton
          onClick={() => setShowImageGen(true)}
          icon={<ImageIcon size={16} className="text-rose-500" />}
          label="AI Image Gen"
        />
        <ToolbarButton
          onClick={() => setShowAudioGenerator(true)}
          icon={<Mic size={16} className="text-pink-500" />}
          label="Voiceover Generator"
        />
        
        <label 
          className="p-1.5 hover:bg-slate-200 rounded-md transition-colors cursor-pointer text-slate-400 hover:text-slate-600 flex items-center justify-center min-h-[44px] min-w-[44px] relative" 
          title="Upload Local Photo"
          aria-label="Upload Local Photo"
        >
          <Plus size={14} className="absolute -top-0.5 -right-0.5 bg-white rounded-full border border-slate-200" />
          <ImageIcon size={16} />
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const url = event.target?.result as string;
                  editor.chain().focus().insertContent(`<img src="${url}" alt="Uploaded photo" />`).run();
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>

        <ToolbarButton
          onClick={() => {
            const attrs = editor.getAttributes('image');
            if (attrs.src) {
              setEditingImageUrl(attrs.src);
              setShowPhotoEditor(true);
            }
          }}
          active={editor.isActive('image')}
          icon={<CropIcon size={16} className="text-emerald-500" />}
          label="Edit Selected Photo"
        />

        <ToolbarButton
          onClick={() => {
            setShowDesignStudio(true);
          }}
          icon={<Layers size={16} className="text-purple-500" />}
          label="Open Design Studio"
        />

        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          aria-label="Magic One-Click Enhance"
          onClick={handleEnhanceDocument}
          disabled={isEnhancingDoc}
          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]`}
          title="Magic One-Click Enhance"
        >
          {isEnhancingDoc ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isEnhancingDoc ? 'Enhancing...' : 'Magic Enhance'}
        </button>

        <div className="flex-grow" />
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowPageSettings(!showPageSettings)}
            active={showPageSettings}
            icon={<Settings2 size={16} />}
            label="Page Size Settings"
          />
          <AnimatePresence>
            {showPageSettings && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-12 right-0 bg-white border border-slate-200 rounded-xl shadow-xl w-64 p-4 z-50 text-left"
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Preset Size</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setPageSize('A4')}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${pageSize === 'A4' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                      >A4</button>
                      <button 
                        onClick={() => setPageSize('Custom')}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${pageSize === 'Custom' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                      >Custom</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Orientation</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setOrientation('portrait')}
                        className={`flex-1 flex justify-center text-xs font-bold py-1.5 rounded-md transition-colors ${orientation === 'portrait' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                        title="Portrait"
                      ><RectangleVertical size={14}/></button>
                      <button 
                        onClick={() => setOrientation('landscape')}
                        className={`flex-1 flex justify-center text-xs font-bold py-1.5 rounded-md transition-colors ${orientation === 'landscape' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                        title="Landscape"
                      ><RectangleHorizontal size={14}/></button>
                    </div>
                  </div>
                  {pageSize === 'Custom' && (
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Width (px)</label>
                          <input 
                            type="number" 
                            className="w-full text-xs font-bold p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            value={customWidth} 
                            onChange={(e) => setCustomWidth(Math.max(100, parseInt(e.target.value) || 100))}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Height (px)</label>
                          <input 
                            type="number" 
                            className="w-full text-xs font-bold p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            value={customHeight} 
                            onChange={(e) => setCustomHeight(Math.max(100, parseInt(e.target.value) || 100))}
                          />
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          active={false}
          icon={<Undo size={16} />}
          label="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          active={false}
          icon={<Redo size={16} />}
          label="Redo"
        />
      </div>
    );
  };

  return (
    <div className="flex h-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0">
        <MenuBar />
        <div className="flex-1 overflow-y-auto bg-slate-50/30 relative">
          <div className="mx-auto py-12 px-4 sm:px-8 transition-all duration-500 ease-in-out flex justify-center" 
               style={{ width: '100%', minWidth: 'min-content' }}>
            <div 
              className="bg-white shadow-xl border border-slate-200 relative overflow-hidden ring-1 ring-slate-200/50 transition-all duration-500 ease-in-out shrink-0"
              style={{
                width: `${dims.width}px`,
                minHeight: `${dims.height}px`,
              }}
            >
               {/* Watermark/Branding */}
               <div className="absolute top-8 right-8 opacity-[0.03] pointer-events-none select-none">
                 <img src="/src/assets/images/smarttech_logo_1777234960969.png" alt="Branding" className="w-32" />
               </div>
               
               <div className="p-12 sm:p-20 sm:pt-24 min-h-full">
                 <EditorContent editor={editor} className="tiptap focus:outline-none" />
               </div>
            </div>
            
            {/* Document Footer Info */}
            <div className="mt-6 flex items-center justify-between px-4">
              <div className="flex gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Words</span>
                  <span className="text-sm font-black text-slate-900">{stats.words}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Characters</span>
                  <span className="text-sm font-black text-slate-900">{stats.characters}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paragraphs</span>
                  <span className="text-sm font-black text-slate-900">{stats.paragraphs}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Ready to Export
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showVideoGen && (
          <AIVideoGenerator 
            onInsert={(url) => {
              editor.commands.insertContent(`<video src="${url}" controls width="100%"></video>`);
              setShowVideoGen(false);
            }}
            onClose={() => setShowVideoGen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImageGen && (
          <AIImageGenerator 
            onInsert={(url) => {
              editor.commands.insertContent(`<img src="${url}" alt="AI Generated Image" />`);
              setShowImageGen(false);
            }}
            onClose={() => setShowImageGen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDesignStudio && (
          <DesignStudio 
            onInsert={(url) => {
              editor.chain().focus().insertContent(`<img src="${url}" alt="Studio Design" />`).run();
              setShowDesignStudio(false);
            }}
            onClose={() => setShowDesignStudio(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAudioGenerator && (
          <AudioGeneratorModal
            onClose={() => setShowAudioGenerator(false)}
            initialText={
              editor.state.selection.empty
                ? ''
                : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ')
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhotoEditor && editingImageUrl && (
          <PhotoEditor
            imageUrl={editingImageUrl}
            onSave={(newUrl) => {
              editor.chain().focus().updateAttributes('image', { src: newUrl }).run();
              setShowPhotoEditor(false);
              setEditingImageUrl(null);
            }}
            onClose={() => {
              setShowPhotoEditor(false);
              setEditingImageUrl(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ToolbarButton({ active = false, onClick, icon, label }: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
        active 
          ? 'bg-slate-900 text-white' 
          : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}
