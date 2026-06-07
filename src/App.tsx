import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  RefreshCcw, 
  ArrowLeft, 
  Settings,
  Sparkles,
  Github,
  LogIn,
  LogOut,
  User as UserIcon,
  History as HistoryIcon,
  Archive,
  Save,
  Check,
  AlertCircle,
  Send,
  Image as ImageIcon,
  Film,
  Loader2,
  Bot
} from 'lucide-react';
import FileUploader from './components/FileUploader';
import Editor from './components/Editor';
import ChatAgent from './components/ChatAgent';
import History from './components/History';
import ExportModal from './components/ExportModal';
import ProfileModal from './components/ProfileModal';
import { convertDocumentToHtml, generateDocument } from './services/geminiService';
import { exportToDocx } from './lib/docxExporter';
import { auth, googleProvider, signInWithPopup, signOut } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  saveConversion, 
  getHistory, 
  ConversionRecord, 
  updateConversion, 
  deleteConversion,
  getUserPreferences,
  updateUserPreferences,
  UserPreferences,
  testConnection
} from './services/firebaseService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { TEMPLATES, Template } from './templates';
import { 
  Briefcase, 
  User as UserTemplateIcon, 
  Newspaper, 
  FileText as FileTextIcon,
  GraduationCap,
  Scale,
  Receipt,
  FileCode2,
  Target
} from 'lucide-react';

const TemplateIconMap: Record<string, any> = {
  'FileText': FileTextIcon,
  'User': UserTemplateIcon,
  'Briefcase': Briefcase,
  'Newspaper': Newspaper,
  'GraduationCap': GraduationCap,
  'Scale': Scale,
  'Receipt': Receipt,
  'FileCode2': FileCode2,
  'Target': Target
};

// Utility to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read the file data. The file might be corrupted or inaccessible."));
  });
};

export default function App() {
  const [stage, setStage] = useState<'upload' | 'edit'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [content, setContent] = useState<string>(() => {
    return localStorage.getItem('docu_morph_draft_content') || '';
  });
  const [fileName, setFileName] = useState<string>(() => {
    return localStorage.getItem('docu_morph_draft_filename') || '';
  });
  const [user, setUser] = useState<User | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const [recentProjects, setRecentProjects] = useState<ConversionRecord[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [batchToExport, setBatchToExport] = useState<ConversionRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ maxRecentProjects: 5 });
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(() => {
    return localStorage.getItem('docu_morph_draft_id') || null;
  });

  const [homePrompt, setHomePrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);

  const [showAppChat, setShowAppChat] = useState(true);

  useEffect(() => {
    testConnection();
    if (content || fileName) {
      setStage('edit');
    }
  }, []);

  useEffect(() => {
    if (stage === 'edit') {
      localStorage.setItem('docu_morph_draft_content', content);
      localStorage.setItem('docu_morph_draft_filename', fileName);
      if (currentDocId) {
        localStorage.setItem('docu_morph_draft_id', currentDocId);
      }
    } else {
      localStorage.removeItem('docu_morph_draft_content');
      localStorage.removeItem('docu_morph_draft_filename');
      localStorage.removeItem('docu_morph_draft_id');
    }
  }, [content, fileName, currentDocId, stage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const prefs = await getUserPreferences();
        setPreferences(prefs);
        fetchHistory();
      } else {
        setHistory([]);
        setRecentProjects([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (stage === 'edit' && user && currentDocId && content) {
      const timer = setTimeout(() => {
        handleSaveDraft();
      }, 5000); // Auto-save after 5 seconds of inactivity
      return () => clearTimeout(timer);
    }
  }, [content, stage, user, currentDocId]);

  const fetchHistory = async () => {
    const records = await getHistory();
    setHistory(records);
    setRecentProjects(records.slice(0, preferences.maxRecentProjects));
  };

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStage('upload');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setIsProcessing(true);
      setUploadError(null);
      const name = file.name.replace('.pdf', '').replace(/\.[^/.]+$/, "");
      setFileName(name);
      
      const base64 = await fileToBase64(file);
      const htmlResult = await convertDocumentToHtml(base64, file.type, selectedTemplate.id === 'standard' ? undefined : selectedTemplate.prompt);
      
      setContent(htmlResult);
      setStage('edit');

      if (user) {
        const id = await saveConversion(name, htmlResult, 'draft');
        setCurrentDocId(id);
        fetchHistory();
        showNotify("Project created as draft");
      }
    } catch (error: any) {
      console.error("Conversion failed:", error);
      setUploadError(error.message || "An unexpected error occurred while processing the document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const [initialChatInput, setInitialChatInput] = useState("");

  const handleGenerateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homePrompt.trim() || isProcessing) return;
    
    // Instead of completely generating a document here, we jump into the editor
    // and let the Chat Agent handle the prompt (whether it's video, image, or text)
    const prompt = homePrompt.trim();
    const name = prompt.split(' ').slice(0, 5).join(' ') + '...';
    setFileName(name);
    setContent('<h1>Drafting...</h1><p>Consulting AI Assistant based on your request: "' + prompt + '"</p>');
    setInitialChatInput(prompt);
    setHomePrompt("");
    setStage('edit');
    
    if (user) {
      const id = await saveConversion(name, '<p>Draft in progress...</p>', 'draft');
      setCurrentDocId(id);
      fetchHistory();
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !currentDocId) return;
    try {
      await updateConversion(currentDocId, { content });
      showNotify("Draft saved automatically");
    } catch (err) {
      showNotify("Failed to auto-save", 'error');
    }
  };

  const handleManualSave = async () => {
    if (!user || !currentDocId) return;
    try {
      await updateConversion(currentDocId, { content, status: 'completed' });
      showNotify("Project saved as completed");
      fetchHistory();
    } catch (err) {
      showNotify("Failed to save project", 'error');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteConversion(id);
      if (currentDocId === id) reset();
      fetchHistory();
      showNotify("Project deleted");
    } catch (err) {
      showNotify("Failed to delete project", 'error');
    }
  };

  const handlePreferenceChange = async (maxRes: number) => {
    const newPrefs = { ...preferences, maxRecentProjects: maxRes };
    setPreferences(newPrefs);
    await updateUserPreferences(newPrefs);
    fetchHistory();
    showNotify("Preferences updated");
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleHistorySelect = (record: ConversionRecord) => {
    setFileName(record.fileName);
    setContent(record.content);
    setCurrentDocId(record.id || null);
    setStage('edit');
    setShowHistory(false);
  };

  const handleExport = async () => {
    setShowExportModal(true);
  };

  const handleBatchExport = async (records: ConversionRecord[]) => {
    setBatchToExport(records);
    // For now, we'll just reuse the ZIP logic if multiple items are selected
    const zip = new JSZip();
    const folder = zip.folder("exports");
    
    records.forEach((record) => {
      if (folder) {
        folder.file(`${record.fileName}.html`, record.content);
      }
    });
    
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "batch_export.zip");
    showNotify(`Exported ${records.length} items to ZIP`);
  };

  const reset = () => {
    setStage('upload');
    setContent('');
    setFileName('');
    setCurrentDocId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-30 shadow-sm shadow-slate-200/50">
        <div 
          className="flex items-center gap-4 cursor-pointer group"
          onClick={reset}
        >
          <div className="w-24 h-14 sm:w-32 sm:h-16 flex items-center justify-center overflow-hidden transition-all group-hover:scale-105 shadow-sm rounded-xl bg-white p-2 border border-slate-100">
            <img src="/src/assets/images/smarttech_logo_1777234960969.png" alt="SmartTech Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" loading="lazy" />
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors hidden sm:inline-block">SmartTech <span className="text-slate-400 font-medium">Training Center</span></span>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Cloud synced
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <button 
                onClick={() => setShowSettings(true)}
                className="text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors py-2 min-h-[44px] text-sm font-bold"
                aria-label="History"
              >
                <HistoryIcon size={18} />
                History
              </button>
              <button 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 pl-2 group min-h-[44px]"
                title="View Profile"
                aria-label="View Profile"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-100 overflow-hidden ring-2 ring-slate-50 ring-offset-1 group-hover:ring-blue-500/30 transition-all">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={16} className="m-2 text-slate-400" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                   <p className="text-[10px] font-black text-slate-900 group-hover:text-blue-600 transition-colors">{user.displayName || 'Me'}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Profile</p>
                </div>
              </button>
              <button 
                onClick={handleLogout}
                  className="text-slate-400 hover:text-red-500 transition-colors py-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 min-h-[44px]"
              aria-label="Sign In"
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {stage === 'upload' ? (
            <motion.div
              key="upload-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50"
            >
              <div className="max-w-xl w-full text-center space-y-8">
                
                {/* 3D Animated Hero Logo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    rotateX: [0, -10, 5, 0], 
                    rotateY: [0, 10, -5, 0],
                    y: [0, -15, 5, 0]
                  }}
                  transition={{ 
                    opacity: { duration: 1 },
                    scale: { duration: 1, type: "spring", bounce: 0.4 },
                    rotateX: { duration: 8, repeat: Infinity, ease: "easeInOut" },
                    rotateY: { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
                    y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }
                  }}
                  style={{ perspective: 1200, transformStyle: "preserve-3d" }}
                  className="relative w-full max-w-sm mx-auto mb-10"
                >
                  <motion.img 
                    src="/src/assets/images/smarttech_logo_1777234960969.png" 
                    alt="SmartTech Training Center" 
                    className="w-full h-auto object-contain drop-shadow-[0_25px_25px_rgba(0,0,0,0.15)]"
                    style={{ transform: "translateZ(30px)" }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 rounded-xl blur-sm" style={{ transform: "translateZ(40px)" }} />
                </motion.div>

                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] shadow-sm animate-fade-in">
                    <Sparkles size={14} className="animate-pulse" />
                    Powered by SmartTech Core Intelligence
                  </div>
                  <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
                    Intelligent Document <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Reconstruction.</span>
                  </h2>
                  <p className="text-lg font-medium text-slate-400 max-w-lg mx-auto">
                    Preserve every detail with 100% fidelity. Convert complex PDFs into perfectly structured, editable formats instantly.
                  </p>
                </div>

                {/* Template Selection */}
                <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 p-2 bg-slate-100 rounded-2xl border border-slate-200 mb-8 overflow-y-auto max-h-48 custom-scrollbar">
                  {TEMPLATES.map((t) => {
                    const Icon = TemplateIconMap[t.icon] || FileTextIcon;
                    const isSelected = selectedTemplate.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        aria-label={`Select ${t.name} template`}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all min-h-[44px] ${
                          isSelected 
                            ? 'bg-white shadow-md text-blue-600 border border-slate-200' 
                            : 'text-slate-500 hover:bg-white/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-center pt-1 line-clamp-2">{t.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 w-full relative z-10">
                  <h3 className="text-xl font-bold mb-4 text-slate-800 text-left">What do you want to create?</h3>
                  
                  {/* Provide a quick action chat/input bar */}
                  <form 
                    onSubmit={handleGenerateFromPrompt}
                    className="relative flex items-center mb-6"
                  >
                    <input 
                       type="text"
                       value={homePrompt}
                       onChange={(e) => setHomePrompt(e.target.value)}
                       placeholder="E.g., Write a marketing strategy for a new coffee brand..."
                       className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-inner"
                    />
                    <button type="submit" aria-label="Send Prompt" disabled={isProcessing || !homePrompt.trim()} className="absolute right-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                  
                  <div className="flex flex-wrap gap-3 mb-8">
                     <button aria-label="Generate Marketing Strategy" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors min-h-[44px]" onClick={() => setHomePrompt("Generate a professional marketing strategy complete with tables and charts")}> 
                       <Target size={14}/> Marketing Strategy
                     </button>
                     <button aria-label="Generate Poster" className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors min-h-[44px]" onClick={() => setHomePrompt("Generate a modern design layout for a newsletter")}> 
                       <ImageIcon size={14}/> Gen Poster / Image
                     </button>
                     <button aria-label="Generate Video Script" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors min-h-[44px]" onClick={() => setHomePrompt("Create a script for a promotional video about AI")}> 
                       <Film size={14}/> Video Script
                     </button>
                  </div>

                  <div className="relative flex py-5 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">or</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <FileUploader 
                    onFileSelect={handleFileSelect} 
                    isLoading={isProcessing} 
                    uploadError={uploadError}
                  />
                </div>

                <div className="flex items-center justify-center gap-8 pt-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-lg flex items-center justify-center text-blue-600">
                      <FileText size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Text Integrity</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-lg flex items-center justify-center text-blue-600">
                      <Download size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">DOCX Export</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-lg flex items-center justify-center text-blue-600">
                      <Sparkles size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">AI Layout</span>
                  </div>
                </div>

                {/* Recent Projects Section */}
                {user && recentProjects.length > 0 && (
                  <div className="text-left space-y-4 pt-12">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Projects</h3>
                      <button 
                        onClick={() => setShowHistory(true)}
                        className="text-xs font-bold text-blue-600 hover:underline min-h-[44px] px-2"
                        aria-label="View all projects"
                      >
                        View all
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentProjects.map((project) => (
                        <div 
                          key={project.id}
                          className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                          onClick={() => handleHistorySelect(project)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                                project.status === 'draft' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                              }`}>
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{project.fileName}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {project.status === 'draft' ? 'Draft' : 'Completed'}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (project.id) handleDeleteProject(project.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                              aria-label="Delete project"
                            >
                              <Archive size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="edit-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col bg-slate-100 min-h-0"
            >
              {/* Toolbar / Doc Header */}
              <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={reset}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="h-6 w-px bg-slate-200 mx-1" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate max-w-[200px]">
                      {fileName}.pdf
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Converted successfully</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleManualSave}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-bold border border-slate-200 rounded-lg bg-white"
                  >
                    <Save size={16} />
                    Save
                  </button>
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-200/50 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
                  >
                    <Download size={16} />
                    Export
                  </button>
                  <button
                    onClick={() => setShowAppChat(!showAppChat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      showAppChat 
                        ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Bot size={16} />
                    {showAppChat ? 'Close Assistant' : 'Open Assistant'}
                  </button>
                </div>
              </div>

              {/* Editing Area */}
              <div className="flex-1 overflow-hidden flex bg-slate-100">
                <div className="flex-1 overflow-y-auto p-12 flex justify-center">
                  <div className="doc-canvas relative flex-1 max-w-full">
                    <Editor content={content} onChange={handleContentChange} />
                    
                    <div className="absolute -left-48 top-8 hidden xl:block w-36 space-y-4">
                      <div className="p-4 bg-slate-900 rounded-xl text-white shadow-xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Live Status</p>
                        <p className="text-xs font-medium leading-relaxed">AI reconstructed 100% of the document layout.</p>
                        <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-700">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-[9px] font-bold uppercase text-slate-400">Ready for export</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Chat Agent Sidebar */}
                <AnimatePresence>
                  {showAppChat && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 320, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="border-l border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0"
                    >
                      <ChatAgent 
                        documentContent={content}
                        onApplyChange={setContent}
                        onInsertContent={(newHtml) => setContent(prev => prev + newHtml)}
                        initialInput={initialChatInput}
                        onClose={() => setShowAppChat(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Info Bar */}
              <div className="h-10 bg-white border-t border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Formatted for Microsoft Word &bull; AI Fidelity 99%
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">UTF-8 HTML5</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
              />
              <History 
                records={history} 
                onSelect={handleHistorySelect} 
                onDelete={handleDeleteProject}
                onBatchExport={handleBatchExport}
                onClose={() => setShowHistory(false)} 
              />
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <Settings size={18} />
                    </div>
                    <h3 className="font-bold text-slate-900">User Preferences</h3>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-900"><Archive size={20} className="rotate-45" /></button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 block text-left">Recent Projects Limit</label>
                    <div className="flex items-center gap-4">
                      {[3, 5, 10, 20].map(val => (
                        <button
                          key={val}
                          onClick={() => handlePreferenceChange(val)}
                          className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                            preferences.maxRecentProjects === val 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left mt-2">
                      Adjust how many projects appear on your startup dashboard.
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showExportModal && (
            <ExportModal 
              fileName={fileName}
              content={content}
              onClose={() => setShowExportModal(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showProfileModal && (
            <ProfileModal 
              onClose={() => setShowProfileModal(false)}
              onSelectProject={(record) => {
                handleHistorySelect(record);
                setShowProfileModal(false);
              }}
            />
          )}
        </AnimatePresence>

        <footer className="mt-24 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-400 text-sm">
            © 2024 SmartTech AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
            <div className="h-4 w-px bg-slate-200" />
            <a href="https://github.com" className="hover:text-slate-900 transition-colors">
              <Github size={20} />
            </a>
          </div>
        </footer>

        {/* Notifications UI */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 border ${
                notification.type === 'success' 
                  ? 'bg-slate-900 border-slate-800 text-white' 
                  : 'bg-red-600 border-red-500 text-white'
              }`}
            >
              {notification.type === 'success' ? <Check size={18} className="text-green-400" /> : <AlertCircle size={18} />}
              <span className="text-sm font-bold tracking-tight">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
