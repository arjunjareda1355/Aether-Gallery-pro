import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, FolderPlus, Check, Globe, Lock } from 'lucide-react';
import { db, COLLECTIONS } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { Collection, User } from '../../types';
import { cn, useBodyScrollLock } from '../../lib/utils';

interface CollectionModalProps {
  imageId: string;
  user: User | null;
  onClose: () => void;
}

export default function CollectionModal({ imageId, user, onClose }: CollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  useBodyScrollLock(true);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, COLLECTIONS.COLLECTIONS),
      where('userId', '==', user.uid)
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Collection));
      // Deduplicate collections
      const uniqueDocs = docs.filter((c, index, self) =>
        c && c.id && index === self.findIndex((t) => t.id === c.id)
      );
      setCollections(uniqueDocs);
    });
  }, [user]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCollectionName.trim()) return;
    try {
      await addDoc(collection(db, COLLECTIONS.COLLECTIONS), {
        name: newCollectionName.trim(),
        userId: user.uid,
        imageIds: [imageId],
        isPublic,
        timestamp: serverTimestamp()
      });
      setNewCollectionName('');
      setIsPublic(false);
      setIsCreating(false);
    } catch (e) { console.error(e); }
  };

  const toggleImageInCollection = async (collId: string, isIn: boolean) => {
    const collRef = doc(db, COLLECTIONS.COLLECTIONS, collId);
    try {
      await updateDoc(collRef, {
        imageIds: isIn ? arrayRemove(imageId) : arrayUnion(imageId)
      });
    } catch (e) { console.error(e); }
  };

  if (!user) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl animate-in fade-in duration-500"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-card-dark/80 backdrop-blur-2xl border border-white/10 rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-main flex items-center gap-3">
              <FolderPlus className="w-4 h-4 text-brand-primary" />
              Registry Storage
            </h3>
            <p className="text-[9px] text-text-dim/40 font-bold uppercase tracking-widest mt-1">Curate your collection</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-2xl transition-colors"><X className="w-5 h-5 text-text-dim" /></button>
        </div>

        <div className="p-4 max-h-[350px] overflow-y-auto no-scrollbar space-y-2">
          {collections.map((coll, idx) => {
            const isIn = coll.imageIds.includes(imageId);
            return (
              <button
                key={`collection-${coll.id || idx}-${idx}`}
                onClick={() => toggleImageInCollection(coll.id, isIn)}
                className="w-full flex items-center justify-between p-4 rounded-[24px] hover:bg-brand-primary/10 border border-transparent hover:border-brand-primary/20 transition-all group"
              >
                <div className="flex flex-col items-start px-2">
                  <span className="text-sm font-bold text-text-main group-hover:text-brand-primary transition-colors">{coll.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-dim/40">{coll.imageIds.length} artifacts</span>
                    {!coll.isPublic && <Lock className="w-2.5 h-2.5 text-text-dim/40" />}
                  </div>
                </div>
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all",
                  isIn ? "bg-brand-primary border-brand-primary shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]" : "border-white/5 group-hover:border-brand-primary/40"
                )}>
                  {isIn && <Check className="w-4 h-4 text-bg-dark" />}
                </div>
              </button>
            );
          })}
          {collections.length === 0 && !isCreating && (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-text-dim/20">
                <FolderPlus className="w-8 h-8" />
              </div>
              <p className="text-[10px] text-text-dim/40 font-black uppercase tracking-[0.2em] italic">The registry is empty</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5">
          {isCreating ? (
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div className="relative group">
                <input
                  autoFocus
                  type="text"
                  placeholder="Designate path..."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium text-text-main focus:outline-none focus:border-brand-primary/40 focus:bg-black/50 transition-all"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-bg-dark hover:scale-105 active:scale-95 transition-all">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3 px-1">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    {isPublic ? <Globe className="w-4 h-4 text-brand-primary" /> : <Lock className="w-4 h-4 text-brand-primary" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-main">
                      {isPublic ? 'Public Resonance' : 'Private Sanctuary'}
                    </span>
                    <span className="text-[8px] text-text-dim/40 font-bold uppercase">Visibility Scope</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors duration-300 outline-none p-1",
                    isPublic ? "bg-brand-primary" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-3 h-3 bg-white rounded-full transition-transform duration-300 shadow-sm",
                    isPublic ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-4 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] bg-text-main text-bg-dark rounded-2xl hover:scale-[1.02] active:scale-98 transition-all shadow-xl"
            >
              <Plus className="w-4 h-4" /> Manifest Collection
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
