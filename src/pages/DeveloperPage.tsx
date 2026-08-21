import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Instagram, 
  Youtube, 
  Twitter, 
  Linkedin, 
  MessageCircle, 
  Pin, 
  Music, 
  Music2,
  ArrowLeft,
  Mail,
  Zap,
  Edit2,
  Save,
  X,
  Plus,
  Shield, 
  Sparkles,
  ExternalLink,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../components/layout/Logo';
import { cn } from '../lib/utils';
import { User, DeveloperProfile, SocialLink } from '../types';
import { db, COLLECTIONS } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface DeveloperPageProps {
  user: User | null;
}

const DEFAULT_PROFILE: DeveloperProfile = {
  name: "Arjun Bharti Mina",
  bio: [
    "Arjun Bharti Mina is a multi-talented independent music artist, rapper, and digital creator emerging from Jaipur, Rajasthan. Born on May 13, 2007, in Nadoti, Karauli, he has successfully balanced a creative career with academic pursuits, currently studying Civil Engineering at the Swami Keshwanand Institute of Technology (SKIT).",
    "Known for his versatile style that blends soulful melodies with modern rap, Arjun has built a significant digital footprint through original tracks like \"Bairagi,\" \"Ruh Da Hani,\" and \"Lakeerien.\" His work is characterized by a \"do-it-yourself\" ethos, as he often handles his own songwriting, beat production, and video editing, frequently incorporating AI tools to enhance his visual storytelling.",
    "With his music featured on major global platforms like Spotify and Apple Music, he is becoming a prominent voice in the independent Hindi music scene, representing a new generation of artists who merge technical expertise with artistic expression."
  ],
  photoUrl: "https://picsum.photos/seed/arjun/600/600",
  contactEmail: "arjunbhartimina@gmail.com",
  tags: ["Artist", "Rapper", "Digital Creator", "Civil Engineer"],
  socials: [
    { name: 'Official Website', url: 'https://arjunbhartimina.my.canva.site/org', color: 'bg-blue-500' },
    { name: 'Instagram', url: 'https://www.instagram.com/arjun_bhartimina', color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' },
    { name: 'YouTube', url: 'https://youtube.com/@arjun_mina', color: 'bg-red-600' },
    { name: 'X (Twitter)', url: 'https://x.com/ArjunJareda', color: 'bg-black border border-white/20' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/arjunbhartimina', color: 'bg-blue-700' },
    { name: 'WhatsApp Channel', url: 'https://whatsapp.com/channel/0029VbBzlTg0wajw2QGVJx0t', color: 'bg-green-500' },
    { name: 'Pinterest', url: 'https://in.pinterest.com/arjunmina13/', color: 'bg-red-500' },
  ],
  streaming: [
    { name: 'Spotify', url: 'https://open.spotify.com/artist/4z2SP2WmtXQrEzRAwNnhp2', color: 'bg-green-600' },
    { name: 'JioSaavn', url: 'https://www.jiosaavn.com/artist/arjun-bharti-mina-albums/uJbBbgaGMSU_', color: 'bg-cyan-500' },
  ]
};

const ANONYMOUS_PROFILE: DeveloperProfile = {
  name: "Aether System Architect",
  bio: [
    "The Aether System Architect oversees the programmatic frameworks, visual alignment structures, and cosmic layout distribution engines powering this platform.",
    "Committed to elegant visual hierarchy and fluid responsive interactivity, the creator bridges spatial layout and digital discovery while preserving strict privacy and private infrastructure protocols."
  ],
  photoUrl: "https://picsum.photos/seed/aether/600/600",
  contactEmail: "contact@aethersystem.org",
  tags: ["System Architect", "Digital Creator", "Interface Designer"],
  socials: [],
  streaming: []
};

const ICON_MAP: Record<string, any> = {
  'Official Website': Globe,
  'Instagram': Instagram,
  'YouTube': Youtube,
  'X (Twitter)': Twitter,
  'LinkedIn': Linkedin,
  'WhatsApp Channel': MessageCircle,
  'Pinterest': Pin,
  'Spotify': Music2,
  'JioSaavn': Music,
  'default': Globe
};

export default function DeveloperPage({ user }: DeveloperPageProps) {
  const { t } = useTranslation();
  const [realProfile, setRealProfile] = useState<DeveloperProfile>(DEFAULT_PROFILE);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<DeveloperProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, COLLECTIONS.APP_SETTINGS, 'global_config'), (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data());
      }
    });

    const unsubProfile = onSnapshot(doc(db, COLLECTIONS.APP_SETTINGS, 'developer_profile'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DeveloperProfile;
        setRealProfile(data);
        setEditData(data);
      }
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubProfile();
    };
  }, []);

  const ADMIN_EMAILS = ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com', 'aethersanctuaryofficial@gmail.com'];
  const isAdmin = user && ADMIN_EMAILS.some(email => user.email?.toLowerCase() === email.toLowerCase());
  const shouldHideCreator = globalConfig?.hideCreatorDetails && !isAdmin;

  // Compute active profile based on access levels
  const profile = shouldHideCreator ? ANONYMOUS_PROFILE : realProfile;

  const handleSave = async () => {
    try {
      // Clean object for Firestore
      const cleanData: any = { ...editData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });

      await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, 'developer_profile'), cleanData);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to update profile.");
    }
  };

  const updateBio = (index: number, val: string) => {
    const newBio = [...editData.bio];
    newBio[index] = val;
    setEditData({ ...editData, bio: newBio });
  };

  const updateSocial = (type: 'socials' | 'streaming', index: number, field: keyof SocialLink, val: string) => {
    const newList = [...editData[type]];
    newList[index] = { ...newList[index], [field]: val };
    setEditData({ ...editData, [type]: newList });
  };

  const addListItem = (type: 'socials' | 'streaming') => {
    const newList = [...editData[type], { name: 'New Link', url: 'https://', color: 'bg-white/10' }];
    setEditData({ ...editData, [type]: newList });
  };

  const removeListItem = (type: 'socials' | 'streaming', index: number) => {
    const newList = editData[type].filter((_, i) => i !== index);
    setEditData({ ...editData, [type]: newList });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20 px-4 md:px-10 relative overflow-hidden">
      {/* Immersive Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-brand-primary/5 blur-[150px] rounded-full opacity-50" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-brand-secondary/5 blur-[150px] rounded-full opacity-50" />
      </div>

      
      <div className="max-w-5xl mx-auto space-y-16 relative z-10">
        {/* Navigation & Actions */}
        <div className="flex justify-end items-center bg-white/[0.02] backdrop-blur-3xl border border-white/5 p-3 pr-6 rounded-[32px] shadow-2xl">
          {(user?.isAdmin || isAdmin) && (
            <button 
              onClick={() => {
                if(isEditing) handleSave();
                else setIsEditing(true);
              }}
              className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-bg-dark rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-brand-primary/20"
            >
              {isEditing ? <><Save className="w-4 h-4" /> Sync Vision</> : <><Edit2 className="w-4 h-4" /> Modify Reality</>}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-700 bg-white/[0.01] border border-white/5 p-10 rounded-[56px] backdrop-blur-3xl">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary ml-1">Architect Identity</label>
                    <input 
                      type="text" 
                      value={editData.name} 
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-[20px] p-5 text-white focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary ml-1">Aether Visual (URL)</label>
                    <input 
                      type="text" 
                      value={editData.photoUrl} 
                      onChange={e => setEditData({...editData, photoUrl: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-[20px] p-5 text-white focus:border-brand-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary ml-1">Direct Resonance (Email)</label>
                    <input 
                      type="email" 
                      value={editData.contactEmail} 
                      onChange={e => setEditData({...editData, contactEmail: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-[20px] p-5 text-white focus:border-brand-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary ml-1">Philosophy (Bio)</label>
                    {editData.bio.map((p, i) => (
                      <textarea 
                        key={`bio-edit-${i}`}
                        value={p}
                        onChange={e => updateBio(i, e.target.value)}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-[20px] p-5 text-white text-[11px] font-bold focus:border-brand-primary outline-none mb-3 resize-none"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-10">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">Social Channels</label>
                        <button onClick={() => addListItem('socials')} className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl"><Plus className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-3">
                        {editData.socials.map((s, i) => (
                          <div key={`social-edit-${i}`} className="flex gap-3 items-center">
                             <input placeholder="Name" value={s.name} onChange={e => updateSocial('socials', i, 'name', e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase text-white" />
                             <input placeholder="URL" value={s.url} onChange={e => updateSocial('socials', i, 'url', e.target.value)} className="flex-[2] bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold text-white" />
                             <button onClick={() => removeListItem('socials', i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">Aether Frequencies</label>
                        <button onClick={() => addListItem('streaming')} className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl"><Plus className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-3">
                        {editData.streaming.map((s, i) => (
                          <div key={`streaming-edit-${i}`} className="flex gap-3 items-center">
                             <input placeholder="Name" value={s.name} onChange={e => updateSocial('streaming', i, 'name', e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase text-white" />
                             <input placeholder="URL" value={s.url} onChange={e => updateSocial('streaming', i, 'url', e.target.value)} className="flex-[2] bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold text-white" />
                             <button onClick={() => removeListItem('streaming', i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
             <div className="flex gap-4">
               <button 
                 onClick={handleSave}
                 className="flex-1 py-5 bg-brand-primary text-bg-dark rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-110 shadow-xl transition-all"
               >
                 Commit to Registry
               </button>
               <button 
                 onClick={() => setIsEditing(false)}
                 className="px-10 py-5 bg-white/5 border border-white/10 rounded-[24px] text-text-dim text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-all"
               >
                 Abort
               </button>
             </div>
          </div>
        ) : (
          <div className="space-y-24">
            {/* Profile Header - Immersive */}
            <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-center md:items-start text-center md:text-left">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group shrink-0"
              >
                <div className="w-56 h-56 md:w-80 md:h-80 rounded-[56px] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative z-10 transition-transform duration-700 group-hover:scale-105">
                  <img 
                    src={profile.photoUrl} 
                    alt={profile.name} 
                    className="w-full h-full object-cover grayscale-0 group-hover:grayscale-0 transition-all duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute -inset-4 bg-brand-primary/10 blur-[100px] rounded-full z-0 opacity-0 group-hover:opacity-100 transition-all duration-1000" />
              </motion.div>

              <div className="flex-1 space-y-8 py-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.6em] text-brand-primary">{t('architect.system_architect') || 'Visionary Architect'}</p>
                    <h1 className="text-4xl md:text-7xl font-display font-black tracking-tighter text-text-main leading-none uppercase italic allow-select">
                      {profile.name.split(' ').slice(0, -1).join(' ')} <span className="text-brand-primary">{profile.name.split(' ').pop()}</span>
                    </h1>
                  </div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {Array.from(new Set(profile.tags)).filter(Boolean).map((tag, i) => (
                      <span key={`dev-tag-${tag}-${i}`} className="px-5 py-2.5 bg-white/[0.03] border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-text-main/60 whitespace-nowrap shadow-xl">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="prose prose-invert max-w-none space-y-6"
                >
                  {profile.bio.map((p, i) => (
                    <p key={`bio-view-${profile.name.replace(/\s+/g,'')}-${i}`} className="text-sm md:text-lg text-text-dim/80 leading-relaxed font-medium font-serif italic border-l-2 border-brand-primary/20 pl-6 py-1 allow-select">
                      {p}
                    </p>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Content Divider */}
            <div className="w-full h-px bg-white/5 relative">
               <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-bg-dark border border-white/10 rounded-full">
                  <Sparkles className="w-4 h-4 text-brand-primary" />
               </div>
            </div>

            {/* Resonance Channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20">
                    <Zap className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-display font-black text-text-main uppercase tracking-tighter italic">Social Spectrum</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/30">Connect in the void</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {profile.socials.map((social, i) => {
                    const Icon = ICON_MAP[social.name] || ICON_MAP.default;
                    return (
                      <a 
                        key={`social-${social.name}-${i}`}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-6 bg-white/[0.01] border border-white/5 rounded-[32px] hover:bg-white/[0.04] hover:border-brand-primary/30 transition-all group overflow-hidden relative shadow-2xl"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-5 relative z-10 allow-select">
                          <div className={cn("p-3.5 rounded-2xl text-white shadow-xl group-hover:scale-110 transition-transform duration-500", social.color || 'bg-white/10')}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-black uppercase tracking-widest text-text-main/80 group-hover:text-white">{social.name}</span>
                        </div>
                        <div className="p-2 rounded-full bg-white/5 text-text-dim/20 group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-all relative z-10">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20">
                    <Music className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-display font-black text-text-main uppercase tracking-tighter italic">Harmonic Frequencies</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/30">Auditory resonance</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {profile.streaming.map((stream, i) => {
                    const Icon = ICON_MAP[stream.name] || ICON_MAP.default;
                    return (
                      <a 
                        key={`stream-${stream.name}-${i}`}
                        href={stream.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-6 bg-white/[0.01] border border-white/5 rounded-[32px] hover:bg-white/[0.04] hover:border-brand-primary/30 transition-all group overflow-hidden relative shadow-2xl"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-5 relative z-10 allow-select">
                          <div className={cn("p-3.5 rounded-2xl text-white shadow-xl group-hover:scale-110 transition-transform duration-500", stream.color || 'bg-cyan-500')}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-black uppercase tracking-widest text-text-main/80 group-hover:text-white">{stream.name}</span>
                        </div>
                        <Music className="w-4 h-4 text-text-dim/20 group-hover:text-brand-primary transition-colors relative z-10" />
                      </a>
                    );
                  })}
                </div>

                <div className="relative group/card">
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000 rounded-[48px]" />
                  <div className="relative p-10 bg-white/[0.01] border border-white/5 rounded-[48px] space-y-6 backdrop-blur-3xl">
                    <div className="space-y-2">
                       <h4 className="text-xl font-display font-black text-text-main uppercase tracking-tight italic">Direct Transmission</h4>
                       <p className="text-[10px] font-bold text-text-dim/50 uppercase tracking-widest leading-relaxed">
                         For collaborations, musical licensing, or visionary consultations.
                       </p>
                    </div>
                    
                    <a 
                      href={`mailto:${profile.contactEmail || 'arjunbhartimina@gmail.com'}`}
                      className="flex items-center gap-4 p-5 bg-brand-primary text-bg-dark rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20 allow-select"
                    >
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{profile.contactEmail || 'arjunbhartimina@gmail.com'}</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <footer className="text-center pt-20">
               <Logo size="sm" className="mx-auto opacity-10 hover:opacity-100 transition-opacity duration-700" />
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
