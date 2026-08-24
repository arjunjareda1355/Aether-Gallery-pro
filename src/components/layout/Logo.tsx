import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const [logoConfig, setLogoConfig] = useState({
    logoText: 'Æ',
    logoIconUrl: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, COLLECTIONS.APP_SETTINGS, 'global_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLogoConfig({
          logoText: data.logoText || 'Æ',
          logoIconUrl: data.logoIconUrl || ''
        });
      }
    }, (err) => {
      console.warn("Resonance mapping: failsafe loaded for Logo config.", err);
    });
    return () => unsub();
  }, []);

  const sizeClasses = {
    xs: 'w-7 h-7 rounded-xl text-[12px]',
    sm: 'w-9 h-9 rounded-xl text-[14px]',
    md: 'w-11 h-11 rounded-2xl text-[17px]',
    lg: 'w-16 h-16 rounded-2xl text-[26px]',
    xl: 'w-22 h-22 rounded-[28px] text-[38px]'
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center group select-none shrink-0", className)}>
      {/* Subtle Warm Ambient Glow */}
      <div className="absolute inset-0 bg-brand-primary/25 blur-md rounded-2xl opacity-40 group-hover:opacity-80 group-hover:blur-lg transition-all duration-500 scale-95 group-hover:scale-105 pointer-events-none" />

      {/* Main Logo Container */}
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          "relative flex items-center justify-center overflow-hidden border border-white/15 bg-gradient-to-b from-white/[0.09] via-card-dark to-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors duration-300 group-hover:border-brand-primary/50 group-hover:shadow-[0_0_24px_rgba(242,125,38,0.25)]",
          sizeClasses[size]
        )}
      >
        {/* Subtle Diagonal Sheen Highlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

        {/* Central Emblem / Glyph / Image */}
        {logoConfig.logoIconUrl ? (
          <img 
            src={logoConfig.logoIconUrl} 
            alt="Logo" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain p-1.5 rounded-xl" 
          />
        ) : (
          <span className="font-display font-black tracking-tighter bg-gradient-to-b from-white via-amber-100 to-brand-primary bg-clip-text text-transparent drop-shadow-sm transform -translate-y-[0.5px]">
            {logoConfig.logoText || 'Æ'}
          </span>
        )}

        {/* Crisp Corner Accent */}
        <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-brand-primary/40 group-hover:bg-brand-primary transition-colors duration-300" />
      </motion.div>
    </div>
  );
}

