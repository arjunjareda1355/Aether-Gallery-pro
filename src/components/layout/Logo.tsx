import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  return (
    <div className={cn("relative flex items-center justify-center group", sizes[size], className)}>
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full animate-pulse group-hover:bg-brand-primary/40 transition-colors" />
      
      {/* Outer Rotating Ring */}
      <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_10s_linear_infinite] group-hover:border-brand-primary/30 transition-colors" />
      
      {/* Prism Shape */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-primary rounded-2xl rotate-45 transform group-hover:rotate-180 transition-transform duration-1000 shadow-2xl shadow-brand-primary/20" />
      
      {/* Inner Void */}
      <div className="absolute inset-[3px] bg-bg-dark rounded-[13px] rotate-45 flex items-center justify-center overflow-hidden">
         {/* Atmospheric Shimmer */}
         <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/5 to-transparent" />
      </div>
      
      {/* Symbol */}
      <div className="relative text-white font-display font-black flex items-center justify-center select-none pointer-events-none" 
           style={{ fontSize: size === 'sm' ? '10px' : size === 'md' ? '14px' : size === 'lg' ? '20px' : '36px' }}>
        Æ
      </div>
    </div>
  );
}
