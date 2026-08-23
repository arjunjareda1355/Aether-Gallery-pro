import React, { useState, useEffect } from 'react';
import { Send, User, Trash2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { trackActivity } from '../../lib/recommendation';

interface CommentSectionProps {
  imageId: string;
  user: UserType | null;
  imageTags?: string[];
  onLogin?: () => void;
}

export default function CommentSection({ imageId, user, imageTags = [], onLogin }: CommentSectionProps) {
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
      // Deduplicate comments
      const uniqueDocs = docs.filter((c, index, self) =>
        c && c.id && index === self.findIndex((t) => t.id === c.id)
      );
      setComments(uniqueDocs);
    });

    return () => unsubscribe();
  }, [imageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (user && imageTags.length > 0) {
        trackActivity(user.uid, imageTags, 'comment');
      }
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
    <div className="flex flex-col h-full overflow-hidden bg-white/[0.01] backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-2xl">
      <div className="p-6 md:p-8 space-y-6 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-text-main flex items-center gap-3">
             Comments
            <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-black rounded-lg border border-brand-primary/20">
              {comments.length}
            </span>
          </h3>
        </div>

        {user ? (
          <form onSubmit={handleSubmit} className="relative group">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-[20px] py-4 pl-5 pr-14 text-xs font-medium text-text-main focus:outline-none focus:border-brand-primary/40 focus:bg-white/[0.04] transition-all group-hover:border-white/20 shadow-inner"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-brand-primary text-bg-dark disabled:opacity-30 disabled:grayscale hover:scale-105 rounded-xl transition-all shadow-[0_10px_20px_rgba(var(--brand-primary-rgb),0.2)] active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="bg-white/[0.02] rounded-2xl p-4 text-center border border-white/10 flex flex-col items-center gap-2.5">
            <p className="text-xs text-text-dim font-medium">Sign in or create an account to join the conversation.</p>
            {onLogin && (
              <button
                type="button"
                onClick={onLogin}
                className="px-4 py-2 bg-text-main text-bg-dark rounded-xl text-[11px] font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-6">
        {comments.map((comment, i) => (
          <div key={`comment-${comment.id || ''}-${i}`} className="group flex gap-4">
            <Link 
              to={`/profile/${comment.userId}`}
              className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5 hover:border-brand-primary/50 transition-all"
            >
              {comment.userPhoto ? (
                <img 
                  src={comment.userPhoto} 
                  alt={comment.userName} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-5 h-5 text-text-dim" />
              )}
            </Link>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Link to={`/profile/${comment.userId}`} className="text-xs font-black uppercase tracking-widest text-white/90 hover:text-brand-primary transition-colors">{comment.userName}</Link>
                  <span className="text-[9px] text-text-dim font-bold uppercase tracking-tight">{formatDate(comment.timestamp)}</span>
                </div>
                {user?.isAdmin && (
                  <button 
                    onClick={() => handleDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Remove comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-white/70 leading-relaxed font-medium">{comment.text}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="py-10 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-white/10 mx-auto" />
            <p className="text-sm text-text-dim italic">No comments yet. Start the conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
