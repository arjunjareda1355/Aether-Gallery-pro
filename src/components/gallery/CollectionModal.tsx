import React, { useState, useEffect } from 'react';
import { X, Plus, FolderPlus, Check } from 'lucide-react';
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
import { cn } from '../../lib/utils';

interface CollectionModalProps {
  imageId: string;
  user: User | null;
  onClose: () => void;
}

export default function CollectionModal({ imageId, user, onClose }: CollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, COLLECTIONS.COLLECTIONS),
      where('userId', '==', user.uid)
    );
    return onSnapshot(q, (snapshot) => {
      setCollections(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Collection)));
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
        timestamp: serverTimestamp()
      });
      setNewCollectionName('');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card-dark border border-border-dark rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-border-dark flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-brand-primary" />
            Save to Collection
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-2 max-h-60 overflow-y-auto">
          {collections.map(coll => {
            const isIn = coll.imageIds.includes(imageId);
            return (
              <button
                key={coll.id}
                onClick={() => toggleImageInCollection(coll.id, isIn)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex flex-col items-start px-2">
                  <span className="text-sm font-medium">{coll.name}</span>
                  <span className="text-[10px] text-text-dim">{coll.imageIds.length} items</span>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border transition-all",
                  isIn ? "bg-brand-primary border-brand-primary" : "border-white/10 group-hover:border-white/20"
                )}>
                  {isIn && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
          {collections.length === 0 && !isCreating && (
            <div className="p-8 text-center text-text-dim text-sm italic">You don't have any collections yet.</div>
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-border-dark">
          {isCreating ? (
            <form onSubmit={handleCreateCollection} className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <button type="submit" className="p-2 bg-brand-primary rounded-xl text-white"><Plus className="w-5 h-5" /></button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold bg-white text-black rounded-2xl hover:scale-[1.02] transition-transform"
            >
              <Plus className="w-4 h-4" /> Create New Collection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
