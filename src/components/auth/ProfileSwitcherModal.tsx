import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User as UserIcon, 
  Plus, 
  Trash2, 
  Check, 
  Users, 
  ArrowRight,
  LogOut,
  Shield,
  Crown,
  Loader2,
  Zap,
  MoreVertical,
  KeyRound,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { User as UserType } from '../../types';
import { 
  SavedProfile, 
  getSavedProfiles, 
  removeSavedProfile, 
  clearAllSavedProfiles 
} from '../../services/profileManager';
import { useSessionList, useClerk } from '../../lib/clerk';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { hapticSelection, hapticSuccess, hapticLight } from '../../utils/haptics';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  onAddNewProfile: () => void;
  onSwitchToProfile: (profile: SavedProfile, sessionId?: string | null) => Promise<void> | void;
  onLogoutAll?: () => void;
  onLogoutCurrent?: () => void;
  onOpenProfile?: () => void;
}

interface UnifiedAccountItem {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  handle: string;
  photoURL: string | null;
  isAdmin?: boolean;
  isPremium?: boolean;
  theme?: string;
  lastActive?: number;
  sessionId?: string | null;
  isActive: boolean;
  hasActiveSession: boolean;
}

export default function ProfileSwitcherModal({
  isOpen,
  onClose,
  currentUser,
  onAddNewProfile,
  onSwitchToProfile,
  onLogoutAll,
  onLogoutCurrent
}: ProfileSwitcherModalProps) {
  const { t } = useTranslation();
  const clerk = useClerk();
  const { sessions, setActive } = useSessionList();

  const [switchingToUid, setSwitchingToUid] = useState<string | null>(null);
  const [switchingTarget, setSwitchingTarget] = useState<UnifiedAccountItem | null>(null);
  const [activeMenuUid, setActiveMenuUid] = useState<string | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [registryVersion, setRegistryVersion] = useState(0);

  // Compute unified list of accounts (Clerk active sessions + local saved accounts)
  const accounts = useMemo<UnifiedAccountItem[]>(() => {
    if (!isOpen) return [];

    const saved = getSavedProfiles();
    const map = new Map<string, UnifiedAccountItem>();

    // 1. Clerk Active Sessions
    if (sessions && Array.isArray(sessions)) {
      sessions.forEach(sess => {
        const u = sess.user;
        if (!u) return;
        const email = u.primaryEmailAddress?.emailAddress || null;
        const uid = u.id;
        const displayName = u.fullName || u.username || u.firstName || (email ? email.split('@')[0] : 'Curator');
        const handle = u.username ? `@${u.username}` : (email ? `@${email.split('@')[0]}` : `@curator_${uid.slice(-4)}`);
        const photoURL = u.imageUrl || null;
        const isCurrentActive = Boolean(
          currentUser && (currentUser.uid === uid || (email && currentUser.email?.toLowerCase() === email.toLowerCase()))
        );

        map.set(uid, {
          id: `clerk-sess-${sess.id}`,
          uid,
          email,
          displayName,
          handle,
          photoURL,
          isAdmin: currentUser && currentUser.uid === uid ? currentUser.isAdmin : false,
          isPremium: currentUser && currentUser.uid === uid ? currentUser.isPremium : false,
          sessionId: sess.id,
          isActive: isCurrentActive,
          hasActiveSession: true,
          lastActive: sess.lastActiveAt ? new Date(sess.lastActiveAt).getTime() : Date.now()
        });
      });
    }

    // 2. Locally Saved Profile History
    saved.forEach(sp => {
      const existing = map.get(sp.uid);
      const email = sp.email;
      const handle = email ? `@${email.split('@')[0]}` : `@resident_${sp.uid.slice(-4)}`;

      if (existing) {
        existing.isAdmin = existing.isAdmin || sp.isAdmin;
        existing.isPremium = existing.isPremium || sp.isPremium;
        existing.theme = sp.theme;
        if (sp.lastActive) existing.lastActive = Math.max(existing.lastActive || 0, sp.lastActive);
      } else {
        const isCurrentActive = Boolean(
          currentUser && (currentUser.uid === sp.uid || (sp.email && currentUser.email?.toLowerCase() === sp.email.toLowerCase()))
        );
        map.set(sp.uid, {
          id: `saved-prof-${sp.uid}`,
          uid: sp.uid,
          email: sp.email,
          displayName: sp.displayName,
          handle,
          photoURL: sp.photoURL,
          isAdmin: sp.isAdmin,
          isPremium: sp.isPremium,
          theme: sp.theme,
          lastActive: sp.lastActive,
          sessionId: sp.sessionId || null,
          isActive: isCurrentActive,
          hasActiveSession: false
        });
      }
    });

    // 3. Current active user guarantee
    if (currentUser && currentUser.uid && !map.has(currentUser.uid)) {
      const email = currentUser.email;
      const handle = email ? `@${email.split('@')[0]}` : `@resident_${currentUser.uid.slice(-4)}`;
      map.set(currentUser.uid, {
        id: `current-user-${currentUser.uid}`,
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        handle,
        photoURL: currentUser.photoURL,
        isAdmin: currentUser.isAdmin,
        isPremium: currentUser.isPremium,
        theme: currentUser.theme,
        lastActive: Date.now(),
        sessionId: null,
        isActive: true,
        hasActiveSession: true
      });
    }

    // Order: Active profile first, then by warm sessions, then by last active timestamp
    return Array.from(map.values()).sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.hasActiveSession && !b.hasActiveSession) return -1;
      if (!a.hasActiveSession && b.hasActiveSession) return 1;
      return (b.lastActive || 0) - (a.lastActive || 0);
    });
  }, [isOpen, sessions, currentUser, registryVersion]);

  const handleSwitch = async (account: UnifiedAccountItem) => {
    if (account.isActive) {
      onClose();
      return;
    }

    hapticSelection();
    setSwitchingToUid(account.uid);
    setSwitchingTarget(account);

    try {
      // 1. If Clerk session is already warm, switch instantly like YouTube/Instagram
      if (account.sessionId && setActive) {
        await setActive({ session: account.sessionId });
        hapticSuccess();
        setTimeout(() => {
          onClose();
        }, 280);
        return;
      }

      // Check if session exists in Clerk session list
      const matchingClerkSession = sessions?.find(
        s => s.user?.id === account.uid || (account.email && s.user?.primaryEmailAddress?.emailAddress?.toLowerCase() === account.email.toLowerCase())
      );

      if (matchingClerkSession && setActive) {
        await setActive({ session: matchingClerkSession.id });
        hapticSuccess();
        setTimeout(() => {
          onClose();
        }, 280);
        return;
      }

      // 2. Saved offline profile: trigger app switch handler
      const targetSaved: SavedProfile = {
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        photoURL: account.photoURL,
        isAdmin: account.isAdmin,
        isPremium: account.isPremium,
        theme: account.theme,
        lastActive: Date.now(),
        sessionId: account.sessionId
      };

      await onSwitchToProfile(targetSaved, account.sessionId);
    } catch (err) {
      console.error("Account switch error:", err);
      const targetSaved: SavedProfile = {
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        photoURL: account.photoURL,
        isAdmin: account.isAdmin,
        isPremium: account.isPremium,
        theme: account.theme,
        lastActive: Date.now()
      };
      onSwitchToProfile(targetSaved);
    } finally {
      setTimeout(() => {
        setSwitchingToUid(null);
        setSwitchingTarget(null);
      }, 400);
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, account: UnifiedAccountItem) => {
    e.stopPropagation();
    hapticLight();
    removeSavedProfile(account.uid);
    setActiveMenuUid(null);
    setRegistryVersion(v => v + 1);
  };

  const handleLogoutAllAccounts = () => {
    hapticLight();
    clearAllSavedProfiles();
    setRegistryVersion(v => v + 1);
    setConfirmLogoutAll(false);
    onClose();
    if (onLogoutAll) {
      onLogoutAll();
    } else if (clerk?.signOut) {
      clerk.signOut();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (!switchingToUid) onClose();
          }}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* YouTube / Instagram Style Accounts Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-[#0e0e12] border border-white/15 rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col max-h-[88vh]"
        >
          {/* Top Indicator Drag Bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header (Instagram/YouTube Style) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-display font-black text-white uppercase tracking-tight">
                Switch Account
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono font-bold text-zinc-400">
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Accounts List (YouTube/Instagram Row Items) */}
          <div className="px-4 py-3 overflow-y-auto custom-scrollbar space-y-1.5 flex-1">
            {accounts.map((acc, idx) => {
              const isSwitching = switchingToUid === acc.uid;
              const isMenuOpen = activeMenuUid === acc.uid;

              return (
                <div key={`acc-${acc.uid || 'account'}-${idx}`} className="relative">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSwitch(acc)}
                    className={cn(
                      "w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer select-none group border",
                      acc.isActive
                        ? "bg-brand-primary/10 border-brand-primary/40 shadow-md shadow-brand-primary/5"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15"
                    )}
                  >
                    {/* Left: Avatar with Ring + User Handle & Name */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {acc.photoURL ? (
                          <img
                            src={acc.photoURL}
                            alt={acc.displayName || 'Profile'}
                            referrerPolicy="no-referrer"
                            className={cn(
                              "w-12 h-12 rounded-full object-cover transition-all",
                              acc.isActive 
                                ? "ring-2 ring-brand-primary p-0.5" 
                                : "border border-white/15 group-hover:border-brand-primary/40"
                            )}
                          />
                        ) : (
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-zinc-300 transition-all",
                            acc.isActive
                              ? "bg-brand-primary/20 ring-2 ring-brand-primary text-brand-primary"
                              : "bg-white/5 border border-white/10 group-hover:text-white"
                          )}>
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}

                        {/* Warm Session Badge */}
                        {acc.hasActiveSession && !acc.isActive && (
                          <span 
                            title="Instant Switch Ready"
                            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-primary rounded-full border-2 border-[#0e0e12] flex items-center justify-center text-black"
                          >
                            <Zap className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className={cn(
                            "text-sm font-bold truncate leading-tight",
                            acc.isActive ? "text-white" : "text-zinc-200 group-hover:text-white"
                          )}>
                            {acc.displayName || 'Resident Curator'}
                          </h3>
                          {acc.isAdmin && (
                            <span className="px-1.5 py-0.5 rounded bg-brand-primary/20 text-brand-primary text-[8px] font-black uppercase tracking-wider border border-brand-primary/30 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                          {acc.isPremium && !acc.isAdmin && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> Pro
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-zinc-400 font-mono truncate">
                            {acc.handle || acc.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Instagram Checkmark OR Switch Arrow */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isSwitching ? (
                        <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                      ) : acc.isActive ? (
                        <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-black shadow-lg shadow-brand-primary/30">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuUid(isMenuOpen ? null : acc.uid);
                            }}
                            className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-brand-primary group-hover:text-black flex items-center justify-center text-zinc-400 transition-colors">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Context Menu for single account */}
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-4 top-14 z-50 bg-[#17171d] border border-white/15 rounded-2xl shadow-2xl p-1.5 min-w-[160px]"
                      >
                        <button
                          onClick={(e) => handleRemoveAccount(e, acc)}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove from device</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Bottom Actions (Instagram & YouTube style "+ Add Account" & Logouts) */}
          <div className="p-4 border-t border-white/5 bg-white/[0.015] space-y-2.5">
            {/* Add Account Button */}
            <button
              onClick={() => {
                onClose();
                onAddNewProfile();
              }}
              className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-primary/40 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm group"
            >
              <div className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="group-hover:text-brand-primary transition-colors">Add Account</span>
            </button>

            {/* Account Management Links */}
            <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-zinc-400 font-medium">
              {currentUser && onLogoutCurrent && (
                <button
                  onClick={() => {
                    onClose();
                    onLogoutCurrent();
                  }}
                  className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Log out @{currentUser.email ? currentUser.email.split('@')[0] : 'current'}</span>
                </button>
              )}

              {!confirmLogoutAll ? (
                <button
                  onClick={() => setConfirmLogoutAll(true)}
                  className="text-zinc-500 hover:text-red-400 transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                >
                  <span>Log out of all accounts</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-red-400 text-[10px] font-bold">Log out all?</span>
                  <button
                    onClick={handleLogoutAllAccounts}
                    className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded hover:bg-red-500/30 cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmLogoutAll(false)}
                    className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
