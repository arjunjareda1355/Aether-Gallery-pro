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
  KeyRound
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

interface UnifiedProfileItem {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
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

  const [switchingToId, setSwitchingToId] = useState<string | null>(null);
  const [switchingTarget, setSwitchingTarget] = useState<UnifiedProfileItem | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [savedUpdateTrigger, setSavedUpdateTrigger] = useState(0);

  // Compute unified profiles declaratively with useMemo - eliminates setState loops
  const unifiedProfiles = useMemo(() => {
    if (!isOpen) return [];

    const saved = getSavedProfiles();
    const map = new Map<string, UnifiedProfileItem>();

    // 1. Add Clerk active sessions
    if (sessions && Array.isArray(sessions)) {
      sessions.forEach(sess => {
        const u = sess.user;
        if (!u) return;
        const email = u.primaryEmailAddress?.emailAddress || null;
        const uid = u.id;
        const displayName = u.fullName || u.username || u.firstName || (email ? email.split('@')[0] : 'Curator');
        const photoURL = u.imageUrl || null;
        const isCurrentActive = Boolean(
          currentUser && (currentUser.uid === uid || (email && currentUser.email?.toLowerCase() === email.toLowerCase()))
        );

        const item: UnifiedProfileItem = {
          id: `clerk-sess-${sess.id}`,
          uid: uid,
          email: email,
          displayName: displayName,
          photoURL: photoURL,
          isAdmin: currentUser && currentUser.uid === uid ? currentUser.isAdmin : false,
          isPremium: currentUser && currentUser.uid === uid ? currentUser.isPremium : false,
          sessionId: sess.id,
          isActive: isCurrentActive,
          hasActiveSession: true,
          lastActive: sess.lastActiveAt ? new Date(sess.lastActiveAt).getTime() : Date.now()
        };

        map.set(uid, item);
      });
    }

    // 2. Merge with locally saved sanctuary history
    saved.forEach(sp => {
      const existing = map.get(sp.uid);
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

    // 3. Ensure current active user is represented
    if (currentUser && currentUser.uid && !map.has(currentUser.uid)) {
      map.set(currentUser.uid, {
        id: `current-user-${currentUser.uid}`,
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
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

    return Array.from(map.values()).sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.hasActiveSession && !b.hasActiveSession) return -1;
      if (!a.hasActiveSession && b.hasActiveSession) return 1;
      return (b.lastActive || 0) - (a.lastActive || 0);
    });
  }, [isOpen, sessions, currentUser, savedUpdateTrigger]);

  const handleSelectProfile = async (item: UnifiedProfileItem) => {
    if (item.isActive) {
      onClose();
      return;
    }

    hapticSelection();
    setSwitchingToId(item.id);
    setSwitchingTarget(item);

    try {
      if (item.sessionId && setActive) {
        await setActive({ session: item.sessionId });
        hapticSuccess();
        setTimeout(() => {
          onClose();
        }, 350);
        return;
      }

      const matchingClerkSession = sessions?.find(
        s => s.user?.id === item.uid || (item.email && s.user?.primaryEmailAddress?.emailAddress?.toLowerCase() === item.email.toLowerCase())
      );
      if (matchingClerkSession && setActive) {
        await setActive({ session: matchingClerkSession.id });
        hapticSuccess();
        setTimeout(() => {
          onClose();
        }, 350);
        return;
      }

      const targetSaved: SavedProfile = {
        uid: item.uid,
        email: item.email,
        displayName: item.displayName,
        photoURL: item.photoURL,
        isAdmin: item.isAdmin,
        isPremium: item.isPremium,
        theme: item.theme,
        lastActive: Date.now(),
        sessionId: item.sessionId
      };

      await onSwitchToProfile(targetSaved, item.sessionId);
    } catch (err) {
      console.error("Profile switch error:", err);
      const targetSaved: SavedProfile = {
        uid: item.uid,
        email: item.email,
        displayName: item.displayName,
        photoURL: item.photoURL,
        isAdmin: item.isAdmin,
        isPremium: item.isPremium,
        theme: item.theme,
        lastActive: Date.now()
      };
      onSwitchToProfile(targetSaved);
    } finally {
      setTimeout(() => {
        setSwitchingToId(null);
        setSwitchingTarget(null);
      }, 500);
    }
  };

  const handleRemoveProfile = (e: React.MouseEvent, item: UnifiedProfileItem) => {
    e.stopPropagation();
    hapticLight();
    removeSavedProfile(item.uid);
    setSavedUpdateTrigger(prev => prev + 1);
  };

  const handleClearAll = () => {
    hapticLight();
    clearAllSavedProfiles();
    setSavedUpdateTrigger(prev => prev + 1);
    setConfirmClearAll(false);
  };

  if (!isOpen) return null;

  const currentActiveProfile = unifiedProfiles.find(p => p.isActive) || (currentUser ? {
    id: 'current',
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL,
    isAdmin: currentUser.isAdmin,
    isPremium: currentUser.isPremium,
    isActive: true,
    hasActiveSession: true
  } : null);

  const otherProfiles = unifiedProfiles.filter(p => !p.isActive);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onClick={() => {
            if (!switchingToId) onClose();
          }}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-card-dark border border-white/10 rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Switching Overlay */}
          <AnimatePresence>
            {switchingTarget && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 bg-bg-dark/95 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="relative"
                >
                  {switchingTarget.photoURL ? (
                    <img
                      src={switchingTarget.photoURL}
                      alt={switchingTarget.displayName || ''}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover border-2 border-brand-primary shadow-2xl shadow-brand-primary/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-brand-primary/10 border-2 border-brand-primary flex items-center justify-center text-brand-primary">
                      <UserIcon className="w-10 h-10" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-primary text-bg-dark flex items-center justify-center shadow-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  </span>
                </motion.div>

                <div className="space-y-1.5 max-w-xs">
                  <p className="text-sm font-display font-black uppercase tracking-wider text-text-main">
                    Switching to {switchingTarget.displayName || 'Curator'}
                  </p>
                  <p className="text-xs text-text-dim/70 font-mono truncate">
                    {switchingTarget.email || 'Activating session context...'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-brand-primary shadow-md shadow-brand-primary/10">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-black text-text-main uppercase tracking-tight">
                  Switch Identity
                </h3>
                <p className="text-[10px] text-text-dim/70 font-mono uppercase tracking-wider">
                  Manage & toggle multiple curator accounts
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-text-dim hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
            
            {/* Active Profile */}
            {currentActiveProfile && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-text-dim/60 font-mono">
                    Active Identity
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-brand-primary/40 bg-brand-primary/10 shadow-lg shadow-brand-primary/5 flex items-center justify-between relative overflow-hidden group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      {currentActiveProfile.photoURL ? (
                        <img
                          src={currentActiveProfile.photoURL}
                          alt={currentActiveProfile.displayName || 'Current Profile'}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover border-2 border-brand-primary shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-brand-primary/20 border-2 border-brand-primary flex items-center justify-center text-brand-primary">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-bg-dark flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-text-main truncate uppercase tracking-tight">
                          {currentActiveProfile.displayName || 'Resident Curator'}
                        </h4>
                        {currentActiveProfile.isAdmin && (
                          <span className="px-1.5 py-0.5 rounded bg-brand-primary/20 text-brand-primary text-[8px] font-black uppercase tracking-wider border border-brand-primary/30 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                        {currentActiveProfile.isPremium && !currentActiveProfile.isAdmin && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> Pro
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-dim/80 font-mono truncate mt-0.5">
                        {currentActiveProfile.email || 'Sanctuary resident'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3">
                    <span className="px-3 py-1 bg-brand-primary text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
                      Current
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Other Profiles */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-text-dim/60 font-mono">
                  Switch to Another Account ({otherProfiles.length})
                </span>
                {otherProfiles.length > 0 && !confirmClearAll && (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="text-[9px] font-black uppercase tracking-wider text-text-dim/50 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Clear History
                  </button>
                )}
                {confirmClearAll && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-red-400 font-bold">Clear all saved?</span>
                    <button
                      onClick={handleClearAll}
                      className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-black uppercase rounded hover:bg-red-500/30 cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      className="text-[8px] text-text-dim hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {otherProfiles.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-2">
                  <Users className="w-8 h-8 mx-auto text-text-dim/40" />
                  <p className="text-xs font-bold text-text-main">No other profiles detected</p>
                  <p className="text-[10px] text-text-dim/60 font-mono">
                    Click "Add Another Profile" below to sign in to multiple accounts on this device.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {otherProfiles.map((p) => {
                    const isSwitching = switchingToId === p.id;

                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => handleSelectProfile(p)}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                          isSwitching
                            ? "bg-brand-primary/25 border-brand-primary"
                            : p.hasActiveSession
                              ? "bg-white/[0.03] border-white/10 hover:border-brand-primary/40 hover:bg-white/[0.06] shadow-sm"
                              : "bg-white/[0.015] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        {/* Avatar & User Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            {p.photoURL ? (
                              <img
                                src={p.photoURL}
                                alt={p.displayName || 'Profile'}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-full object-cover border border-white/15 group-hover:border-brand-primary/40 transition-colors"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-dim group-hover:text-brand-primary transition-colors">
                                <UserIcon className="w-5 h-5" />
                              </div>
                            )}

                            {p.hasActiveSession && (
                              <span 
                                title="Active session ready for instant switch"
                                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-primary rounded-full border-2 border-bg-dark flex items-center justify-center text-bg-dark"
                              >
                                <Zap className="w-2 h-2 fill-current" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-text-main truncate uppercase tracking-tight group-hover:text-brand-primary transition-colors">
                                {p.displayName || 'Curator Profile'}
                              </span>
                              {p.isAdmin && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-primary/20 text-brand-primary text-[8px] font-black uppercase">
                                  Admin
                                </span>
                              )}
                              {p.isPremium && !p.isAdmin && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase">
                                  Pro
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-dim/70 font-mono truncate mt-0.5">
                              {p.email || 'Stored profile memory'}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => handleRemoveProfile(e, p)}
                            title="Forget this account from switcher"
                            className="p-2 rounded-xl bg-white/5 text-text-dim hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectProfile(p)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                              p.hasActiveSession
                                ? "bg-brand-primary text-black hover:brightness-110 shadow-md shadow-brand-primary/20"
                                : "bg-white/10 text-white hover:bg-brand-primary hover:text-black"
                            )}
                          >
                            {p.hasActiveSession ? (
                              <>
                                <span>Switch</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>Sign In</span>
                                <KeyRound className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-5 sm:p-6 border-t border-white/5 bg-white/[0.015] space-y-2.5">
            <button
              onClick={() => {
                onClose();
                onAddNewProfile();
              }}
              className="w-full py-3.5 px-4 bg-brand-primary hover:brightness-110 active:scale-[0.99] text-bg-dark font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-brand-primary/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Another Profile</span>
            </button>

            <div className="flex items-center justify-between pt-1 text-[10px] text-text-dim/60 font-mono">
              {onLogoutCurrent && currentUser && (
                <button
                  onClick={() => {
                    onClose();
                    onLogoutCurrent();
                  }}
                  className="hover:text-text-main transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign out current</span>
                </button>
              )}

              {onLogoutAll && (
                <button
                  onClick={() => {
                    onClose();
                    onLogoutAll();
                  }}
                  className="hover:text-red-400 transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3 text-red-400" />
                  <span className="text-red-400/80 hover:text-red-400 font-bold">Sign out of all sessions</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
