import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Info, Heart, Shield, Terminal, ArrowRight, Github, ExternalLink, Globe, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/layout/Logo';

export default function AboutPage() {
  const sections = [
    {
      title: 'Our Sanctuary',
      icon: <Globe className="w-5 h-5 text-blue-400" />,
      content: 'Aether Gallery is a premium, atmospheric digital sanctuary designed for creators and curators who appreciate the finer side of media. We provide a distraction-free environment to host, explore, and deliberate over high-quality visual storytelling.'
    },
    {
      title: 'Smart Curation',
      icon: <Terminal className="w-5 h-5 text-brand-primary" />,
      content: 'Powered by Gemini AI, Aether features "AI Magic" for automated curation—generating poetic descriptions, aesthetic titles, and intelligent tags to make media management effortless.'
    },
    {
      title: 'Global Connectivity',
      icon: <ExternalLink className="w-5 h-5 text-orange-400" />,
      content: 'We support a wide array of cloud sources, including direct image links, video files, YouTube, Vimeo, and auto-transpiled Google Drive links, ensuring your media resides where you want it.'
    }
  ];

  const helpTopics = [
    { q: 'How do I add media?', a: 'Sign in as an administrator, go to the Dashboard, and paste a direct link to your image or video file. Use the "AI Magic" wand to auto-fill details.' },
    { q: 'What links are supported?', a: 'Direct image files (.jpg, .png, .webp), direct videos (.mp4, .webm), YouTube, Vimeo, and Google Drive sharing links.' },
    { q: 'Can I download media?', a: 'Yes! View any direct image or video in the modal and click the Download button in the sidebar.' },
    { q: 'How do collections work?', a: 'Save your favorite assets to personalized collections through your profile page to keep your workspace organized.' }
  ];

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20 px-4 md:px-10">
      <Link 
        to="/" 
        className="fixed top-8 left-4 md:left-10 z-[60] flex items-center gap-2 px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-white hover:bg-brand-primary/20 hover:border-brand-primary/30 transition-all group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-brand-primary" />
        Back to Sanctuary
      </Link>
      
      <div className="max-w-4xl mx-auto space-y-20">
        
        {/* Intro */}
        <section className="text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-4"
          >
            <Logo size="xl" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter uppercase text-white hover:text-brand-primary transition-colors cursor-default">
              Aether <span className="text-brand-primary">Gallery</span>
            </h1>
            <p className="text-text-dim text-xs md:text-sm font-bold uppercase tracking-[0.4em]">The Curated Media Sanctuary</p>
          </motion.div>
        </section>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((sec, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={sec.title}
              className="p-8 bg-card-dark border border-border-dark rounded-[40px] space-y-4 hover:border-brand-primary/30 transition-all hover:translate-y-[-4px]"
            >
              <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                {sec.icon}
              </div>
              <h3 className="text-lg font-display font-bold text-white">{sec.title}</h3>
              <p className="text-xs text-text-dim leading-relaxed font-medium">
                {sec.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Developer Teaser */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-1 max-w-2xl mx-auto"
        >
          <Link 
            to="/developer"
            className="group block p-8 bg-brand-primary/10 border border-brand-primary/20 rounded-[40px] text-center space-y-4 hover:bg-brand-primary/20 transition-all"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-primary flex items-center justify-center gap-2">
              <span className="w-8 h-[1px] bg-brand-primary/30" />
              Visionary behind the sanctuary
              <span className="w-8 h-[1px] bg-brand-primary/30" />
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black text-white group-hover:scale-105 transition-transform">Arjun Bharti Mina</h2>
            <p className="text-text-dim text-xs font-medium leading-relaxed max-w-md mx-auto">
              Independent Artist, Digital Creator, and Engineer bridging the gap between artistic expression and technical excellence.
            </p>
            <div className="flex items-center justify-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-widest pt-2">
              View Profile <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>
        </motion.section>

        {/* Help Center */}
        <section className="space-y-10 pt-10 border-t border-white/5">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-display font-extrabold text-white tracking-tight">Help Center</h2>
            <p className="text-text-dim text-xs font-bold uppercase tracking-widest">Common inquiries and assistance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helpTopics.map((topic, idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={topic.q}
                className="p-6 bg-card-dark border border-border-dark rounded-3xl space-y-2"
              >
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-primary rounded-full" />
                  {topic.q}
                </h4>
                <p className="text-xs text-text-dim leading-relaxed ml-3.5">
                  {topic.a}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <footer className="text-center pt-10 opacity-20">
          <Logo size="sm" className="mx-auto grayscale hover:grayscale-0 transition-all cursor-pointer" />
        </footer>
      </div>
    </div>
  );
}
