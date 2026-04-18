import { useState, useEffect, MouseEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, increment, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { useInView } from 'react-intersection-observer';
import { auth, db, googleProvider, COLLECTIONS, testFirestoreConnection } from './lib/firebase';
import { Image, Category, User } from './types';
import { cn } from './lib/utils';
import { ArrowLeft } from 'lucide-react';

// Components
import Navbar from './components/layout/Navbar';
import Logo from './components/layout/Logo';
import MasonryGrid from './components/gallery/MasonryGrid';
import CategoryMenu from './components/gallery/CategoryMenu';
import ImageModal from './components/gallery/ImageModal';
import UploadForm from './components/admin/UploadForm';
import CategoryManager from './components/admin/CategoryManager';
import CollectionModal from './components/gallery/CollectionModal';
import AboutPage from './pages/AboutPage';
import DeveloperPage from './pages/DeveloperPage';
import ProfilePage from './pages/ProfilePage';
import ModerationPage from './pages/ModerationPage';
import UpgradePage from './pages/UpgradePage';

export default function App() {
  const [images, setImages] = useState<Image[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular' | 'oldest'>('latest');
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [savingImage, setSavingImage] = useState<Image | null>(null);
  const [likedImageIds, setLikedImageIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { ref, inView } = useInView();

  const BATCH_SIZE = 20;
  const ADMIN_EMAILS = ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com']; 

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email || '');
        
        // Dynamic profile listener
        unsubscribeProfile = onSnapshot(doc(db, COLLECTIONS.USERS, firebaseUser.uid), (snap) => {
          const profileData = snap.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            isAdmin: isAdmin,
            displayName: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
            isPremium: isAdmin || profileData?.isPremium || false,
            isPremiumPending: profileData?.isPremiumPending || false,
            subscriptionPlan: profileData?.subscriptionPlan
          });
        }, (error) => {
          console.error("Profile fetch failed:", error);
        });

        // Initialize user doc if not exists
        await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          lastSeen: serverTimestamp()
        }, { merge: true });

        try {
          const qLikes = query(collection(db, COLLECTIONS.LIKES), where('userId', '==', firebaseUser.uid));
          const likeDocs = await getDocs(qLikes);
          setLikedImageIds(new Set(likeDocs.docs.map(d => d.data().imageId)));
        } catch (error) {
          console.error("Likes fetch failed:", error);
        }
      } else {
        setUser(null);
        setLikedImageIds(new Set());
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    const qCat = query(collection(db, COLLECTIONS.CATEGORIES), orderBy('name'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCat();
    };
  }, []);

  useEffect(() => {
    const handlePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const baseQuery = collection(db, COLLECTIONS.IMAGES);
    const orderField = sortOrder === 'popular' ? 'likes' : 'timestamp';
    const orderDirection = sortOrder === 'oldest' ? 'asc' : 'desc';
    
    let constraints: any[] = [orderBy(orderField, orderDirection), limit(BATCH_SIZE)];

    if (activeCategory === 'premium') {
      constraints.unshift(where('isPremium', '==', true));
    } else if (activeCategory !== 'all') {
      constraints.unshift(where('category', '==', activeCategory));
    }

    if (mediaType !== 'all') {
      constraints.unshift(where('type', '==', mediaType));
    }

    const qImg = query(baseQuery, ...constraints);

    const unsubscribeImg = onSnapshot(qImg, (snapshot) => {
      let docs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Image));
      
      // If default/latest sort, apply a random shuffle to keep the gallery fresh
      if (sortOrder === 'latest' && activeCategory === 'all' && !searchQuery) {
        docs = [...docs].sort(() => Math.random() - 0.5);
      }

      setImages(docs);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === BATCH_SIZE);
      setIsLoading(false);
    }, (error) => {
      console.error("Images fetch failed:", error);
      setIsLoading(false);
    });

    return () => unsubscribeImg();
  }, [activeCategory, sortOrder, mediaType]);

  const fetchMoreImages = async () => {
    if (!lastVisible || isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const baseQuery = collection(db, COLLECTIONS.IMAGES);
      const orderField = sortOrder === 'popular' ? 'likes' : 'timestamp';
      const orderDirection = sortOrder === 'oldest' ? 'asc' : 'desc';
      
      let constraints: any[] = [
        orderBy(orderField, orderDirection), 
        startAfter(lastVisible), 
        limit(BATCH_SIZE)
      ];

      if (activeCategory === 'premium') {
        constraints.unshift(where('isPremium', '==', true));
      } else if (activeCategory !== 'all') {
        constraints.unshift(where('category', '==', activeCategory));
      }

      if (mediaType !== 'all') {
        constraints.unshift(where('type', '==', mediaType));
      }

      const q = query(baseQuery, ...constraints);
      
      const snapshot = await getDocs(q);
      let newDocs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Image));
      
      // Keep it random if on default sort
      if (sortOrder === 'latest' && activeCategory === 'all' && !searchQuery) {
        newDocs = [...newDocs].sort(() => Math.random() - 0.5);
      }

      setImages(prev => [...prev, ...newDocs]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === BATCH_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (inView && hasMore && !isLoading && !searchQuery) {
      fetchMoreImages();
    }
  }, [inView, hasMore, isLoading, searchQuery]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        alert("The login popup was blocked by your browser. Please allow popups for this site or open the app in a new tab.");
      } else {
        alert("Login failed. Please try again or check your connection.");
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleUploadImage = async (data: any) => {
    if (!user?.isAdmin) return;
    await addDoc(collection(db, COLLECTIONS.IMAGES), {
      ...data,
      isPremium: data.isPremium ?? false,
      isSample: data.isSample ?? false,
      userId: user.uid
    });
  };

  const handleAddCategory = async (name: string) => {
    if (!user?.isAdmin) return;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await addDoc(collection(db, COLLECTIONS.CATEGORIES), { name, slug });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user?.isAdmin) return;
    await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    setSelectedImageIndex(-1);
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (selectedImageIndex === -1) return;
    
    let nextIndex = direction === 'next' ? selectedImageIndex + 1 : selectedImageIndex - 1;
    if (nextIndex < 0) nextIndex = filteredImages.length - 1;
    if (nextIndex >= filteredImages.length) nextIndex = 0;
    
    setSelectedImage(filteredImages[nextIndex]);
    setSelectedImageIndex(nextIndex);
  };

  const handleImageClick = (image: Image) => {
    const index = filteredImages.findIndex(img => img.id === image.id);
    setSelectedImage(image);
    setSelectedImageIndex(index);
  };

  const handleSave = (e: MouseEvent, image: Image) => {
    e.stopPropagation();
    if (!user) {
      alert("Please sign in to save assets to your collections.");
      return;
    }
    setSavingImage(image);
  };

  const handleLike = async (e: MouseEvent, image: Image) => {
    e.stopPropagation();
    if (!user) {
      alert("Please sign in to like this sanctuary's assets.");
      return;
    }

    const isLiked = likedImageIds.has(image.id);
    const newLikes = new Set(likedImageIds);
    const likeDocId = `${user.uid}_${image.id}`;

    try {
      if (isLiked) {
        newLikes.delete(image.id);
        await deleteDoc(doc(db, COLLECTIONS.LIKES, likeDocId));
        await updateDoc(doc(db, COLLECTIONS.IMAGES, image.id), {
          likes: increment(-1)
        });
      } else {
        newLikes.add(image.id);
        await setDoc(doc(db, COLLECTIONS.LIKES, likeDocId), {
          userId: user.uid,
          imageId: image.id,
          timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, COLLECTIONS.IMAGES, image.id), {
          likes: increment(1)
        });
      }

      setLikedImageIds(newLikes);
    } catch (error) {
      console.error("Like failed:", error);
      alert("Something went wrong with your interaction. Please try again.");
    }
  };

  const filteredImages = images.filter(img => {
    const matchesSearch = !searchQuery || 
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      img.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <Router>
      <div className="min-h-screen">
        <Navbar 
          isAdmin={user?.isAdmin || false} 
          user={user}
          onSearch={setSearchQuery} 
          onLogout={handleLogout}
          onLogin={handleLogin}
          onInstall={deferredPrompt ? handleInstallClick : undefined}
        />

        <Routes>
          <Route path="/" element={
            <>
              <div className="flex justify-center px-4 md:px-10 mt-[88px] mb-8 sticky top-[80px] z-[50]">
                <CategoryMenu 
                  categories={categories} 
                  activeCategoryId={activeCategory} 
                  onCategorySelect={setActiveCategory}
                  sortOrder={sortOrder}
                  onSortSelect={setSortOrder}
                  mediaType={mediaType}
                  onMediaTypeSelect={setMediaType}
                />
              </div>
              
              <main className="pb-20">
                {isLoading ? (
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
                  </div>
                ) : filteredImages.length > 0 ? (
                  <>
                    <MasonryGrid 
                      images={filteredImages} 
                      user={user}
                      onImageClick={handleImageClick}
                      onLike={handleLike}
                      onSave={handleSave}
                      likedImageIds={likedImageIds}
                    />
                    <div ref={ref} className="h-20 flex items-center justify-center">
                      {isFetchingMore && <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-white/40 font-medium">No results found for your search.</p>
                  </div>
                )}
              </main>
            </>
          } />

          <Route path="/profile" element={user ? <ProfilePage user={user} /> : <Navigate to="/" />} />
          <Route path="/upgrade" element={user ? <UpgradePage user={user} /> : <Navigate to="/" />} />
          <Route path="/moderation" element={user?.isAdmin ? <ModerationPage /> : <Navigate to="/" />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/developer" element={<DeveloperPage user={user} />} />

          <Route path="/admin" element={
            user ? (
              user.isAdmin ? (
                <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto space-y-8 pb-20">
                  <div className="flex justify-start">
                    <RouterLink 
                      to="/" 
                      className="flex items-center gap-2 text-text-dim hover:text-white transition-colors group"
                    >
                      <div className="p-2 rounded-full border border-border-dark group-hover:border-brand-primary/50 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">Exit Dashboard</span>
                    </RouterLink>
                  </div>
                  <header>
                    <h1 className="text-4xl font-display font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-white/40">Manage your gallery content and structure</p>
                  </header>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <UploadForm categories={categories} onUpload={handleUploadImage} />
                    </div>
                    <div className="lg:col-span-1">
                      <CategoryManager 
                        categories={categories} 
                        onAdd={handleAddCategory} 
                        onDelete={handleDeleteCategory} 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-32 text-center space-y-4">
                  <h2 className="text-2xl font-bold">Access Denied</h2>
                  <p className="text-white/40">You don't have permission to view this page.</p>
                  <button 
                    onClick={handleLogout}
                    className="px-6 py-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )
            ) : (
              <div className="pt-40 flex flex-col items-center justify-center space-y-8">
                <Logo size="xl" />
                <div className="text-center">
                  <h2 className="text-4xl font-display font-black mb-2 uppercase tracking-tighter">Aether</h2>
                  <p className="text-white/40 uppercase tracking-[0.3em] text-[10px] font-bold">The Curated Media Sanctuary</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <p className="text-white/20 text-xs font-medium">Sign in to manage your collection</p>
                  <button 
                    onClick={handleLogin}
                    className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    Continue with Google
                  </button>
                </div>
              </div>
            )
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <footer className="px-10 py-6 text-xs text-text-dim flex justify-between border-t border-border-dark mt-10">
          <div>Displaying {filteredImages.length} images</div>
          <div className="hidden sm:block">Storage: External Cloud Assets (Firestore DB)</div>
          <div>v2.4.0 • Built with Vite & Firebase</div>
        </footer>

        <ImageModal 
          image={selectedImage} 
          onClose={handleCloseModal} 
          onLike={handleLike}
          hasLiked={selectedImage ? likedImageIds.has(selectedImage.id) : false}
          user={user}
          onNavigate={handleNavigate}
          hasNext={filteredImages.length > 1}
          hasPrev={filteredImages.length > 1}
        />

        {savingImage && (
          <CollectionModal 
            imageId={savingImage.id} 
            user={user} 
            onClose={() => setSavingImage(null)} 
          />
        )}
      </div>
    </Router>
  );
}
