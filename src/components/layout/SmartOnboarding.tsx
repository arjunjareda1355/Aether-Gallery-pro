import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Eye, Shield, Feather } from 'lucide-react';
import { cn, useBodyScrollLock } from '../../lib/utils';
import Logo from './Logo';

interface SmartOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
  userName?: string;
}

export default function SmartOnboarding({ onComplete, onSkip, userName }: SmartOnboardingProps) {
  useBodyScrollLock(true);

  // Fallback skip to onComplete if onSkip isn't provided
  const handleStart = onComplete;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-bg-dark flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Soft Ethereal Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-gradient-to-br from-brand-primary/10 to-brand-secondary/5 blur-[160px] rounded-full animate-pulse duration-[8000ms]" />
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-2xl px-6 md:px-8 flex flex-col items-center justify-between h-full max-h-[100dvh] py-6 md:py-8 overflow-y-auto no-scrollbar z-10">
        
        {/* Top Header Label */}
         <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 0.5, y: 0 }}
           transition={{ delay: 0.2, duration: 1 }}
           className="flex items-center gap-2 select-none mb-2 md:mb-0 shrink-0"
         >
           <span className="text-[10px] font-mono tracking-[0.6em] uppercase text-text-dim/60">Aether Frequency Portal</span>
         </motion.div>

        {/* Content Body */}
        <div className="flex flex-col items-center text-center my-auto space-y-4 md:space-y-8 py-2 w-full shrink-0">
          {/* Logo Showcase */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="relative scale-75 sm:scale-90 md:scale-100"
          >
            <div className="p-3 md:p-6 bg-white/[0.01] border border-white/5 rounded-[24px] md:rounded-[40px] shadow-[0_0_80px_rgba(var(--brand-primary-rgb),0.05)]">
              <Logo size="lg" className="h-14 w-14 md:w-20 md:h-20" />
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-x-[-12px] inset-y-[-12px] md:inset-x-[-15px] md:inset-y-[-15px] border border-dashed border-white/5 rounded-full pointer-events-none"
            />
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-2 md:space-y-4"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary">
                {userName ? `Welcome back, ${userName}` : 'Initiating Sanctuary'}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-display font-light text-text-main tracking-[0.25em] uppercase leading-none">
              A E T H E R
            </h1>
            
            <p className="text-[9.5px] md:text-[12px] text-text-dim/60 max-w-sm md:max-w-md mx-auto leading-relaxed font-bold uppercase tracking-[0.15em] px-4">
              The pristine digital haven for curated inspiration and high-resolution manifestations.
            </p>
          </motion.div>

          {/* Minimal Highlights Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6 w-full max-w-xl border-t border-b border-white/[0.03] py-3 md:py-6 px-1"
          >
            {[
              { 
                icon: <Eye className="w-3.5 h-3.5 md:w-5 md:h-5 text-brand-primary" />, 
                title: "Pure Vision", 
                desc: "Filter fluidly through images, video loops, and live frequencies." 
              },
              { 
                icon: <Shield className="w-3.5 h-3.5 md:w-5 md:h-5 text-brand-secondary" />, 
                title: "Sanctuaries", 
                desc: "Craft and preserve curated private or public collections." 
              },
              { 
                icon: <Feather className="w-3.5 h-3.5 md:w-5 md:h-5 text-brand-primary" />, 
                title: "Resonance", 
                desc: "Discover beautiful, immersive visual custom theme dimensions." 
              }
            ].map((item, i) => (
              <div key={`onboarding-step-${item.title}-${i}`} className="flex flex-col items-center justify-start text-center gap-1.5 md:gap-2.5">
                <div className="p-1.5 md:p-2 bg-white/[0.02] border border-white/5 rounded-full shrink-0">
                  {item.icon}
                </div>
                <div className="space-y-0.5 md:space-y-1">
                  <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-text-main">
                    {item.title}
                  </h3>
                  <p className="hidden sm:block text-[8.5px] md:text-[9px] text-text-dim/45 leading-relaxed font-semibold uppercase tracking-wider max-w-[160px]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Enter Curation sequence */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex flex-col items-center gap-3 md:gap-4 w-full mt-4 md:mt-0 pb-4 md:pb-0 shrink-0"
        >
          <button
            onClick={handleStart}
            className="relative overflow-hidden w-full max-w-xs md:max-w-none md:w-auto px-12 md:px-14 py-3 md:py-4 rounded-full bg-white text-bg-dark font-black uppercase tracking-[0.3em] text-[9px] md:text-[9.5px] shadow-[0_20px_40px_rgba(255,255,255,0.04)] hover:shadow-[0_25px_50px_rgba(var(--brand-primary-rgb),0.2)] hover:bg-brand-primary transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer"
          >
            Enter Sanctuary
          </button>
          
          <button 
            onClick={onSkip || handleStart}
            className="text-[8.5px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-text-dim/40 hover:text-text-dim transition-colors cursor-pointer py-1"
          >
            Skip Sequence
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}
