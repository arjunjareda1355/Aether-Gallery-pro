import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Minimize2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

interface PwaInstallPromptProps {
  deferredPrompt: any;
  isDismissed: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export default function PwaInstallPrompt({
  deferredPrompt,
  isDismissed,
  onInstall,
  onDismiss
}: PwaInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Add a graceful 2.5-second delay before displaying the prompt
  // so the user can experience the gallery first without an immediate pop-up interruption.
  useEffect(() => {
    if (deferredPrompt && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [deferredPrompt, isDismissed]);

  if (!deferredPrompt || isDismissed || !isVisible) {
    return null;
  }

  const handleInstall = () => {
    hapticSuccess();
    onInstall();
  };

  const handleDismiss = () => {
    hapticLight();
    onDismiss();
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    setIsMinimized(prev => !prev);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90] pointer-events-auto">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Micro Badge / FAB */
          <motion.button
            key="minimized-install-chip"
            initial={{ opacity: 0, scale: 0.7, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 15 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            onClick={handleInstall}
            title="Install Aether Web App"
            className="group relative flex items-center gap-2 p-2.5 sm:p-3 bg-card-dark/95 backdrop-blur-2xl border border-brand-primary/30 hover:border-brand-primary/60 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-brand-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <div className="relative">
              <Download className="w-4 h-4 text-brand-primary group-hover:translate-y-0.5 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-primary animate-ping" />
            </div>
            <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-text-main pr-1">
              Install App
            </span>
          </motion.button>
        ) : (
          /* Compact, Minimized Sleek Pill Banner */
          <motion.div
            key="sleek-install-pill"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 pl-3 sm:pl-3.5 bg-card-dark/95 backdrop-blur-2xl border border-white/10 hover:border-brand-primary/30 rounded-2xl sm:rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-white max-w-[calc(100vw-2rem)] sm:max-w-md transition-colors"
          >
            {/* App Icon / Badge */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            {/* Label & Description */}
            <div className="flex flex-col min-w-0 pr-1 sm:pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-text-main truncate">
                  Aether Sanctuary
                </span>
                <span className="hidden xs:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-brand-primary/10 text-brand-primary text-[8px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-2 h-2" /> App
                </span>
              </div>
              <span className="text-[9px] text-text-dim/70 truncate font-medium">
                Install for offline access & faster experience
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleInstall}
                className="px-3 sm:px-3.5 py-1.5 bg-brand-primary hover:brightness-110 active:scale-95 text-bg-dark font-black text-[9px] sm:text-[10px] uppercase tracking-wider rounded-xl sm:rounded-full shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Install</span>
              </button>

              <button
                type="button"
                onClick={handleMinimize}
                title="Minimize banner"
                className="p-1.5 text-text-dim/60 hover:text-text-main hover:bg-white/5 rounded-lg sm:rounded-full transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                title="Dismiss"
                className="p-1.5 text-text-dim/60 hover:text-text-main hover:bg-white/5 rounded-lg sm:rounded-full transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
