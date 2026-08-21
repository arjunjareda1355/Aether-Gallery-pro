import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Sun, Moon, Palette, Zap, Box, Layers, Crown, LayoutGrid } from 'lucide-react';
import { cn, useBodyScrollLock } from '../../lib/utils';

interface Theme {
  id: string;
  name: string;
  color: string;
  icon: any;
  description: string;
  isPremium?: boolean;
}

const THEMES: Theme[] = [
  { id: 'orange', name: 'Cyber Amber', color: '#f27d26', icon: Zap, description: 'Original core frequency' },
  { id: 'purple', name: 'Nebula Mist', color: '#a855f7', icon: Sparkles, description: 'Ethereal cosmic glow' },
  { id: 'blue', name: 'Deep Azure', color: '#3b82f6', icon: Moon, description: 'Abyssal depth vision' },
  { id: 'emerald', name: 'Jade Zen', color: '#10b981', icon: Sparkles, description: 'Bio-luminescent growth' },
  { id: 'rose', name: 'Solar Flare', color: '#f43f5e', icon: Sparkles, description: 'Intense sensory warmth' },
  { id: 'rainbow', name: 'Prism Overdrive', color: 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff)', icon: Palette, description: 'Full spectrum resonance' },
  { id: 'bright', name: 'Void White', color: '#ffffff', icon: Sun, description: 'High-energy clarity' },
  { id: 'glass-ethereal', name: 'Glass Protocol', color: '#e2e8f0', icon: Layers, description: 'Transparent architecture' },
  { id: 'synthwave', name: 'Vapor Wave', color: '#ff00ff', icon: Zap, description: 'Retro-future neon' },
  { id: 'borderline-dark', name: 'Midnight Mono', color: '#000000', icon: Box, description: 'Pure minimalist void' },
  { id: 'borderline-light', name: 'Paper Minimal', color: '#ffffff', icon: Box, description: 'Architectural lines' },
  { id: 'mixed', name: 'Hyper Fusion', color: 'linear-gradient(45deg, #00f2ff, #7000ff)', icon: LayoutGrid, description: 'Aggressive mixed energy' },
  { id: 'premium-owner', name: 'Divine Cipher', color: '#ffd700', icon: Crown, description: 'Architect exclusivity', isPremium: true },
];

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeSelect: (themeId: string) => void;
  isAdmin?: boolean;
}

export default function ThemeSelector({ isOpen, onClose, currentTheme, onThemeSelect, isAdmin }: ThemeSelectorProps) {
  useBodyScrollLock(isOpen);
  const filteredThemes = THEMES.filter(t => !t.isPremium || isAdmin);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-dark/90 backdrop-blur-3xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-card-dark border border-border-dark rounded-[40px] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.9)] z-10 p-6 md:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-xl md:text-3xl font-display font-black text-text-main uppercase tracking-tighter italic">Frequencies</h2>
                <p className="text-[10px] text-text-dim/30 font-black uppercase tracking-[0.3em]">Sanctuary Atmosphere Protocol</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-all text-text-dim hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 max-h-[40vh] md:max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
              {filteredThemes.map((theme) => {
                const Icon = theme.icon;
                const isSelected = currentTheme === theme.id;
                
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onThemeSelect(theme.id);
                      onClose();
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2.5 md:p-4 rounded-[20px] md:rounded-[28px] border transition-all duration-700 text-center group relative",
                      isSelected 
                        ? "bg-brand-primary/[0.08] border-brand-primary/40 shadow-2xl" 
                        : "bg-white/[0.01] border-white/5 hover:border-white/20 hover:bg-white/[0.03]"
                    )}
                  >
                    {isSelected && (
                      <motion.div layoutId="theme-active" className="absolute inset-0 border-2 border-brand-primary rounded-[20px] md:rounded-[28px] pointer-events-none" />
                    )}
                    <div 
                      className={cn(
                        "w-8 h-8 md:w-12 md:h-12 rounded-[12px] md:rounded-[18px] flex items-center justify-center shrink-0 shadow-2xl transition-all duration-700 group-hover:rotate-[15deg] group-hover:scale-110",
                      )}
                      style={{ 
                        background: theme.color,
                        color: (theme.id === 'bright' || theme.id === 'borderline-light' || theme.id === 'glass-ethereal') ? '#000' : '#fff'
                      }}
                    >
                      <Icon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[7px] md:text-[8px] font-black uppercase tracking-widest truncate", isSelected ? "text-brand-primary" : "text-text-dim/40 group-hover:text-text-main")}>
                        {theme.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-2">
              <button 
                onClick={onClose}
                className="flex-1 py-2.5 bg-text-main/[0.02] border border-border-dark rounded-xl text-[8px] font-black uppercase tracking-widest text-text-dim hover:text-text-main hover:bg-text-main/[0.05] transition-all"
              >
                Close Frequencies
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
