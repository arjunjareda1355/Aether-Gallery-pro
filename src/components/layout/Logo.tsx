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

  const sizes = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  const fontSize = size === 'xs' ? '8px' : size === 'sm' ? '10px' : size === 'md' ? '14px' : size === 'lg' ? '20px' : '36px';

  return (
    <div className={cn("relative flex items-center justify-center group", sizes[size], className)}>
      {/* Background Pulse */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-brand-primary blur-xl rounded-full" 
      />
      
      {/* Dynamic Rings */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-2px] border border-brand-primary/20 rounded-full opacity-40 group-hover:opacity-100 transition-opacity" 
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-6px] border border-brand-primary/10 rounded-full opacity-20 group-hover:opacity-60 transition-opacity" 
      />
      
      {/* Core Prism Shield */}
      <motion.div 
        whileHover={{ rotate: 180, scale: 1.1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-primary rounded-[30%] rotate-45 shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)]"
      >
        {/* Inner Glass */}
        <div className="absolute inset-[2px] bg-bg-dark rounded-[28%] flex items-center justify-center overflow-hidden">
          <motion.div 
            animate={{ 
              y: [-10, 10, -10],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-b from-brand-primary/20 to-transparent" 
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </motion.div>
      
      {/* Central Symbol */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative text-text-main font-display font-medium flex items-center justify-center select-none drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] w-full h-full overflow-hidden p-1"
        style={{ fontSize }}
      >
        {logoConfig.logoIconUrl ? (
          <img 
            src={logoConfig.logoIconUrl} 
            alt="Logo" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain rounded-full scale-[0.85]" 
          />
        ) : (
          logoConfig.logoText
        )}
      </motion.div>

      {/* Orbiting Particles */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-primary rounded-full blur-[1px]" />
      </motion.div>
    </div>
  );
}
