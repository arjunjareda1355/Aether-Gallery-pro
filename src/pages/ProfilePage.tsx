import React, { useState, useEffect } from 'react';
import { db, COLLECTIONS } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { User, Collection, Image } from '../types';
import MasonryGrid from '../components/gallery/MasonryGrid';
import { Folder, Bookmark, User as UserIcon, ArrowLeft, Shield, Sparkles, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import ImageModal from '../components/gallery/ImageModal';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

interface ProfilePageProps {
  user: User;
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'collections' | 'likes'>('collections');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allImages, setAllImages] = useState<Image[]>([]);
  const [likedImages, setLikedImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  useEffect(() => {
    // Fetch user collections
    const qColl = query(collection(db, COLLECTIONS.COLLECTIONS), where('userId', '==', user.uid));
    const unsubColl = onSnapshot(qColl, (s) => setCollections(s.docs.map(d => ({id: d.id, ...d.data()} as Collection))));

    // Fetch all images once to filter locally (simpler for this volume)
    const qImg = query(collection(db, COLLECTIONS.IMAGES), orderBy('timestamp', 'desc'));
    const unsubImg = onSnapshot(qImg, (s) => {
      const imgs = s.docs.map(d => ({id: d.id, ...d.data()} as Image));
      setAllImages(imgs);
      
      // Fetch liked image IDs from Firestore for this user
      const qLikes = query(collection(db, COLLECTIONS.LIKES), where('userId', '==', user.uid));
      onSnapshot(qLikes, (likeSnapshot) => {
        const likedIds = likeSnapshot.docs.map(d => d.data().imageId);
        setLikedImages(imgs.filter(i => likedIds.includes(i.id)));
      });
    });

    return () => { unsubColl(); unsubImg(); };
  }, [user]);

  return (
    <div className="pt-32 px-4 md:px-10 pb-20 space-y-12 max-w-7xl mx-auto">
      {/* Back Button */}
      <div className="flex justify-start">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-text-dim hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full border border-border-dark group-hover:border-brand-primary/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Back to Gallery</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-card-dark border border-border-dark p-8 md:p-12 rounded-[40px]">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-brand-primary/20 shadow-2xl">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center text-4xl text-text-dim"><UserIcon /></div>
          )}
        </div>
        <div className="text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-white">{user.displayName || 'Anonymous User'}</h1>
            {user.isAdmin ? (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/40 text-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sanctuary Architect</span>
              </div>
            ) : user.isPremium ? (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-brand-primary/10 border border-brand-primary/40 text-brand-primary rounded-full">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Elite Curator</span>
              </div>
            ) : null}
          </div>
          <p className="text-text-dim font-medium text-sm md:text-base border-l-2 border-brand-primary/20 pl-4">{user.email}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
             <div className="px-5 py-2 bg-white/5 rounded-2xl border border-white/5 text-xs font-bold uppercase tracking-widest">
               {collections.length} Collections
             </div>
             <div className="px-5 py-2 bg-white/5 rounded-2xl border border-white/5 text-xs font-bold uppercase tracking-widest text-red-400">
               {likedImages.length} Liked
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center md:justify-start gap-8 border-b border-border-dark">
        <button 
          onClick={() => setActiveTab('collections')}
          className={cn(
            "pb-4 px-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2",
            activeTab === 'collections' ? "text-brand-primary" : "text-text-dim hover:text-white"
          )}
        >
          <Folder className="w-4 h-4" />
          <span>Collections</span>
          {activeTab === 'collections' && (
            <motion.div 
              layoutId="profileTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(242,125,38,0.5)]" 
            />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('likes')}
          className={cn(
            "pb-4 px-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2",
            activeTab === 'likes' ? "text-red-500" : "text-text-dim hover:text-white"
          )}
        >
          <Heart className="w-4 h-4" />
          <span>My Likes</span>
          {activeTab === 'likes' && (
            <motion.div 
              layoutId="profileTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-12">
        {activeTab === 'collections' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map(coll => {
              const coverImg = allImages.find(i => i.id === coll.imageIds[0]);
              return (
                <div key={coll.id} className="group cursor-pointer">
                  <div className="aspect-[4/3] relative rounded-3xl overflow-hidden bg-card-dark border border-border-dark group-hover:border-brand-primary/50 transition-all">
                    {coverImg ? (
                      <img src={coverImg.url} alt={coll.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Folder className="w-12 h-12 text-text-dim opacity-20" /></div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                      <h4 className="text-lg font-bold text-white">{coll.name}</h4>
                      <p className="text-white/60 text-xs font-medium uppercase tracking-widest">{coll.imageIds.length} items</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {collections.length === 0 && <div className="col-span-full py-20 text-center text-text-dim font-medium italic">No collections found.</div>}
          </div>
        ) : (
          <div>
            {likedImages.length > 0 ? (
               <MasonryGrid 
                images={likedImages} 
                user={user}
                onImageClick={setSelectedImage}
                onLike={() => {}} // Local storage sync is handled in App.tsx
                likedImageIds={new Set(likedImages.map(i => i.id))}
               />
            ) : (
              <div className="py-20 text-center text-text-dim font-medium italic">You haven't liked any images yet.</div>
            )}
          </div>
        )}
      </div>

      <ImageModal 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        onLike={() => {}} // simplified for profile
        hasLiked={true}
        user={user}
      />
    </div>
  );
}
