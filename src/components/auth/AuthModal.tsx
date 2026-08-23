import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  RefreshCw,
  Info,
  Check,
  Shield
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  sendEmailVerification
} from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onSuccess?: (message?: string) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}: AuthModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isCapsOn, setIsCapsOn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with prop change
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
      setResetSent(false);
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, initialMode]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-white/10' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: 'Too short', color: 'bg-red-500/50' };
    }
  };

  const passwordStrength = calculatePasswordStrength(password);

  // Detect Caps Lock
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setIsCapsOn(true);
    } else {
      setIsCapsOn(false);
    }
  };

  // Human friendly error mapper
  const parseAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return 'No account exists with this email. Would you like to create one?';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters (8+ recommended).';
      case 'auth/too-many-requests':
        return 'Access temporarily restricted due to multiple failed attempts. Please wait a few minutes or reset your password.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-by-user':
        return 'Sign-in cancelled by user.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please enable popups for this site.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection.';
      default:
        return err?.message?.replace('Firebase: ', '') || 'An error occurred during authentication.';
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
      onSuccess?.('Welcome to Aether Sanctum!');
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-by-user') {
        setError(parseAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    // Validation
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      try {
        setLoading(true);
        await sendPasswordResetEmail(auth, cleanEmail);
        setResetSent(true);
        setResendCooldown(60);
        setSuccessMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox and spam folder.`);
      } catch (err: any) {
        setError(parseAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }

      try {
        setLoading(true);
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        
        // Update user profile display name if provided
        if (displayName.trim() && cred.user) {
          try {
            await updateProfile(cred.user, {
              displayName: displayName.trim()
            });
          } catch (pErr) {
            console.warn('Could not update display name in auth object:', pErr);
          }
        }

        // Optional: send verification email
        try {
          if (cred.user) {
            await sendEmailVerification(cred.user);
          }
        } catch (vErr) {
          console.log('Email verification dispatch info:', vErr);
        }

        onSuccess?.(`Welcome to Aether, ${displayName.trim() || 'Creator'}! Your account has been created.`);
        onClose();
      } catch (err: any) {
        setError(parseAuthError(err));
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      try {
        setLoading(true);
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccess?.('Welcome back!');
        onClose();
      } catch (err: any) {
        setError(parseAuthError(err));
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-md bg-card-dark/95 border border-white/10 rounded-[32px] md:rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10 backdrop-blur-3xl"
        >
          {/* Ambient Glow Header */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-brand-primary/15 via-brand-primary/5 to-transparent pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-text-dim hover:text-text-main hover:bg-white/10 hover:border-white/20 transition-all z-20 active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-8 relative z-10">
            {/* Logo / Brand Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary/20 to-brand-primary/5 border border-brand-primary/30 text-brand-primary mb-3 shadow-lg shadow-brand-primary/10">
                {mode === 'forgot' ? (
                  <KeyRound className="w-6 h-6 animate-pulse" />
                ) : (
                  <Sparkles className="w-6 h-6 animate-pulse" />
                )}
              </div>
              <h2 className="text-2xl font-display font-black tracking-tight text-text-main">
                {mode === 'login' && 'Sign In to Aether'}
                {mode === 'signup' && 'Create Your Sanctuary'}
                {mode === 'forgot' && 'Reset Your Password'}
              </h2>
              <p className="text-xs text-text-dim/70 mt-1 font-medium">
                {mode === 'login' && 'Enter your credentials to access your curated sanctuary'}
                {mode === 'signup' && 'Join the private creator continuum & sync your collections'}
                {mode === 'forgot' && 'We’ll email you a secure link to recover your account'}
              </p>
            </div>

            {/* Mode Switcher Tabs (Only when not in forgot mode) */}
            {mode !== 'forgot' && (
              <div className="grid grid-cols-2 p-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={cn(
                    "py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all relative",
                    mode === 'login'
                      ? "text-bg-dark bg-text-main shadow-lg"
                      : "text-text-dim hover:text-text-main"
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={cn(
                    "py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all relative",
                    mode === 'signup'
                      ? "text-bg-dark bg-text-main shadow-lg"
                      : "text-text-dim hover:text-text-main"
                  )}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Google One-Click Button */}
            {mode !== 'forgot' && (
              <div className="space-y-4 mb-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-white hover:bg-white/95 active:scale-[0.99] text-gray-900 font-bold rounded-2xl flex items-center justify-center gap-3 text-xs uppercase tracking-wider shadow-[0_10px_25px_rgba(255,255,255,0.08)] border border-white/20 transition-all group disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/[0.08] w-full" />
                  <span className="bg-card-dark px-3 text-[10px] uppercase font-bold tracking-widest text-text-dim/50 whitespace-nowrap">
                    or continue with email
                  </span>
                  <div className="border-t border-white/[0.08] w-full" />
                </div>
              </div>
            )}

            {/* Error Message Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </motion.div>
            )}

            {/* Success Message Display */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{successMessage}</div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Display Name (Only in Signup mode) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-dim/80 mb-1.5">
                    Creator Name / Handle
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Arjun Vardhan"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs text-text-main placeholder:text-text-dim/30 focus:outline-none focus:border-brand-primary/50 focus:bg-white/[0.06] transition-all"
                    />
                    <User className="w-4 h-4 text-text-dim/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-dim/80 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs text-text-main placeholder:text-text-dim/30 focus:outline-none focus:border-brand-primary/50 focus:bg-white/[0.06] transition-all"
                  />
                  <Mail className="w-4 h-4 text-text-dim/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Password Field (Login & Signup) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-dim/80">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider text-brand-primary hover:underline"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={handleKeyUp}
                      placeholder="••••••••••••"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-11 text-xs text-text-main placeholder:text-text-dim/30 focus:outline-none focus:border-brand-primary/50 focus:bg-white/[0.06] transition-all"
                    />
                    <Lock className="w-4 h-4 text-text-dim/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-dim/50 hover:text-text-main p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Caps Lock Alert */}
                  {isCapsOn && (
                    <p className="text-[10px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Caps Lock is ON
                    </p>
                  )}

                  {/* Password Strength Meter in Signup Mode */}
                  {mode === 'signup' && password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-dim/60 font-medium">Strength</span>
                        <span className="font-bold text-text-main">{passwordStrength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", passwordStrength.color)}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password Field (Signup mode only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-dim/80 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className={cn(
                        "w-full bg-white/[0.03] border rounded-2xl py-3 pl-11 pr-11 text-xs text-text-main placeholder:text-text-dim/30 focus:outline-none focus:bg-white/[0.06] transition-all",
                        confirmPassword && password !== confirmPassword
                          ? "border-red-500/50 focus:border-red-500"
                          : confirmPassword && password === confirmPassword
                          ? "border-emerald-500/50 focus:border-emerald-500"
                          : "border-white/10 focus:border-brand-primary/50"
                      )}
                    />
                    <Lock className="w-4 h-4 text-text-dim/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-dim/50 hover:text-text-main p-1"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Sign In'}
                      {mode === 'signup' && 'Create Sanctuary Account'}
                      {mode === 'forgot' && 'Send Reset Link'}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login link when in Forgot Password mode */}
            {mode === 'forgot' && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-text-dim hover:text-text-main uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                >
                  <span>← Back to Sign In</span>
                </button>
              </div>
            )}

            {/* Security Badge Footer */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[10px] text-text-dim/40 font-medium tracking-wide">
              <Shield className="w-3 h-3 text-brand-primary/70" />
              <span>256-bit SSL Protected • Zero-Trust Auth Architecture</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
