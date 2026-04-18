import React, { useState, useEffect } from 'react';
import { Send, User, Trash2 } from 'lucide-react';
import { db, COLLECTIONS } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc 
} from 'firebase/firestore';
import { Comment, User as UserType } from '../../types';
import { formatDate } from '../../lib/utils';

interface CommentSectionProps {
  imageId: string;
  user: UserType | null;
}

export default function CommentSection({ imageId, user }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.COMMENTS),
      where('imageId', '==', imageId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(docs);
    });

    return () => unsubscribe();
  }, [imageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.COMMENTS), {
        imageId,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        userPhoto: user.photoURL || null,
        text: newComment.trim(),
        timestamp: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user?.isAdmin) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.COMMENTS, commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Comments ({comments.length})</h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-brand-primary disabled:opacity-50 hover:bg-brand-primary/10 rounded-xl transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      ) : (
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-sm text-text-dim">Sign in to join the conversation.</p>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="group flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {comment.userPhoto ? (
                <img 
                  src={comment.userPhoto} 
                  alt={comment.userName} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-4 h-4 text-text-dim" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-main">{comment.userName}</span>
                  <span className="text-[10px] text-text-dim font-medium uppercase">{formatDate(comment.timestamp)}</span>
                </div>
                {user?.isAdmin && (
                  <button 
                    onClick={() => handleDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-400/10 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{comment.text}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center text-sm text-text-dim py-4">No comments yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}
