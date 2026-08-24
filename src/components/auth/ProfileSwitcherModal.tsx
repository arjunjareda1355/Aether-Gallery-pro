import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Plus, 
  Trash2, 
  Check, 
  Shield, 
  Sparkles, 
  Users, 
  ArrowRight,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { User as UserType } from '../../types';
import { SavedProfile, getSavedProfiles, removeSavedProfile } from '../../services/profileManager';
import { auth, signOut } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  onAddNewProfile: () => void;
  onSwitchToProfile: (profile: SavedProfile) => void;
  onLogoutAll?: () => void;
}

export default function ProfileSwitcherModal({
  isOpen,
  onClose,
  currentUser,
  onAddNewProfile,
  onSwitchToProfile,
  onLogoutAll
}: ProfileSwitcherModalProps) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProfiles(getSavedProfiles());
    }
  }, [isOpen, currentUser]);

  const handleRemove = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    const updated = removeSavedProfile(uid);
    setProfiles(updated);
    setDeletingUid(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-card-dark border border-white/10 rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden z-10"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-black text-text-main uppercase tracking-tight">
                  Switch Profile
                </h3>
                <p className="text-[10px] text-text-dim/60 font-mono uppercase tracking-wider">
                  Manage multiple curator identities
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-text-dim hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profiles List */}
          <div className="p-6 space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar">
            {profiles.map((p) => {
              const isActive = currentUser && currentUser.uid === p.uid;

              return (
                <div
                  key={`saved-prof-${p.uid}`}
                  onClick={() => {
                    if (isActive) {
                      onClose();
                    } else {
                      onSwitchToProfile(p);
                      onClose();
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                    isActive
                      ? "bg-brand-primary/10 border-brand-primary/40 shadow-lg shadow-brand-primary/5"
                      : "bg-white/[0.02] border-white/5 hover:border-brand-primary/20 hover:bg-white/[0.04]"
                  )}
                >
                  {/* Left Avatar & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      {p.photoURL ? (
                        <img
                          src={p.photoURL}
                          alt={p.displayName || 'Profile'}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-dim">
                          <User className="w-5 h-5" />
                        </div>
                      )}

                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-bg-dark flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-text-main truncate uppercase tracking-tight">
                          {p.displayName || 'Curator Profile'}
                        </p>
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
                      <p className="text-[10px] text-text-dim/60 font-mono truncate">
                        {p.email || 'No email recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isActive ? (
                      <span className="px-3 py-1 bg-brand-primary text-black text-[9px] font-black uppercase tracking-wider rounded-full shadow-sm">
                        Active
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleRemove(e, p.uid)}
                          title="Remove saved account"
                          className="p-2 rounded-xl bg-white/5 text-text-dim hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-dim group-hover:text-brand-primary flex items-center gap-1 transition-colors">
                          Switch <ArrowRight className="w-3 h-3" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {profiles.length === 0 && (
              <div className="text-center py-6 text-text-dim/50 text-xs font-mono">
                No secondary profiles saved yet.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-3">
            <button
              onClick={() => {
                onClose();
                onAddNewProfile();
              }}
              className="w-full py-3.5 px-4 bg-brand-primary hover:brightness-110 active:scale-98 text-bg-dark font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Another Profile</span>
            </button>

            {onLogoutAll && currentUser && (
              <button
                onClick={() => {
                  onClose();
                  onLogoutAll();
                }}
                className="w-full py-2.5 text-center text-[10px] font-bold text-text-dim/50 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect All Sessions</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
