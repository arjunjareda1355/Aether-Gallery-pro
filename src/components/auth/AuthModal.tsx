import React, { useState, useEffect, useRef } from 'react';
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
  const notifiedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (isOpen) {
      setTab(initialMode === 'signup' ? 'signup' : 'login');
      notifiedRef.current = false;
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen && isSignedIn && user && !notifiedRef.current) {
      notifiedRef.current = true;
      const name = user.firstName || user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Resident';
      onSuccessRef.current?.(`Welcome back, ${name}`);
      const timer = setTimeout(() => {
        onCloseRef.current();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSignedIn, user]);

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
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Secure Sanctuary Gateway
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
                  ? "bg-brand-primary text-white font-black shadow-lg shadow-brand-primary/20"
                  : "text-text-dim hover:text-white hover:bg-white/5"
              )}
            >
              <UserPlus className="w-3.5 h-3.5" /> Create Account
            </button>
          </div>

          {/* Auth Container */}
          <div className="p-6 flex justify-center items-center min-h-[420px]">
            {tab === 'login' ? (
              <SignIn 
                routing="virtual"
                initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
                fallbackRedirectUrl={typeof window !== 'undefined' ? window.location.href : '/'}
                appearance={{
                  layout: {
                    unsafe_disableDevelopmentModeWarnings: true,
                    socialButtonsPlacement: 'top',
                    socialButtonsVariant: 'iconButton',
                    showOptionalFields: false,
                    logoPlacement: 'none',
                  },
                  elements: {
                    rootBox: "w-full flex justify-center",
                    card: "bg-transparent shadow-none border-none p-0 w-full",
                    header: "hidden",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    footer: "hidden",
                    footerAction: "hidden",
                    socialButtonsRoot: "flex justify-center gap-3 w-full mb-3",
                    socialButtons: "flex justify-center gap-3 w-full",
                    socialButtonsIconButton: "border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-2xl p-3 h-12 w-12 flex items-center justify-center transition-all shadow-md hover:scale-105",
                    socialButtonsBlockButton: "border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all",
                    socialButtonsBlockButtonText: "hidden",
                    formButtonPrimary: "!bg-orange-500 hover:!bg-orange-600 !text-white !opacity-100 font-black py-3.5 px-6 rounded-2xl shadow-lg !shadow-orange-500/30 uppercase tracking-wider text-xs transition-all cursor-pointer",
                    formButtonPrimaryText: "!text-white !opacity-100 font-black uppercase tracking-wider text-xs",
                    formFieldInput: "bg-white/5 border border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-zinc-500 text-sm font-medium",
                    formFieldLabel: "text-xs font-bold text-zinc-300 uppercase tracking-wide",
                    dividerLine: "bg-white/10",
                    dividerText: "text-zinc-500 text-[11px] uppercase font-bold tracking-wider",
                    identityPreviewText: "text-white font-medium",
                    identityPreviewEditButton: "text-orange-400 hover:text-orange-300 font-bold",
                  }
                }}
              />
            ) : (
              <SignUp 
                routing="virtual"
                initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
                fallbackRedirectUrl={typeof window !== 'undefined' ? window.location.href : '/'}
                appearance={{
                  layout: {
                    unsafe_disableDevelopmentModeWarnings: true,
                    socialButtonsPlacement: 'top',
                    socialButtonsVariant: 'iconButton',
                    showOptionalFields: false,
                    logoPlacement: 'none',
                  },
                  elements: {
                    rootBox: "w-full flex justify-center",
                    card: "bg-transparent shadow-none border-none p-0 w-full",
                    header: "hidden",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    footer: "hidden",
                    footerAction: "hidden",
                    socialButtonsRoot: "flex justify-center gap-3 w-full mb-3",
                    socialButtons: "flex justify-center gap-3 w-full",
                    socialButtonsIconButton: "border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-2xl p-3 h-12 w-12 flex items-center justify-center transition-all shadow-md hover:scale-105",
                    socialButtonsBlockButton: "border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all",
                    socialButtonsBlockButtonText: "hidden",
                    formButtonPrimary: "!bg-orange-500 hover:!bg-orange-600 !text-white !opacity-100 font-black py-3.5 px-6 rounded-2xl shadow-lg !shadow-orange-500/30 uppercase tracking-wider text-xs transition-all cursor-pointer",
                    formButtonPrimaryText: "!text-white !opacity-100 font-black uppercase tracking-wider text-xs",
                    formFieldInput: "bg-white/5 border border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-zinc-500 text-sm font-medium",
                    formFieldLabel: "text-xs font-bold text-zinc-300 uppercase tracking-wide",
                    dividerLine: "bg-white/10",
                    dividerText: "text-zinc-500 text-[11px] uppercase font-bold tracking-wider",
                    identityPreviewText: "text-white font-medium",
                    identityPreviewEditButton: "text-orange-400 hover:text-orange-300 font-bold",
                  }
                }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
