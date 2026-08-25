import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, UserPlus, LogIn, ShieldCheck } from 'lucide-react';
import { SignIn, SignUp, useUser } from '../../lib/clerk';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'verify-prompt';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  initialEmail?: string;
  onSuccess?: (message?: string) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  initialEmail = '',
  onSuccess
}: AuthModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'login' | 'signup'>(initialMode === 'signup' ? 'signup' : 'login');
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isOpen) {
      setTab(initialMode === 'signup' ? 'signup' : 'login');
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen && isSignedIn && user) {
      onSuccess?.(`Welcome back, ${user.firstName || user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Resident'}`);
      const timer = setTimeout(() => {
        onClose();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSignedIn, user, onClose, onSuccess]);

  if (!isOpen) return null;

  if (isSignedIn && user) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} />
        <div className="relative w-full max-w-sm p-8 bg-card-dark border border-white/10 rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] text-center z-10">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black uppercase tracking-wider text-text-main mb-1">
            Identity Authenticated
          </h3>
          <p className="text-xs text-text-dim mb-4">
            Welcome, {user.firstName || user.username || user.primaryEmailAddress?.emailAddress || 'Resident'}
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-brand-primary text-bg-dark rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Continue to Sanctuary
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-md my-8 bg-card-dark border border-white/10 rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10"
        >
          {/* Header Bar */}
          <div className="p-6 pb-2 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-text-main">
                  Aether Identity
                </h3>
                <p className="text-[10px] text-text-dim flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Powered by Clerk Auth
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-text-dim hover:text-text-main hover:bg-white/5 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-6 pt-4 flex gap-2">
            <button
              onClick={() => setTab('login')}
              className={cn(
                "flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                tab === 'login'
                  ? "bg-white/10 text-white shadow-inner border border-white/10"
                  : "text-text-dim hover:text-white hover:bg-white/5"
              )}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={cn(
                "flex-1 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                tab === 'signup'
                  ? "bg-brand-primary text-bg-dark font-black shadow-lg shadow-brand-primary/20"
                  : "text-text-dim hover:text-white hover:bg-white/5"
              )}
            >
              <UserPlus className="w-3.5 h-3.5" /> Create Account
            </button>
          </div>

          {/* Clerk Auth Container */}
          <div className="p-6 flex justify-center items-center min-h-[400px] relative">
            <div className={cn("w-full transition-opacity duration-150", tab === 'login' ? "block opacity-100" : "hidden opacity-0")}>
              <SignIn 
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full flex justify-center",
                    card: "bg-transparent shadow-none border-none p-0 w-full",
                    header: "hidden",
                    footer: "border-t border-white/5 pt-3 mt-3"
                  }
                }}
              />
            </div>

            <div className={cn("w-full transition-opacity duration-150", tab === 'signup' ? "block opacity-100" : "hidden opacity-0")}>
              <SignUp 
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full flex justify-center",
                    card: "bg-transparent shadow-none border-none p-0 w-full",
                    header: "hidden",
                    footer: "border-t border-white/5 pt-3 mt-3"
                  }
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
