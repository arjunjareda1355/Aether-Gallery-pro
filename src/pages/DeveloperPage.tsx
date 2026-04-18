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
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/layout/Logo';
import { cn } from '../lib/utils';
import { User, DeveloperProfile, SocialLink } from '../types';
import { db, COLLECTIONS } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Shield, Sparkles } from 'lucide-react';

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
  const [profile, setProfile] = useState<DeveloperProfile>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<DeveloperProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, COLLECTIONS.APP_SETTINGS, 'developer_profile'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DeveloperProfile;
        setProfile(data);
        setEditData(data);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, 'developer_profile'), editData);
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
    <div className="min-h-screen bg-bg-dark pt-32 pb-20 px-4">
      <Link 
        to="/" 
        className="fixed top-8 left-4 md:left-10 z-[60] flex items-center gap-2 px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-white hover:bg-brand-primary/20 hover:border-brand-primary/30 transition-all group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-brand-primary" />
        Back to Sanctuary
      </Link>
      
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link 
              to="/about" 
              className="flex items-center gap-2 text-text-dim hover:text-white transition-colors group"
            >
              <div className="p-2 rounded-full border border-border-dark group-hover:border-brand-primary/50 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[10px] md:text-xs">Back to About</span>
            </Link>
          </motion.div>

          {user?.isAdmin && (
            <button 
              onClick={() => {
                if(isEditing) handleSave();
                else setIsEditing(true);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary rounded-full text-xs font-bold uppercase tracking-widest hover:bg-brand-primary/20 transition-all"
            >
              {isEditing ? <><Save className="w-4 h-4" /> Save Changes</> : <><Edit2 className="w-4 h-4" /> Edit Profile</>}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim">Artist Name</label>
                  <input 
                    type="text" 
                    value={editData.name} 
                    onChange={e => setEditData({...editData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                  />
                  
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim block mt-4">Profile Photo URL</label>
                  <input 
                    type="text" 
                    value={editData.photoUrl} 
                    onChange={e => setEditData({...editData, photoUrl: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                  />

                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim block mt-4">Contact Email</label>
                  <input 
                    type="email" 
                    value={editData.contactEmail} 
                    onChange={e => setEditData({...editData, contactEmail: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                  />

                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim block mt-4">Biography Paragraphs</label>
                  {editData.bio.map((p, i) => (
                    <textarea 
                      key={i}
                      value={p}
                      onChange={e => updateBio(i, e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-xs focus:ring-1 focus:ring-brand-primary outline-none mb-2"
                    />
                  ))}
                </div>

                <div className="space-y-8">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim">Social Links</label>
                        <button onClick={() => addListItem('socials')} className="text-brand-primary"><Plus className="w-4 h-4" /></button>
                      </div>
                      {editData.socials.map((s, i) => (
                        <div key={i} className="flex gap-2 items-center">
                           <input placeholder="Name" value={s.name} onChange={e => updateSocial('socials', i, 'name', e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white" />
                           <input placeholder="URL" value={s.url} onChange={e => updateSocial('socials', i, 'url', e.target.value)} className="flex-[2] bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white" />
                           <button onClick={() => removeListItem('socials', i)}><X className="w-4 h-4 text-red-500" /></button>
                        </div>
                      ))}
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim">Streaming Profiles</label>
                        <button onClick={() => addListItem('streaming')} className="text-brand-primary"><Plus className="w-4 h-4" /></button>
                      </div>
                      {editData.streaming.map((s, i) => (
                        <div key={i} className="flex gap-2 items-center">
                           <input placeholder="Name" value={s.name} onChange={e => updateSocial('streaming', i, 'name', e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white" />
                           <input placeholder="URL" value={s.url} onChange={e => updateSocial('streaming', i, 'url', e.target.value)} className="flex-[2] bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white" />
                           <button onClick={() => removeListItem('streaming', i)}><X className="w-4 h-4 text-red-500" /></button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <button 
               onClick={() => setIsEditing(false)}
               className="w-full py-4 border border-white/10 rounded-3xl text-text-dim text-xs font-bold uppercase tracking-widest hover:text-white"
             >
               Cancel Editing
             </button>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-[40px] overflow-hidden border-4 border-brand-primary/20 shadow-2xl relative z-10">
                  <img 
                    src={profile.photoUrl} 
                    alt={profile.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -inset-4 bg-brand-primary/20 blur-3xl rounded-full z-0 animate-pulse" />
              </motion.div>

              <div className="flex-1 space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-white leading-tight">
                      {profile.name.split(' ').slice(0, -1).join(' ')} <span className="text-brand-primary italic">{profile.name.split(' ').pop()}</span>
                    </h1>
                    <div className="flex items-center gap-2 px-4 py-1 bg-amber-500/10 border border-amber-500/40 text-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)] w-fit mx-auto md:mx-0">
                      <Shield className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sanctuary Architect</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {profile.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-text-dim">{tag}</span>
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="prose prose-invert prose-p:text-text-dim prose-p:leading-relaxed max-w-none space-y-4"
                >
                  {profile.bio.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Social Links Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Social Connect</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {profile.socials.map((social) => {
                    const Icon = ICON_MAP[social.name] || ICON_MAP.default;
                    return (
                      <a 
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-xl text-white", social.color || 'bg-white/10')}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-bold text-white/80 group-hover:text-white">{social.name}</span>
                        </div>
                        <Globe className="w-4 h-4 text-white/20 group-hover:text-brand-primary transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Music Platforms</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {profile.streaming.map((stream) => {
                    const Icon = ICON_MAP[stream.name] || ICON_MAP.default;
                    return (
                      <a 
                        key={stream.name}
                        href={stream.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-xl text-white", stream.color || 'bg-cyan-500')}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-bold text-white/80 group-hover:text-white">{stream.name}</span>
                        </div>
                        <Music className="w-4 h-4 text-white/20 group-hover:text-brand-primary transition-colors" />
                      </a>
                    );
                  })}
                </div>

                <div className="p-8 bg-brand-primary/5 border border-brand-primary/20 rounded-[40px] space-y-4">
                  <h4 className="text-lg font-display font-bold text-white">Contact & Support</h4>
                  <p className="text-xs text-text-dim leading-relaxed">
                    For collaborations, music licensing, or general inquiries, feel free to reach out via socials. 
                  </p>
                  <div className="flex items-center gap-2 text-brand-primary">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold">{profile.contactEmail || 'arjunbhartimina@gmail.com'}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
