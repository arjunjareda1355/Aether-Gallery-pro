import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { 
  dispatchVerificationLink, 
  checkEmailVerifiedStatus, 
  recordEmailVerifiedInFirestore 
} from '../../services/emailVerificationService';
import { hapticLight, hapticSuccess, hapticError, hapticMedium, hapticSparkle } from '../../utils/haptics';
import { useUser } from '../../lib/clerk';
import { cn } from '../../lib/utils';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  displayName?: string | null;
  onVerified?: () => void;
  autoDispatchOnOpen?: boolean;
}

export default function EmailVerificationModal({
  isOpen,
  onClose,
  email,
  displayName,
  onVerified,
  autoDispatchOnOpen = true
}: EmailVerificationModalProps) {
  const { user: clerkUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [directLink, setDirectLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeEmail = email?.trim().toLowerCase() || clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';

  // Initial dispatch on opening
  useEffect(() => {
    if (isOpen && activeEmail) {
      setError(null);
      setSuccess(false);
      setCooldown(60);
      setDirectLink(null);

      if (autoDispatchOnOpen) {
        handleSendLink();
      }
    }
  }, [isOpen, activeEmail, autoDispatchOnOpen]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: any;
    if (cooldown > 0 && isOpen) {
      timer = setInterval(() => {
        setCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown, isOpen]);

  // Automated background polling & window focus listener for link verification detection
  useEffect(() => {
    if (!isOpen || success || !activeEmail) return;

    const performSilentCheck = async () => {
      try {
        const isVerified = await checkEmailVerifiedStatus(activeEmail);
        if (isVerified) {
          triggerSuccessState();
        }
      } catch (err) {
        // silent check
      }
    };

    // Polling interval every 3.5 seconds
    const interval = setInterval(performSilentCheck, 3500);

    // Also trigger on window focus (when returning from email inbox tab)
    const handleFocus = () => {
      performSilentCheck();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isOpen, success, activeEmail]);

  const triggerSuccessState = () => {
    setSuccess(true);
    hapticSuccess();
    hapticSparkle();

    if (clerkUser?.id) {
      recordEmailVerifiedInFirestore(clerkUser.id);
    }

    if (onVerified) {
      onVerified();
    }

    // Graceful auto close after showing celebration
    setTimeout(() => {
      onClose();
    }, 2200);
  };

  const handleSendLink = async () => {
    if (!activeEmail) return;
    try {
      setIsResending(true);
      setError(null);
      hapticLight();

      const result = await dispatchVerificationLink(activeEmail, displayName);
      if (!result.success) {
        throw new Error(result.error || result.message || 'Could not send verification link');
      }

      if (result.verificationLink) {
        setDirectLink(result.verificationLink);
      }
    } catch (err: any) {
      console.error('Error dispatching verification link:', err);
      setError(err?.message || 'Could not send verification email link. Please try again.');
      hapticError();
    } finally {
      setIsResending(false);
    }
  };

  const handleResendClick = () => {
    if (cooldown > 0 || isResending) return;
    hapticMedium();
    setCooldown(60);
    handleSendLink();
  };

  const handleManualCheck = async () => {
    if (checking || success) return;
    setChecking(true);
    setError(null);
    hapticMedium();

    try {
      const isVerified = await checkEmailVerifiedStatus(activeEmail);
      if (isVerified) {
        triggerSuccessState();
      } else {
        hapticError();
        setError('Verification pending. Please check your inbox and click the verification link sent to your email.');
      }
    } catch (err: any) {
      setError('Could not verify status right now. Please try again in a moment.');
    } finally {
      setChecking(false);
    }
  };

  const handleCopyLink = () => {
    if (!directLink) return;
    navigator.clipboard.writeText(directLink);
    setCopied(true);
    hapticLight();
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="email-verification-modal-backdrop" 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300"
      >
        <motion.div
          id="email-verification-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-card-dark border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col text-center"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-primary/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            id="btn-close-email-verification-modal"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-full text-text-dim hover:text-white bg-white/[0.03] hover:bg-white/10 border border-white/5 transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Body Content */}
          <div className="relative z-10 flex flex-col items-center space-y-5 my-auto">
            {/* Top Icon with Status Animation */}
            <div className="relative">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500",
                success 
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 scale-110 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
                  : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.15)]"
              )}>
                {success ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 stroke-[2.5] animate-in zoom-in-50 duration-300" />
                ) : (
                  <Mail className="w-8 h-8 stroke-[1.75] animate-pulse" />
                )}
              </div>
              
              {!success && (
                <div className="absolute -bottom-1 -right-1 p-1 bg-bg-dark border border-white/10 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                </div>
              )}
            </div>

            {/* Heading & Subtitle */}
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-xl font-display font-black uppercase tracking-tight text-text-main">
                {success ? 'Identity Verified' : 'Verify Your Email'}
              </h3>
              <p className="text-xs text-text-dim leading-relaxed">
                {success 
                  ? 'Your registered email address has been authenticated successfully.' 
                  : 'We have dispatched a verification link to your email address. Click the link in your inbox to complete verification.'}
              </p>
            </div>

            {/* Email Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-text-main font-semibold max-w-full truncate select-all">
              <Mail className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="truncate">{activeEmail}</span>
            </div>

            {/* Error banner */}
            {error && !success && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </motion.div>
            )}

            {/* Active Listening Indicator */}
            {!success && (
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-text-dim/60 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                </span>
                <span>Listening for verification confirmation...</span>
              </div>
            )}

            {/* Action Buttons */}
            {!success ? (
              <div className="w-full space-y-2.5 pt-2">
                {/* Primary Action: Check Verification Status */}
                <button
                  type="button"
                  id="btn-check-verification-status"
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="w-full py-3.5 bg-brand-primary text-bg-dark rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(var(--brand-primary-rgb),0.25)] disabled:opacity-50"
                >
                  {checking ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking Status...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>I've Clicked the Link / Check Status</span>
                    </>
                  )}
                </button>

                {/* Secondary Actions Row */}
                <div className="flex items-center gap-2">
                  {/* Resend Link Button */}
                  <button
                    type="button"
                    id="btn-resend-verification-link"
                    onClick={handleResendClick}
                    disabled={cooldown > 0 || isResending}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[10px] font-black uppercase tracking-wider text-text-dim hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span>Resend link in {cooldown}s</span>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Verification Link</span>
                      </>
                    )}
                  </button>

                  {/* Direct Link Copier (for seamless instant verification) */}
                  {directLink && (
                    <button
                      type="button"
                      id="btn-copy-direct-verification-link"
                      onClick={handleCopyLink}
                      className="px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[10px] font-black uppercase tracking-wider text-text-dim hover:text-brand-primary transition-all flex items-center gap-1.5 shrink-0"
                      title="Copy direct verification link"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full pt-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-bold text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sanctuary Email Successfully Verified</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
