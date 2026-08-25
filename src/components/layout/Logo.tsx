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
    xs: 'w-9 h-9 md:w-10 md:h-10 rounded-full text-[14px]',
    sm: 'w-10 h-10 md:w-11 md:h-11 rounded-full text-[15px]',
    md: 'w-12 h-12 md:w-14 md:h-14 rounded-full text-[18px]',
    lg: 'w-16 h-16 md:w-20 md:h-20 rounded-full text-[26px]',
    xl: 'w-22 h-22 md:w-24 md:h-24 rounded-full text-[38px]'
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center group select-none shrink-0", className)}>
      {/* Subtle Warm Ambient Glow */}
      <div className="absolute inset-0 bg-brand-primary/25 blur-md rounded-full opacity-40 group-hover:opacity-80 group-hover:blur-lg transition-all duration-500 scale-95 group-hover:scale-105 pointer-events-none" />

      {/* Main Circular Logo Container */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-b from-white/[0.12] via-card-dark to-black/80 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 group-hover:border-brand-primary/60 group-hover:shadow-[0_0_24px_rgba(242,125,38,0.3)]",
          sizeClasses[size]
        )}
      >
        {/* Subtle Diagonal Sheen Highlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent pointer-events-none rounded-full" />

        {/* Central Circular Image Emblem */}
        {logoConfig.logoIconUrl ? (
          <img 
            src={logoConfig.logoIconUrl} 
            alt="Logo" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-full" 
          />
        ) : (
          <img 
            src="https://i.postimg.cc/8P2zP9z8/aether-logo.png" 
            alt="Aether Logo" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="w-full h-full object-cover rounded-full" 
          />
        )}

        {/* Fallback Glyph if image is not visible */}
        <span className="font-display font-black tracking-tighter bg-gradient-to-b from-white via-amber-100 to-brand-primary bg-clip-text text-transparent drop-shadow-sm transform -translate-y-[0.5px] pointer-events-none hidden only:inline-block">
          {logoConfig.logoText || 'Æ'}
        </span>
      </motion.div>
    </div>
  );
}

