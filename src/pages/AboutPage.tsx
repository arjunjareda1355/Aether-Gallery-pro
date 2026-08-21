import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Terminal, ArrowRight, ExternalLink, Globe, ChevronDown, Database, Mail, Copy, Check, Sparkles, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../components/layout/Logo';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db, COLLECTIONS, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function AboutPage() {
  const { t } = useTranslation();
  const [activeTopic, setActiveTopic] = React.useState<number | null>(null);
  const [totalPostsCount, setTotalPostsCount] = React.useState<number | null>(null);
  const [globalConfig, setGlobalConfig] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [copiedEmail, setCopiedEmail] = React.useState(false);

  React.useEffect(() => {
    const qConfig = doc(db, COLLECTIONS.APP_SETTINGS, 'global_config');
    const unsubConfig = onSnapshot(qConfig, (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data());
      }
    }, (error) => {
      console.error("Failed to query global configuration settings:", error);
    });

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const ADMIN_EMAILS = ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com', 'aethersanctuaryofficial@gmail.com'];
        setIsAdmin(ADMIN_EMAILS.some(email => firebaseUser.email?.toLowerCase() === email.toLowerCase()));
      } else {
        setIsAdmin(false);
      }
    });

    const q = query(collection(db, COLLECTIONS.IMAGES));
    const unsub = onSnapshot(q, (snapshot) => {
      setTotalPostsCount(snapshot.size);
    }, (error) => {
      console.error("Failed to query total uploaded posts:", error);
    });

    return () => {
      unsubConfig();
      unsubAuth();
      unsub();
    };
  }, []);

  const handleCopyEmail = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('arjunjareda2007@gmail.com');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const shouldHideCreator = globalConfig?.hideCreatorDetails && !isAdmin;

  const sections = [
    {
      title: t('about.our_sanctuary') || 'Our Sanctuary',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      content: 'Aether Gallery is a refined digital sanctuary for creators. We offer a distraction-free environment to host, explore, and curate high-quality visual media.'
    },
    {
      title: t('about.smart_curation') || 'Smart Curation',
      icon: <Terminal className="w-4 h-4 text-brand-primary" />,
      content: 'Powered by Gemini AI, Aether features AI-assisted curation—generating poetic descriptions, aesthetic titles, and smart tags to make media organization effortless.'
    },
    {
      title: t('about.global_connectivity') || 'Global Connectivity',
      icon: <ExternalLink className="w-4 h-4 text-amber-400" />,
      content: 'Seamlessly connect direct image links, video streams, YouTube, Vimeo, and Google Drive links into unified permanent galleries.'
    }
  ];

  const helpTopics = [
    { q: 'How do I add media?', a: 'Sign in as an administrator, navigate to the Dashboard, and paste a direct link to your media. Use the AI Magic wand to auto-fill metadata.' },
    { q: 'How to upload images to Aether?', a: 'We recommend Postimages:\n1. Visit https://postimages.org/ and upload your file.\n2. Copy the "Direct Link" provided.\n3. Paste the direct link in the submission form.' },
    { q: 'What links are supported?', a: 'Direct image files (.jpg, .png, .webp), direct videos (.mp4, .webm), YouTube, Vimeo, and shared Google Drive links.' },
    { q: 'Can I download media?', a: 'Yes! View any direct image or video in the modal and click the Download option in the action bar.' },
    { q: 'How do collections work?', a: 'Save your favorite assets into personalized collections via your profile page to keep your workspace structured.' },
    { q: 'How do I customize my profile and theme?', a: 'Tap "Sync Identity" on your profile page to edit your avatar and bio. Use the Theme Selector to toggle atmospheric styles.' },
    { q: 'Can I set visual assets to private?', a: 'Yes, when creating collections, you can mark them as private so they are visible only to you.' },
    { q: 'How does long-pressing on gallery items work?', a: 'If you are an Architect, long-pressing opens bulk edit options. For Resident curators, holding down on video cards enables instant preview.' },
    { q: 'What are the core community rules?', a: 'Curate thoughtfully. Submit high-definition, respectful media. Inappropriate submissions will be flagged by automated moderation.' },
    { q: 'How can I filter the gallery stream?', a: 'Use classification chips at the top to filter by media type, categories, aspect ratios, or chronological ordering.' },
    { q: 'How do I request premium space?', a: 'Navigate to Upgrade in the main menu to submit database extension requests or unlock curated features from the Architect.' }
  ];

  return (
    <div className="min-h-screen bg-bg-dark pt-28 pb-16 px-4 md:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-16 relative z-10">

        {/* Header / About Sanctuary Intro */}
        <section className="text-center space-y-6 pt-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-4"
          >
            <Logo size="lg" className="relative z-10" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-text-main/5 border border-text-main/10 text-[10px] font-bold uppercase tracking-[0.25em] text-brand-primary">
              <Sparkles className="w-3 h-3 text-brand-primary" />
              <span>{t('nav.about') || 'About Sanctuary'}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight uppercase text-text-main">
              Aether <span className="text-brand-primary italic">Gallery</span>
            </h1>
            <p className="text-text-dim/70 text-xs md:text-sm max-w-xl mx-auto font-medium leading-relaxed font-serif italic">
              "Where visual poetry meets technical precision in a curated digital void."
            </p>
          </motion.div>
        </section>

        {/* Refined "About Sanctuary" Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((sec, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              key={`section-${idx}`}
              className="p-6 bg-text-main/[0.02] border border-text-main/10 rounded-2xl space-y-3 hover:bg-text-main/[0.04] hover:border-brand-primary/30 transition-all group"
            >
              <div className="w-9 h-9 bg-text-main/5 rounded-xl border border-text-main/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {sec.icon}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-text-main uppercase tracking-tight">{sec.title}</h3>
                <p className="text-xs text-text-dim/70 leading-relaxed font-medium">
                  {sec.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Refined "The Architect" Section */}
        <motion.section 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="p-6 md:p-8 bg-text-main/[0.02] border border-text-main/10 rounded-2xl hover:border-brand-primary/30 transition-all space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Compact Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-bg-dark border border-brand-primary/30 p-0.5 shrink-0 overflow-hidden relative shadow-lg">
                <img 
                  src={shouldHideCreator ? "https://picsum.photos/seed/aether/600/600" : "https://picsum.photos/seed/arjun/600/600"} 
                  alt={shouldHideCreator ? "The System Architect" : "The Architect"} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>

              {/* Architect Info */}
              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-brand-primary">
                  <UserCheck className="w-3 h-3" />
                  <span>{shouldHideCreator ? "System Protocol" : t('nav.architect')}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-display font-black text-text-main uppercase tracking-tight">
                  {shouldHideCreator ? "Aether Architect" : "Arjun Bharti Mina"}
                </h2>
                <p className="text-xs text-text-dim/70 font-medium leading-relaxed max-w-lg">
                  {shouldHideCreator 
                    ? "Systems Architect bridging clean interface paradigms with robust design protocols." 
                    : "Artist, Digital Creator, & Systems Architect bridging creative vision with technical precision."}
                </p>
              </div>

              {/* Link */}
              <div className="shrink-0 pt-2 sm:pt-0">
                <Link 
                  to="/developer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-text-main/5 hover:bg-brand-primary hover:text-black border border-text-main/10 hover:border-brand-primary rounded-xl text-xs font-bold text-text-main uppercase tracking-wider transition-all"
                >
                  <span>{t('nav.architect')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Registry Support Section with Get in Touch */}
        <section className="space-y-8 pt-10 border-t border-text-main/10">
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary border border-brand-primary/20 mb-1">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-display font-black text-text-main uppercase tracking-tight">{t('about.faq') || 'Registry Support'}</h2>
            <p className="text-xs text-text-dim/60 font-medium">Frequently asked questions, registry assistance, and direct contact.</p>
          </div>

          {/* FAQ Accordion Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {helpTopics.map((topic, idx) => {
              const isOpen = activeTopic === idx;
              return (
                <div 
                  key={`topic-${idx}`}
                  className="bg-text-main/[0.02] border border-text-main/10 rounded-xl overflow-hidden hover:border-brand-primary/30 transition-all select-none cursor-pointer"
                  onClick={() => setActiveTopic(isOpen ? null : idx)}
                >
                  <div className="p-4 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all shrink-0",
                        isOpen ? "bg-brand-primary" : "bg-text-main/30"
                      )} />
                      {topic.q}
                    </h4>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-text-dim/50 transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-brand-primary")} />
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-text-main/5">
                      <p className="text-xs text-text-dim/80 leading-relaxed font-medium whitespace-pre-line">
                        {topic.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* GET IN TOUCH SECTION */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-text-main/[0.02] via-brand-primary/[0.02] to-transparent border border-text-main/10 rounded-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-widest border border-brand-primary/20">
                  <Mail className="w-3 h-3" />
                  <span>Get In Touch</span>
                </div>
                <h3 className="text-xl font-display font-black text-text-main uppercase tracking-tight">
                  Direct Registry Assistance
                </h3>
                <p className="text-xs text-text-dim/70 leading-relaxed font-medium">
                  Need help with your account, custom permissions, media registry, or general inquiries? Send a message directly to support.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={handleCopyEmail}
                  className="px-4 py-2.5 bg-text-main/5 hover:bg-text-main/10 border border-text-main/10 rounded-xl text-xs font-bold text-text-main uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-text-dim" />}
                  <span>{copiedEmail ? "Copied Mail" : "Copy Mail"}</span>
                </button>

                <a
                  href="mailto:arjunjareda2007@gmail.com?subject=Aether%20Sanctuary%20Registry%20Support%20Inquiry"
                  className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Mail</span>
                </a>
              </div>
            </div>

            {/* Email Address Footer */}
            <div className="pt-4 border-t border-text-main/5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-text-dim/60 font-mono text-[11px]">Direct Support Email:</span>
              <a 
                href="mailto:arjunjareda2007@gmail.com"
                className="font-mono text-brand-primary hover:underline font-bold text-xs flex items-center gap-1.5"
              >
                arjunjareda2007@gmail.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>

        {/* Live Sanctuary Statistics Section */}
        <section className="pt-10 border-t border-text-main/10">
          <div className="p-6 md:p-8 bg-text-main/[0.02] border border-text-main/10 rounded-2xl text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex p-3 bg-brand-primary/10 rounded-xl text-brand-primary border border-brand-primary/20">
              <Database className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-primary">Live Sanctuary Index</p>
              <h3 className="text-xl font-display font-black text-text-main uppercase tracking-tight">Preserved Dimensions</h3>
            </div>

            <div className="flex justify-center items-baseline gap-2 py-2">
              <span className="text-4xl md:text-6xl font-display font-black text-text-main tracking-tight">
                {totalPostsCount !== null ? totalPostsCount : "..."}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">artifacts</span>
            </div>

            <p className="text-xs text-text-dim/60 leading-relaxed font-medium max-w-md mx-auto">
              Preserved digital artifacts safely indexed and accessible across permanent galleries.
            </p>
          </div>
        </section>

        <footer className="text-center pt-8">
          <Logo size="sm" className="mx-auto opacity-20 hover:opacity-100 transition-opacity duration-300" />
        </footer>
      </div>
    </div>
  );
}
