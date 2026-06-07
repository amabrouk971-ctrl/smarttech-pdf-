import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  BookOpen, 
  Edit3, 
  Save, 
  Camera,
  FolderOpen,
  Clock,
  ExternalLink,
  Loader2,
  Check
} from 'lucide-react';
import { 
  UserProfile as UserProfileType, 
  getUserProfile, 
  updateUserProfile,
  ConversionRecord,
  getHistory
} from '../services/firebaseService';
import { auth } from '../lib/firebase';

interface ProfileModalProps {
  onClose: () => void;
  onSelectProject: (record: ConversionRecord) => void;
}

export default function ProfileModal({ onClose, onSelectProject }: ProfileModalProps) {
  const user = auth.currentUser;
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [projects, setProjects] = useState<ConversionRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [profileData, historyData] = await Promise.all([
        getUserProfile(user.uid),
        getHistory()
      ]);
      
      if (profileData) {
        setProfile(profileData);
        setEditName(profileData.displayName);
        setEditBio(profileData.bio || '');
      } else {
        const initialProfile = {
          userId: user.uid,
          displayName: user.displayName || 'Anonymous User',
          photoURL: user.photoURL || undefined,
          updatedAt: new Date()
        };
        setProfile(initialProfile);
        setEditName(initialProfile.displayName);
      }
      setProjects(historyData);
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        displayName: editName,
        bio: editBio
      });
      setProfile(prev => prev ? { ...prev, displayName: editName, bio: editBio } : null);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header - Banner Area */}
        <div className="relative h-48 bg-gradient-to-r from-blue-600 to-indigo-600">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-md"
          >
            <X size={20} />
          </button>
          
          <div className="absolute -bottom-16 left-12 flex items-end gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-xl">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-full h-full rounded-[20px] object-cover" />
                ) : (
                  <div className="w-full h-full rounded-[20px] bg-slate-100 flex items-center justify-center text-slate-400">
                    <User size={48} />
                  </div>
                )}
              </div>
              <button className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110 transition-all opacity-0 group-hover:opacity-100">
                <Camera size={16} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-white drop-shadow-sm">
                  {profile?.displayName || user.displayName}
                </h2>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-all backdrop-blur-md"
                  >
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-blue-100 text-sm font-bold">
                  <Mail size={14} />
                  {user.email}
                </span>
                <span className="flex items-center gap-1.5 text-blue-100 text-sm font-bold">
                  <Calendar size={14} />
                  Joined {new Date(user.metadata.creationTime || Date.now()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 mt-20 p-12 overflow-hidden flex flex-col md:flex-row gap-12 text-slate-900">
          
          {/* Left Column: Bio & Info */}
          <div className="w-full md:w-80 shrink-0 space-y-8 scrollbar-hide overflow-y-auto pr-2">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <BookOpen size={14} />
                About Me
              </h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Public Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Bio</label>
                    <textarea 
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Write something about yourself..."
                      className="w-full h-32 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 font-medium leading-relaxed">
                  {profile?.bio || "No bio available. Express your professional journey here."}
                </p>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Account Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-2xl font-black text-slate-900">{projects.length}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Projects</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-2xl font-black text-slate-900">
                    {projects.filter(p => p.status === 'completed').length}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Exports</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Projects list */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FolderOpen size={14} />
                  All Projects
                </h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all">
                    Latest First
                  </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                {isLoading ? (
                  <div className="h-40 flex items-center justify-center text-slate-400 gap-2">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-bold">Syncing workspace...</span>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <FolderOpen size={32} className="mb-2 opacity-20" />
                    <p className="font-bold text-sm">No projects found yet</p>
                    <button 
                      onClick={onClose}
                      className="mt-4 text-blue-600 text-xs font-bold hover:underline"
                    >
                      Start your first conversion
                    </button>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div 
                      key={project.id}
                      className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer flex items-center gap-4"
                      onClick={() => onSelectProject(project)}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs ${
                        project.status === 'completed' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {project.status === 'completed' ? 'PDF' : <Edit3 size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {project.fileName}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <Clock size={10} />
                            {new Date(project.updatedAt?.toMillis?.() || Date.now()).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${
                            project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <ExternalLink size={16} />
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
