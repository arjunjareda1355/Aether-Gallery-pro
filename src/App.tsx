import { useState, useEffect, MouseEvent, useCallback, useMemo, useTransition, useRef, useDeferredValue, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, increment, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, where, setDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { useInView } from 'react-intersection-observer';
import { db, COLLECTIONS, testFirestoreConnection, handleFirestoreError } from './lib/firebase';
import { useUser, useClerk } from './lib/clerk';
import { Image, Category, User } from './types';
import { cn, debounce, copyToClipboard } from './lib/utils';
import { ArrowLeft, Trash2, Sparkles, Wand2, Search, Check, Folder, Lock, Unlock, Edit3, HelpCircle, X, Download, Share2, AlertTriangle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import Navbar from './components/layout/Navbar';
import Logo from './components/layout/Logo';
import SmartOnboarding from './components/layout/SmartOnboarding';
import MasonryGrid from './components/gallery/MasonryGrid';
import CategoryMenu from './components/gallery/CategoryMenu';
import ImageModal from './components/gallery/ImageModal';
import UploadForm from './components/admin/UploadForm';
import CategoryManager from './components/admin/CategoryManager';
import CollectionModal from './components/gallery/CollectionModal';
import Notification, { NotificationType } from './components/ui/Notification';
import ThemeVisualizer from './components/layout/ThemeVisualizer';
import AuthModal, { AuthMode } from './components/auth/AuthModal';
import SelectionToolbar from './components/gallery/SelectionToolbar';
import ProfileSwitcherModal from './components/auth/ProfileSwitcherModal';
import PwaInstallPrompt from './components/ui/PwaInstallPrompt';
import { 
  recordProfileSession, 
  switchActiveProfile, 
  clearAllSavedProfiles, 
  SavedProfile 
} from './services/profileManager';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const DeveloperPage = lazy(() => import('./pages/DeveloperPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));

import { trackActivity, getUserInterests } from './lib/recommendation';
import { 
  verifyLinkToken, 
  handleFirebaseActionCode, 
  recordEmailVerifiedInFirestore 
} from './services/emailVerificationService';
import { hapticSuccess, useScrollHaptics } from './utils/haptics';

const ADMIN_EMAILS = ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com', 'aethersanctuaryofficial@gmail.com'];

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useUser();
  const clerk = useClerk();
  const clerkSignOut = clerk.signOut;

  // Silky smooth scrolling haptics
  useScrollHaptics(true);

  const [images, setImages] = useState<Image[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aspectRatioFilter, setAspectRatioFilter] = useState<'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide'>('all');
  const [sortOrder, setSortOrder] = useState<'random' | 'latest' | 'popular' | 'oldest' | 'trending'>('random');
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);

  const [savingImage, setSavingImage] = useState<Image | null>(null);
  const [likedImageIds, setLikedImageIds] = useState<Set<string>>(new Set());
  const [savedImageIds, setSavedImageIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [currentTheme, setCurrentTheme] = useState<string>('bright');
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);

  // Instantly reactive active user calculation - prevents any Enter/Login button lag
  const effectiveUser = useMemo<User | null>(() => {
    if (!isClerkLoaded) return user;
    if (!isClerkSignedIn || !clerkUser) return null;
    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const uid = clerkUser.id;
    const displayName = clerkUser.fullName || clerkUser.username || clerkUser.firstName || (email ? email.split('@')[0] : null);
    const photoURL = clerkUser.imageUrl || null;
    const isAdmin = ADMIN_EMAILS.some(e => email.toLowerCase() === e.toLowerCase()) || Boolean(user?.isAdmin);

    if (user && user.uid === uid) {
      return {
        ...user,
        email: email || user.email,
        displayName: user.displayName || displayName,
        photoURL: user.photoURL || photoURL,
        isAdmin: isAdmin || user.isAdmin
      };
    }

    return {
      uid,
      email,
      isAdmin,
      displayName,
      photoURL,
      isPremium: isAdmin,
      isPremiumPending: false,
      subscriptionPlan: null,
      bio: null,
      location: null,
      website: null,
      gender: null,
      dob: null,
      occupation: null,
      theme: currentTheme || 'orange',
      isBanned: false,
      isHold: false,
      emailVerified: true
    };
  }, [isClerkLoaded, isClerkSignedIn, clerkUser, user, currentTheme]);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  }, []);

  // Authentication Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [authInitialEmail, setAuthInitialEmail] = useState('');
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);

  const openAuthModal = useCallback((mode: AuthMode = 'login', initialEmail = '') => {
    setAuthModalMode(mode);
    setAuthInitialEmail(initialEmail);
    setAuthModalOpen(true);
  }, []);

  const handleOpenProfileSwitcher = useCallback(() => {
    setProfileSwitcherOpen(true);
  }, []);

  const handleSwitchToProfile = useCallback(async (targetProfile: SavedProfile, sessionId?: string | null) => {
    if (user && user.uid === targetProfile.uid) {
      setProfileSwitcherOpen(false);
      return;
    }
    
    // 1. Direct Clerk Multi-Session Switch if session is active
    let targetSessionId = sessionId || targetProfile.sessionId;
    if (!targetSessionId && clerk?.client?.sessions) {
      const match = clerk.client.sessions.find(
        s => s.user?.id === targetProfile.uid || 
             (targetProfile.email && s.user?.primaryEmailAddress?.emailAddress?.toLowerCase() === targetProfile.email.toLowerCase())
      );
      if (match) {
        targetSessionId = match.id;
      }
    }

    if (targetSessionId && clerk?.setActive) {
      try {
        await clerk.setActive({ session: targetSessionId });
        switchActiveProfile(targetProfile.uid);
        setProfileSwitcherOpen(false);
        notify(`Switched active profile to ${targetProfile.displayName || targetProfile.email || 'Curator'}`, 'success');
        return;
      } catch (err) {
        console.warn("Clerk session switch fallback:", err);
      }
    }

    // 2. Saved Profile Fallback: Open Auth modal pre-filled for this user
    setProfileSwitcherOpen(false);
    switchActiveProfile(targetProfile.uid);
    setAuthInitialEmail(targetProfile.email || '');
    setAuthModalMode('login');
    setAuthModalOpen(true);
    notify(`Sign in to activate ${targetProfile.displayName || targetProfile.email || 'Sanctuary Profile'}`, 'info');
  }, [user, notify, clerk]);

  const handleAddNewProfile = useCallback(() => {
    setProfileSwitcherOpen(false);
    setAuthInitialEmail('');
    setAuthModalMode('login');
    setAuthModalOpen(true);
  }, []);

  const handleLogoutAll = useCallback(async () => {
    try {
      if (clerkSignOut) {
        await clerkSignOut();
      }
      clearAllSavedProfiles();
      setUser(null);
      setProfileSwitcherOpen(false);
      notify('All curator sessions disconnected', 'info');
    } catch (err) {
      console.error("Failed to sign out of all sessions:", err);
      notify('Error disconnecting sessions', 'error');
    }
  }, [clerkSignOut, notify]);

  const handleLogoutCurrent = useCallback(async () => {
    try {
      if (clerkSignOut) {
        await clerkSignOut();
      }
      setUser(null);
      setProfileSwitcherOpen(false);
      notify('Signed out successfully', 'info');
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  }, [clerkSignOut, notify]);

  // Owner Bulk Select States
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Global listener for URL-based email verification links (verify_token or Firebase oobCode)
  useEffect(() => {
    const verifyToken = searchParams.get('verify_token') || searchParams.get('verifyToken');
    const emailParam = searchParams.get('email');
    const oobCode = searchParams.get('oobCode');
    const modeParam = searchParams.get('mode');

    if (verifyToken) {
      (async () => {
        try {
          const res = await verifyLinkToken(verifyToken, emailParam || undefined);
          if (res.verified) {
            hapticSuccess();
            notify('Email identity successfully verified! Welcome to Aether Sanctuary.', 'success');
            if (user?.uid) {
              await recordEmailVerifiedInFirestore(user.uid);
            }
            if (user) {
              setUser(prev => prev ? ({ ...prev, emailVerified: true }) : prev);
            }
          } else if (res.error) {
            notify(res.error, 'error');
          }
        } catch (e) {
          console.error('Error handling link verification token:', e);
        } finally {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('verify_token');
          nextParams.delete('verifyToken');
          setSearchParams(nextParams, { replace: true });
        }
      })();
    } else if (oobCode && modeParam === 'verifyEmail') {
      (async () => {
        try {
          const ok = await handleFirebaseActionCode(oobCode);
          if (ok) {
            hapticSuccess();
            notify('Email identity successfully verified via Firebase Auth.', 'success');
            if (user) {
              setUser(prev => prev ? ({ ...prev, emailVerified: true }) : prev);
            }
          }
        } catch (e) {
          console.error('Error handling oobCode:', e);
        } finally {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('oobCode');
          nextParams.delete('mode');
          setSearchParams(nextParams, { replace: true });
        }
      })();
    }
  }, [searchParams, setSearchParams, notify, user]);

  useEffect(() => {
    // We no longer show onboarding automatically on app start for everyone.
    // It is now strictly for new sign-ups.
  }, []);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    localStorage.setItem('aether-onboarding-complete', 'true');
    if (user) {
      try {
        await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { hasSeenOnboarding: true });
      } catch (e) {
        console.error("Failed to sync onboarding state", e);
      }
    }
  };

  const handleReplayTour = () => setShowOnboarding(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('aether-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const saved = localStorage.getItem('aether-theme');
    if (saved) setCurrentTheme(saved);
  }, []);

  const handleThemeChange = async (themeId: string) => {
    setCurrentTheme(themeId);
    if (user) {
      try {
        await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { theme: themeId });
      } catch (e) {
        console.error("Theme sync failed", e);
      }
    }
  };
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastVisibleRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasLoadedMorePagesRef = useRef<boolean>(false);
  const updateLastVisible = (val: QueryDocumentSnapshot<DocumentData> | null) => {
    lastVisibleRef.current = val;
    setLastVisible(val);
  };
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallDismissed, setIsInstallDismissed] = useState<boolean>(() => localStorage.getItem('pwa-install-banner-dismissed') === 'true');
  const { ref, inView } = useInView({
    rootMargin: '1500px',
    threshold: 0,
    triggerOnce: false
  });
 
  const BATCH_SIZE = 24; 
 
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow context menu on inputs, textareas, or explicitly allowed elements
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('.allow-select') ||
        target.closest('[data-allow-select="true"]')
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('.allow-select') ||
        target.closest('[data-allow-select="true"]')
      ) {
        return;
      }
      // Disable copy for everything else
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu as any);
    document.addEventListener('copy', handleCopy as any);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu as any);
      document.removeEventListener('copy', handleCopy as any);
    };
  }, []);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, COLLECTIONS.APP_SETTINGS, 'global_config'), (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data());
      }
    }, (error) => {
      console.warn("Global config load failed in AppContent:", error);
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeCollections: (() => void) | undefined;
    
    // Connectivity Audit
    testFirestoreConnection();

    if (!isClerkLoaded) return;

    if (isClerkSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const uid = clerkUser.id;
      const displayName = clerkUser.fullName || clerkUser.username || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || null;
      const photoURL = clerkUser.imageUrl || null;
      const isAdmin = ADMIN_EMAILS.some(e => email.toLowerCase() === e.toLowerCase());
      console.log("Aether Protocol: Authentication confirmed for", email, "Admin Status:", isAdmin);
      
      // Instantly manifest authenticated state so the UI reflects login immediately
      const initialUser: User = {
        uid: uid,
        email: email,
        isAdmin: isAdmin,
        displayName: displayName,
        photoURL: photoURL,
        isPremium: isAdmin,
        isPremiumPending: false,
        subscriptionPlan: null,
        bio: null,
        location: null,
        website: null,
        gender: null,
        dob: null,
        occupation: null,
        theme: 'orange',
        isBanned: false,
        isHold: false,
        emailVerified: true
      };

      setUser(prev => {
        if (!prev || prev.uid !== uid) {
          return initialUser;
        }
        return {
          ...initialUser,
          ...prev,
          displayName: prev.displayName || displayName,
          photoURL: prev.photoURL || photoURL,
          isAdmin: isAdmin || prev.isAdmin
        };
      });

      // Close auth modal if open
      setAuthModalOpen(false);

      // Dynamic profile listener
      unsubscribeProfile = onSnapshot(doc(db, COLLECTIONS.USERS, uid), (snap) => {
        let profileData = snap.exists() ? snap.data() : null;
        
        if (profileData?.theme && !localStorage.getItem('aether-theme-synced')) {
           setCurrentTheme(profileData.theme);
           localStorage.setItem('aether-theme-synced', 'true');
        }
        
        const isNewUser = (clerkUser.createdAt ? new Date(clerkUser.createdAt).getTime() > Date.now() - 3600000 : false) || !profileData?.hasSeenOnboarding;
        const hasSeenLocal = localStorage.getItem('aether-onboarding-complete');
        
        if (isNewUser && !hasSeenLocal && !showOnboarding) {
          setShowOnboarding(true);
        }

        const resolvedUser: User = {
          uid: uid,
          email: email || profileData?.email || '',
          isAdmin: isAdmin || profileData?.isAdmin || false,
          displayName: profileData?.displayName || displayName || null,
          photoURL: profileData?.photoURL || photoURL || null,
          isPremium: isAdmin || profileData?.isAdmin || profileData?.isPremium || false,
          isPremiumPending: profileData?.isPremiumPending || false,
          subscriptionPlan: profileData?.subscriptionPlan || null,
          bio: profileData?.bio || null,
          location: profileData?.location || null,
          website: profileData?.website || null,
          gender: profileData?.gender || null,
          dob: profileData?.dob || null,
          occupation: profileData?.occupation || null,
          theme: profileData?.theme || 'orange',
          isBanned: profileData?.isBanned || false,
          isHold: profileData?.isHold || false,
          emailVerified: true
        };

        setUser(resolvedUser);

        // Save to local profile registry for effortless profile switching
        recordProfileSession(resolvedUser, clerk.session?.id);
      }, (error) => {
        console.error("Profile fetch failed:", error);
        try {
          handleFirestoreError(error, 'get', `${COLLECTIONS.USERS}/${uid}`);
        } catch (e) {
        }
      });

      // Initialize user doc if not exists
      const initializeProfile = async () => {
        try {
          const userDocRef = doc(db, COLLECTIONS.USERS, uid);
          const userSnap = await getDoc(userDocRef);
          
          const generateReadableId = (name: string | null) => {
            if (!name) return `user_${Math.floor(Math.random() * 10000)}`;
            const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
            return `${cleanName}_${Math.floor(1000 + Math.random() * 8999)}`;
          };

          const userProfileData = {
            uid: uid,
            userId: uid,
            email: email || null,
            displayName: displayName || null,
            photoURL: photoURL || null,
            lastSeen: serverTimestamp(),
            hasSeenOnboarding: false,
            theme: 'orange',
            isPremium: isAdmin,
            isAdmin: isAdmin
          };

          if (!userSnap.exists()) {
            console.log("Aether Protocol: New resident detected. Initializing registry for", uid);
            
            let mergedPermissions: any = {};
            let oldDocRefToClean: any = null;
            
            if (email) {
              try {
                const qPregrant = query(
                  collection(db, COLLECTIONS.USERS), 
                  where('email', '==', email.toLowerCase())
                );
                const pregrantSnap = await getDocs(qPregrant);
                if (!pregrantSnap.empty) {
                  const pregrantDoc = pregrantSnap.docs[0];
                  const data = pregrantDoc.data();
                  mergedPermissions = {
                    isPremium: data.isPremium || false,
                    subscriptionPlan: data.subscriptionPlan || null,
                    isAdmin: data.isAdmin || false,
                    isBanned: data.isBanned || false,
                    isHold: data.isHold || false
                  };
                  if (pregrantDoc.id !== uid) {
                    oldDocRefToClean = pregrantDoc.ref;
                  }
                }
              } catch (pe) {
                console.warn("Could not query pregrant status:", pe);
              }
            }

            const readableId = generateReadableId(displayName);
            await setDoc(userDocRef, {
              ...userProfileData,
              ...mergedPermissions,
              readableId,
              createdAt: serverTimestamp()
            });

            if (oldDocRefToClean) {
              try {
                await deleteDoc(oldDocRefToClean);
                console.log("Aether Protocol: Placeholder pregrant profile merged & purged successfully.");
              } catch (de) {
                console.warn("Could not delete pregrant placeholder:", de);
              }
            }
          } else {
            console.log("Aether Protocol: Registry found. Updating lastSeen for", uid);
            await updateDoc(userDocRef, {
              lastSeen: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Aether Protocol: Profile initialization failed:", error);
          handleFirestoreError(error, 'write', COLLECTIONS.USERS);
        }
      };

      initializeProfile();

      try {
        const qLikes = query(collection(db, COLLECTIONS.LIKES), where('userId', '==', uid));
        getDocs(qLikes).then((likeDocs) => {
          setLikedImageIds(new Set(likeDocs.docs.map(d => d.data().imageId)));
        }).catch(err => console.warn("Likes fetch error:", err));

        const qFollows = query(collection(db, COLLECTIONS.FOLLOWS), where('followerId', '==', uid));
        getDocs(qFollows).then((followDocs) => {
          setFollowingIds(new Set(followDocs.docs.map(d => d.data().followingId)));
        }).catch(err => console.warn("Follows fetch error:", err));

        const qCollections = query(collection(db, COLLECTIONS.COLLECTIONS), where('userId', '==', uid));
        unsubscribeCollections = onSnapshot(qCollections, (snap) => {
          const allSavedIds = new Set<string>();
          snap.docs.forEach(d => {
            const ids = d.data().imageIds || [];
            ids.forEach((id: string) => allSavedIds.add(id));
          });
          setSavedImageIds(allSavedIds);
        }, (error) => {
          handleFirestoreError(error, 'list', COLLECTIONS.COLLECTIONS);
        });
      } catch (error) {
        console.error("User data fetch failed:", error);
      }
    } else {
      setUser(null);
      setLikedImageIds(new Set());
      setFollowingIds(new Set());
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeCollections) unsubscribeCollections();
    }

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeCollections) unsubscribeCollections();
    };
  }, [isClerkLoaded, isClerkSignedIn, clerkUser]);

  useEffect(() => {
    const qCat = query(collection(db, COLLECTIONS.CATEGORIES), orderBy('name'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
      // Strict uniqueness layer to prevent duplicate key errors
      const seen = new Set();
      const uniqueDocs = docs.filter(cat => {
        if (!cat.id || seen.has(cat.id)) return false;
        seen.add(cat.id);
        return true;
      });
      setCategories(uniqueDocs);
    });

    return () => {
      unsubscribeCat();
    };
  }, []);

  // Use Transition and DeferredValue for non-blocking search updates
  const [isSearching, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
  }, []);

  const [commentMatches, setCommentMatches] = useState<string[]>([]);
  const [searchRecommendations, setSearchRecommendations] = useState<string[]>([]);
  const commentCache = useRef<Record<string, string[]>>({});

  useEffect(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    if (!q || q.length < 2) {
      setCommentMatches([]);
      return;
    }

    if (commentCache.current[q]) {
      setCommentMatches(commentCache.current[q]);
      return;
    }

    const fetchCommentMatches = async () => {
      try {
        // Optimization: Fetch only recently active comments or from a broader spread
        const qSnap = query(collection(db, COLLECTIONS.COMMENTS), limit(100)); 
        const snap = await getDocs(qSnap);
        const matches = snap.docs
          .filter(d => d.data().text.toLowerCase().includes(q))
          .map(d => d.data().imageId);
        
        commentCache.current[q] = matches;
        setCommentMatches(matches);
      } catch (e) {
        console.warn("Global search failed:", e);
      }
    };

    const t = setTimeout(fetchCommentMatches, 300);
    return () => clearTimeout(t);
  }, [deferredSearchQuery]);

  useEffect(() => {
    if (!deferredSearchQuery.trim() || deferredSearchQuery.length < 2) {
      setSearchRecommendations([]);
      return;
    }
    
    const q = deferredSearchQuery.toLowerCase();
    const recommendations = new Set<string>();
    
    // Performance optimization: only check first 100 images for recommendations
    images.slice(0, 100).forEach(img => {
      img.tags.forEach(tag => {
        if (tag.toLowerCase().includes(q)) recommendations.add(tag.toLowerCase());
      });
      if (img.title.toLowerCase().includes(q)) recommendations.add(img.title);
    });
    
    const uniqueRecs = Array.from(new Set(recommendations)).filter(Boolean);
    setSearchRecommendations(uniqueRecs.slice(0, 8));
  }, [deferredSearchQuery, images]);

  useEffect(() => {
    let unsubscribeImg: (() => void) | null = null;
    let isFirstSnapshot = true;

    const shuffleArray = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const fetchImagesInitial = async () => {
      setIsLoading(true);
      updateLastVisible(null);
      hasLoadedMorePagesRef.current = false;
      setHasMore(true);

      try {
        const baseQuery = collection(db, COLLECTIONS.IMAGES);
        const orderField = (sortOrder === 'popular' || sortOrder === 'trending') ? 'likes' : 'timestamp';
        const orderDirection = sortOrder === 'oldest' ? 'asc' : 'desc';
        
        let constraints: any[] = [
          orderBy(orderField, orderDirection),
          limit(sortOrder === 'random' ? 120 : BATCH_SIZE)
        ];

        const activeCatObj = categories.find(c => c.id === activeCategory);
        if (activeCategory === 'premium') {
          constraints.unshift(where('isPremium', '==', true));
        } else if (activeCategory === 'following') {
          if (followingIds.size > 0) {
            constraints.unshift(where('userId', 'in', Array.from(followingIds).slice(0, 10)));
          } else {
            setImages([]);
            setIsLoading(false);
            setHasMore(false);
            return;
          }
        } else if (activeCategory !== 'all') {
          if (activeCatObj) {
            const catIdentifiers = Array.from(new Set([activeCatObj.id, activeCatObj.name, activeCatObj.slug].filter(Boolean))) as string[];
            if (catIdentifiers.length > 0) {
              constraints.unshift(where('category', 'in', catIdentifiers));
            } else {
              constraints.unshift(where('category', '==', activeCategory));
            }
          } else {
            constraints.unshift(where('category', '==', activeCategory));
          }
        }

        if (mediaType !== 'all') {
          constraints.unshift(where('type', '==', mediaType));
        }

        const qImg = query(baseQuery, ...constraints);
        
        // Use onSnapshot for real-time updates
        unsubscribeImg = onSnapshot(qImg, (snapshot) => {
          let docs = snapshot.docs.map(d => ({ ...(d.data() as any), id: d.id } as Image));
          
          const isUserAdmin = user?.isAdmin || (user?.email && ADMIN_EMAILS.some(email => user.email?.toLowerCase() === email.toLowerCase()));
          if (globalConfig?.hideExistingPosts && !isUserAdmin) {
            const cutoff = globalConfig?.existingPostsCutoff || 1781516344000;
            docs = docs.filter(d => {
              const ts = d.timestamp?.toMillis ? d.timestamp.toMillis() : (d.timestamp?.seconds ? d.timestamp.seconds * 1000 : (typeof d.timestamp === 'number' ? d.timestamp : ((d as any).createdAt ? new Date((d as any).createdAt).getTime() : Date.now())));
              return ts > cutoff;
            });
          }
          
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            if (sortOrder === 'random') {
              docs = shuffleArray(docs);
            }
            const seenInitial = new Set<string>();
            const initialUnique = docs.filter(img => {
              if (!img || !img.id || seenInitial.has(img.id)) return false;
              seenInitial.add(img.id);
              return true;
            });
            setImages(initialUnique);
          } else {
            // Subsequent real-time update (e.g., likes count incremented or post metadata edited)
            setImages(prev => {
              const updatedMap = new Map(docs.map(d => [d.id, d]));
              // Update existing items in place so order does not jump or reshuffle
              const updatedPrev = prev.map(existingImg => {
                const baseId = existingImg.id.split('_rand_')[0];
                const updatedDoc = updatedMap.get(existingImg.id) || updatedMap.get(baseId);
                if (updatedDoc) {
                  updatedMap.delete(existingImg.id);
                  updatedMap.delete(baseId);
                  return { ...existingImg, ...updatedDoc };
                }
                return existingImg;
              });

              // Prepend any new documents
              const newDocs = Array.from(updatedMap.values());
              const combined = [...newDocs, ...updatedPrev];

              // Strict uniqueness layer to prevent duplicate key errors
              const seen = new Set<string>();
              return combined.filter(img => {
                if (!img || !img.id || seen.has(img.id)) return false;
                seen.add(img.id);
                return true;
              });
            });
          }
          
          if (!hasLoadedMorePagesRef.current) {
            updateLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === (sortOrder === 'random' ? 120 : BATCH_SIZE));
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Real-time listener failed:", error);
          setIsLoading(false);
        });

      } catch (error) {
        console.error("Images fetch failed:", error);
        setIsLoading(false);
      }
    };

    fetchImagesInitial();
    return () => {
      if (unsubscribeImg) unsubscribeImg();
    };
  }, [activeCategory, sortOrder, mediaType, activeCategory === 'following' ? Array.from(followingIds).sort().join(',') : '']);

  const fetchMoreImages = async () => {
    if (!lastVisible || isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const baseQuery = collection(db, COLLECTIONS.IMAGES);
      const orderField = (sortOrder === 'popular' || sortOrder === 'trending') ? 'likes' : 'timestamp';
      const orderDirection = sortOrder === 'oldest' ? 'asc' : 'desc';
      
      let constraints: any[] = [
        orderBy(orderField, orderDirection), 
        startAfter(lastVisible), 
        limit(BATCH_SIZE)
      ];

      const activeCatObj = categories.find(c => c.id === activeCategory);
      if (activeCategory === 'premium') {
        constraints.unshift(where('isPremium', '==', true));
      } else if (activeCategory === 'following') {
        if (followingIds.size > 0) {
          constraints.unshift(where('userId', 'in', Array.from(followingIds).slice(0, 10)));
        } else {
          setIsFetchingMore(false);
          return;
        }
      } else if (activeCategory !== 'all') {
        if (activeCatObj) {
          const catIdentifiers = Array.from(new Set([activeCatObj.id, activeCatObj.name, activeCatObj.slug].filter(Boolean))) as string[];
          if (catIdentifiers.length > 0) {
            constraints.unshift(where('category', 'in', catIdentifiers));
          } else {
            constraints.unshift(where('category', '==', activeCategory));
          }
        } else {
          constraints.unshift(where('category', '==', activeCategory));
        }
      }

      if (mediaType !== 'all') {
        constraints.unshift(where('type', '==', mediaType));
      }

      const q = query(baseQuery, ...constraints);
      
      const snapshot = await getDocs(q);
      let newDocs = snapshot.docs.map(d => ({ ...(d.data() as any), id: d.id } as Image));
      
      const isUserAdmin = user?.isAdmin || (user?.email && ADMIN_EMAILS.some(email => user.email?.toLowerCase() === email.toLowerCase()));
      if (globalConfig?.hideExistingPosts && !isUserAdmin) {
        const cutoff = globalConfig?.existingPostsCutoff || 1781516344000;
        newDocs = newDocs.filter(d => {
          const ts = d.timestamp?.toMillis ? d.timestamp.toMillis() : (d.timestamp?.seconds ? d.timestamp.seconds * 1000 : (typeof d.timestamp === 'number' ? d.timestamp : ((d as any).createdAt ? new Date((d as any).createdAt).getTime() : Date.now())));
          return ts > cutoff;
        });
      }
      
      setImages(prev => {
        const combined = [...prev, ...newDocs];
        const seen = new Set();
        return combined.filter(img => {
          if (!img || !img.id || seen.has(img.id)) return false;
          seen.add(img.id);
          return true;
        });
      });
      
      if (snapshot.docs.length < BATCH_SIZE) {
        // Continuous infinite random feed so scrolling never stops
        setImages(prev => {
          if (prev.length === 0) return prev;
          const shuffle = <T,>(arr: T[]): T[] => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
          };
          const map = new Map<string, Image>();
          prev.forEach(item => {
            const rawId = item.id.split('_rand_')[0];
            if (!map.has(rawId)) map.set(rawId, item);
          });
          const baseUnique = Array.from(map.values());
          const newRandomStream = shuffle<Image>(baseUnique).map((img, idx) => ({
            ...img,
            id: `${img.id.split('_rand_')[0]}_rand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`
          }));
          const combined = [...prev, ...newRandomStream];
          const seen = new Set<string>();
          return combined.filter(img => {
            if (!img || !img.id || seen.has(img.id)) return false;
            seen.add(img.id);
            return true;
          });
        });
        setHasMore(true);
      } else {
        setHasMore(true);
      }
      
      if (snapshot.docs.length > 0) {
        hasLoadedMorePagesRef.current = true;
      }
      updateLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (inView && hasMore && !isLoading && !isFetchingMore) {
      fetchMoreImages();
    }
  }, [inView, hasMore, isLoading, isFetchingMore]);

  const handleLogin = useCallback(() => {
    openAuthModal('login');
  }, [openAuthModal]);

  const handleLogout = useCallback(async () => {
    try {
      if (clerkSignOut) await clerkSignOut();
      notify('Disconnected successfully', 'info');
    } catch (err) {
      console.error("Clerk sign out error:", err);
    }
  }, [clerkSignOut, notify]);

  const cleanupDuplicates = useCallback(async () => {
    if (!user?.isAdmin) return;
    const q = query(collection(db, COLLECTIONS.IMAGES));
    const snap = await getDocs(q);
    const allImages = snap.docs.map(d => ({ ...d.data(), id: d.id } as Image));
    
    const urlMap = new Map<string, string[]>();
    allImages.forEach(img => {
      const ids = urlMap.get(img.url) || [];
      ids.push(img.id);
      urlMap.set(img.url, ids);
    });

    const duplicates: string[] = [];
    urlMap.forEach((ids) => {
      if (ids.length > 1) {
        // Keep the first, delete others
        duplicates.push(...ids.slice(1));
      }
    });

    if (duplicates.length === 0) {
      alert("No duplicate links found in the sanctuary.");
      return;
    }

    if (confirm(`Found ${duplicates.length} duplicate assets. Purge them from sanctuary?`)) {
      const batch = writeBatch(db);
      duplicates.forEach(id => batch.delete(doc(db, COLLECTIONS.IMAGES, id)));
      await batch.commit();
      alert("Sanctuary purified. Duplicates removed.");
    }
  }, [user]);

  const handleUploadImage = async (data: any) => {
    if (!user) return;
    
    try {
      const isPremium = user.isAdmin ? (data.isPremium ?? false) : false;
      const isSample = user.isAdmin ? (data.isSample ?? false) : false;

      await addDoc(collection(db, COLLECTIONS.IMAGES), {
        ...data,
        isPremium,
        isSample,
        userId: user.uid,
        uploaderName: user.displayName || 'Anonymous Resident',
        uploaderEmail: user.email || 'hidden@sanctuary.io',
        uploaderPhotoURL: user.photoURL || null,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'create', COLLECTIONS.IMAGES);
    }
  };

  const handleAddCategory = async (name: string) => {
    if (!user?.isAdmin) return null;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const docRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), { name, slug });
    return docRef.id;
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user?.isAdmin) return;
    await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
  };

  const handleCloseModal = () => {
    setSearchParams({});
  };

  const handleNavigate = (direction: 'next' | 'prev', mediaTypeFilter: 'all' | 'video' = 'all') => {
    let currentList = filteredImages.length > 0 ? filteredImages : images;
    if (mediaTypeFilter === 'video') {
      const videoOnlyList = currentList.filter(i => i.type === 'video');
      if (videoOnlyList.length > 0) {
        currentList = videoOnlyList;
      }
    }
    if (currentList.length === 0) return;

    let currentIndex = -1;
    if (selectedImage) {
      currentIndex = currentList.findIndex(i => i.id === selectedImage.id);
    }

    if (currentIndex === -1) {
      if (direction === 'next') {
        const nextImage = currentList[0];
        if (nextImage) setSearchParams({ post: nextImage.id });
      } else {
        const prevImage = currentList[currentList.length - 1];
        if (prevImage) setSearchParams({ post: prevImage.id });
      }
      return;
    }
    
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    // Circular navigation
    if (nextIndex < 0) nextIndex = currentList.length - 1;
    if (nextIndex >= currentList.length) nextIndex = 0;
    
    const nextImage = currentList[nextIndex];
    if (nextImage) {
      setSearchParams({ post: nextImage.id });
    }
  };

  const handleImageClick = (image: Image) => {
    setSearchParams({ post: image.id });
  };

  const handleSave = async (e: MouseEvent | null, image: Image) => {
    if (e) e.stopPropagation();
    if (!user) {
      notify("Please sign in to save assets to your collections.", "info");
      openAuthModal('login');
      return;
    }

    if (savedImageIds.has(image.id)) {
      // Logic for unsaving if already in a collection
      try {
        const q = query(collection(db, COLLECTIONS.COLLECTIONS), where('userId', '==', user.uid), where('imageIds', 'array-contains', image.id));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.update(d.ref, {
            imageIds: (d.data().imageIds as string[]).filter(id => id !== image.id)
          });
        });
        await batch.commit();
        setSavedImageIds(prev => {
          const next = new Set(prev);
          next.delete(image.id);
          return next;
        });
      } catch (err) {
        console.error("Unsave failed:", err);
      }
      return;
    }

    setSavingImage(image);
  };

  const handleToggleSelect = useCallback((image: Image) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(image.id)) {
        next.delete(image.id);
      } else {
        next.add(image.id);
      }
      return next;
    });
  }, []);

  const handleStartSelectMode = useCallback((image: Image) => {
    if (!user?.isAdmin) return;
    setIsSelectMode(true);
    setSelectedPostIds(new Set([image.id]));
    notify("Selection Mode Active. Select items to manage in batch.", "info");
  }, [user, notify]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedPostIds(prev => {
      if (prev.size === images.length) {
        return new Set();
      } else {
        return new Set(images.map(img => img.id));
      }
    });
  }, [images]);

  const handleClearSelection = useCallback(() => {
    setSelectedPostIds(new Set());
  }, []);

  const handleBulkExit = useCallback(() => {
    setIsSelectMode(false);
    setSelectedPostIds(new Set());
    setShowBulkMenu(false);
  }, []);

  const handleBulkDownload = async () => {
    const selectedList = images.filter(img => selectedPostIds.has(img.id));
    if (selectedList.length === 0) return;
    notify(`Downloading ${selectedList.length} asset(s)...`, "info");
    for (const item of selectedList) {
      try {
        const resp = await fetch(item.url);
        const blob = await resp.blob();
        const ext = blob.type.split('/')[1] || (item.type === 'video' ? 'mp4' : 'jpg');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Aether.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn("Direct download failed, opening link:", e);
        window.open(item.url, '_blank');
      }
    }
    notify(`Batch download initialized for ${selectedList.length} assets.`, "success");
  };

  const handleBulkAddTags = async (newTags: string[]) => {
    if (selectedPostIds.size === 0 || newTags.length === 0) return;
    try {
      const batch = writeBatch(db);
      selectedPostIds.forEach(id => {
        const img = images.find(i => i.id === id);
        const existingTags = img?.tags || [];
        const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
        batch.update(doc(db, COLLECTIONS.IMAGES, id), { tags: mergedTags });
      });
      await batch.commit();
      notify(`Updated tags for ${selectedPostIds.size} posts.`, "success");
      handleBulkExit();
    } catch (err) {
      console.error("Bulk tag update failed:", err);
      notify("Bulk tag update failed.", "error");
    }
  };

  const [bulkTitleInput, setBulkTitleInput] = useState('');
  const [bulkCategoryInput, setBulkCategoryInput] = useState('');

  const handleBulkChangeCategory = async (tgtCategory: string) => {
    if (selectedPostIds.size === 0) {
      notify("No posts selected.", "error");
      return;
    }
    if (!tgtCategory) {
      notify("Please select a target category.", "error");
      return;
    }
    try {
      const batch = writeBatch(db);
      selectedPostIds.forEach(id => {
        batch.update(doc(db, COLLECTIONS.IMAGES, id), { category: tgtCategory });
      });
      await batch.commit();
      notify(`Category updated to "${tgtCategory}" for ${selectedPostIds.size} posts.`, "success");
      handleBulkExit();
    } catch (err) {
      console.error("Bulk category update failed:", err);
      notify("Bulk category update failed.", "error");
    }
  };

  const handleBulkChangeVisibility = async (makePremium: boolean) => {
    if (selectedPostIds.size === 0) {
      notify("No posts selected.", "error");
      return;
    }
    try {
      const batch = writeBatch(db);
      selectedPostIds.forEach(id => {
        batch.update(doc(db, COLLECTIONS.IMAGES, id), { isPremium: makePremium });
      });
      await batch.commit();
      notify(`Configured ${selectedPostIds.size} posts as ${makePremium ? "Premium" : "Public"}.`, "success");
      handleBulkExit();
    } catch (err) {
      console.error("Bulk visibility update failed:", err);
      notify("Bulk update failed.", "error");
    }
  };

  const handleBulkChangeTitle = async (newTitle: string) => {
    if (selectedPostIds.size === 0) {
      notify("No posts selected.", "error");
      return;
    }
    if (!newTitle.trim()) {
      notify("Please fill out a valid title.", "error");
      return;
    }
    try {
      const batch = writeBatch(db);
      selectedPostIds.forEach(id => {
        batch.update(doc(db, COLLECTIONS.IMAGES, id), { title: newTitle.trim() });
      });
      await batch.commit();
      notify(`Updated titles of ${selectedPostIds.size} posts.`, "success");
      setBulkTitleInput('');
      handleBulkExit();
    } catch (err) {
      console.error("Bulk title update failed:", err);
      notify("Bulk title change failed.", "error");
    }
  };

  const [singlePostUrlInput, setSinglePostUrlInput] = useState('');

  useEffect(() => {
    if (selectedPostIds.size === 1) {
      const singleId = Array.from(selectedPostIds)[0];
      const found = images.find(img => img.id === singleId);
      if (found) {
        setSinglePostUrlInput(found.url || '');
      }
    } else {
      setSinglePostUrlInput('');
    }
  }, [selectedPostIds, images]);

  const handleUpdateSinglePostUrl = async (id: string, newUrl: string) => {
    if (!user?.isAdmin) return;
    if (!newUrl.trim()) {
      notify("Hosting link cannot be empty.", "error");
      return;
    }
    try {
      await updateDoc(doc(db, COLLECTIONS.IMAGES, id), { url: newUrl.trim() });
      notify("Asset hosting link updated successfully.", "success");
      handleBulkExit();
    } catch (err) {
      console.error("Failed to update hosting link:", err);
      notify("Failed to update hosting link.", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPostIds.size === 0) {
      notify("No posts selected.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete these ${selectedPostIds.size} manifestations?`)) {
      return;
    }
    try {
      const batch = writeBatch(db);
      selectedPostIds.forEach(id => {
        batch.delete(doc(db, COLLECTIONS.IMAGES, id));
      });
      await batch.commit();
      notify(`Permanently deleted ${selectedPostIds.size} posts.`, "success");
      handleBulkExit();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      notify("Bulk delete failed.", "error");
    }
  };

  const handleBulkShare = async () => {
    const selectedList = images.filter(img => selectedPostIds.has(img.id));
    if (selectedList.length === 0) {
      notify("No posts selected.", "error");
      return;
    }
    
    notify("Downloading asset copies for native sharing...", "info");
    
    try {
      const filesToShare: File[] = [];
      for (const item of selectedList) {
        if (!item.url) continue;
        try {
          const resp = await fetch(item.url);
          const blob = await resp.blob();
          const ext = blob.type.split('/')[1] || 'jpg';
          const file = new File([blob], `${item.title.replace(/\s+/g, '_')}_Aether.${ext}`, { type: blob.type });
          filesToShare.push(file);
        } catch (fetchErr) {
          console.warn("Failed fetching blog file, using fallback URL sharing:", fetchErr);
        }
      }
      
      if (filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          files: filesToShare,
          title: "Aether Sanctum Assets",
          text: `Shared ${filesToShare.length} image/video asset(s) from Aether Sanctum`
        });
        notify("Directly shared files!", "success");
        handleBulkExit();
      } else {
        // Fallback: If cannot share all at once using share APIs, trigger batch downloads!
        notify("Direct platform sharing limited. Invoking batch file downloads instead.", "info");
        for (const file of filesToShare) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(file);
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        handleBulkExit();
      }
    } catch (err) {
      console.warn("Share flow failed:", err);
      // Absolute fallback: clipboard copy
      try {
        const urls = selectedList.map(img => img.url).join("\n");
        await copyToClipboard(urls);
        notify("Could not invoke direct sharing. Direct links copied to clipboard instead.", "info");
        handleBulkExit();
      } catch (clipboardErr) {
        notify("Sharing failed.", "error");
      }
    }
  };

  const handleLike = async (e: MouseEvent, image: Image) => {
    e.stopPropagation();
    if (!user) {
      notify("Please sign in to like this sanctuary asset.", "info");
      openAuthModal('login');
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
        setImages(prev => prev.map(img => img.id === image.id ? { ...img, likes: Math.max(0, (img.likes || 1) - 1) } : img));
      } else {
        newLikes.add(image.id);
        trackActivity(user.uid, [image.category, ...image.tags], 'like');
        await setDoc(doc(db, COLLECTIONS.LIKES, likeDocId), {
          userId: user.uid,
          imageId: image.id,
          timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, COLLECTIONS.IMAGES, image.id), {
          likes: increment(1)
        });
        setImages(prev => prev.map(img => img.id === image.id ? { ...img, likes: (img.likes || 0) + 1 } : img));
      }

      setLikedImageIds(newLikes);
    } catch (error) {
      console.error("Like failed:", error);
      alert("Something went wrong with your interaction. Please try again.");
    }
  };

  useEffect(() => {
    if (user) {
      getUserInterests(user.uid).then(setUserInterests);
    } else {
      setUserInterests([]);
    }
  }, [user]);

  useEffect(() => {
    if (images.length > 0 && !isLoading) {
      // Preload first batch for priority rendering
      const priorityCount = 6;
      images.slice(0, priorityCount).forEach(img => {
        if (img.url && !img.url.includes('api/health')) {
          const i = new window.Image();
          i.src = img.url;
          i.decode?.().catch(() => {});
        }
      });
    }
  }, [images, isLoading]);

  const filteredImages = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    const commentMatchesSet = new Set(commentMatches);
    
    // 1. Structural Filtering (Aspect Ratio + Sanitization)
    let result = images.filter(img => {
      // Robust Image Sanitization
      if (!img || !img.id) return false;

      // Aspect Ratio Filter with Fallback for legacy assets
      if (aspectRatioFilter !== 'all') {
        const isYoutube = /youtube\.com|youtu\.be/i.test(img.url);
        const isYoutubeShort = isYoutube && img.url.toLowerCase().includes('/shorts/');
        const isInferredPortrait = img.aspectRatio === 'portrait' || 
                                   isYoutubeShort || 
                                   /portrait|vertical|reel|tiktok|9-16|9_16|9x16/i.test(img.url);
        const imgRatio = isInferredPortrait ? 'portrait' : (img.aspectRatio || 'landscape');
        if (imgRatio !== aspectRatioFilter) return false;
      }

      if (!q) return true;

      // 2. Multi-Tiered Search Accuracy
      const tokens = q.split(/\s+/).filter(Boolean);
      
      // Tier A: Direct ID or Comment hit
      if (commentMatchesSet.has(img.id) || img.id === q) return true;

      const title = img.title?.toLowerCase() || '';
      const description = img.description?.toLowerCase() || '';
      const tags = (img.tags || []).map(t => t.toLowerCase());
      const uploader = img.uploaderName?.toLowerCase() || '';
      
      const cat = categories.find(c => c.id === img.category);
      const catName = cat?.name.toLowerCase() || '';

      // Must match ALL tokens in ANY of the fields (High accuracy)
      return tokens.every(token => 
        title.includes(token) || 
        tags.some(t => t.includes(token)) || 
        description.includes(token) ||
        uploader.includes(token) ||
        catName.includes(token)
      );
    });

    // 3. Relevance Ranking (Better Accuracy)
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      result = [...result].sort((a, b) => {
        const getScore = (img: Image) => {
          let score = 0;
          const title = img.title?.toLowerCase() || '';
          const tags = (img.tags || []).map(t => t.toLowerCase());
          
          tokens.forEach(token => {
            if (title === token) score += 100;
            else if (title.startsWith(token)) score += 40;
            else if (title.includes(token)) score += 20;
            
            if (tags.includes(token)) score += 50;
            else if (tags.some(t => t === token)) score += 30;
            else if (tags.some(t => t.includes(token))) score += 10;
          });
          
          if (commentMatchesSet.has(img.id)) score += 25;
          return score;
        };

        const scoreB = getScore(b);
        const scoreA = getScore(a);
        if (scoreB !== scoreA) return scoreB - scoreA;
        
        return 0;
      });
    }

    // 4. Strict Uniqueness Layer
    const seen = new Set<string>();
    return result.filter(img => {
      if (!img || !img.id || seen.has(img.id)) return false;
      seen.add(img.id);
      return true;
    });
  }, [deferredSearchQuery, images, commentMatches, aspectRatioFilter, categories]);

  // PWA Install Prompt Logic
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Sync selected image with URL & Popstate for mobile back button
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get('post') || params.get('id');
      if (!postId) {
        setSelectedImage(null);
        setSelectedImageIndex(-1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    const postId = searchParams.get('post') || searchParams.get('id');
    if (postId) {
       // Search in current images first for speed
       const img = images.find(i => i.id === postId);
       if (img) {
         setSelectedImage(img);
         const idx = filteredImages.findIndex(i => i.id === postId);
         setSelectedImageIndex(idx);
       } else {
         // If not found (e.g. from shared link or Related Assets fetch), fetch directly from Firestore
         const fetchImageById = async () => {
           try {
             const docRef = doc(db, COLLECTIONS.IMAGES, postId);
             const docSnap = await getDoc(docRef);
             if (docSnap.exists()) {
               const fetchedImg = { id: docSnap.id, ...docSnap.data() } as Image;
               setSelectedImage(fetchedImg);
               setSelectedImageIndex(-1);
             }
           } catch (e) {
             console.error("Direct fetch failed for post ID:", postId, e);
           }
         };
         fetchImageById();
       }
    } else {
       setSelectedImage(null);
       setSelectedImageIndex(-1);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchParams, images, filteredImages]);

  // Handle Home Screen Installation trigger if requested via URL or state
  useEffect(() => {
    if (searchParams.get('install') === 'true') {
      handleInstallClick();
      setSearchParams(prev => {
        prev.delete('install');
        return prev;
      });
    }
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 1000);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const location = useLocation();

  const isEmbed = searchParams.get('embed') === 'true';

  if (user && (user.isBanned || user.isHold)) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6 text-center relative z-[9999]">
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          <div className="absolute inset-0 bg-bg-dark" />
          <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.08)_0%,transparent_50%)]" />
        </div>
        <div className="max-w-md w-full bg-[#121010] border border-red-500/20 rounded-[40px] p-8 md:p-12 space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-2 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-display font-medium tracking-tight text-white uppercase">
              Aether <span className="text-red-500">Protocol</span> Lockout
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/50">
              STATUS: {user.isBanned ? "PERMANENT SUSPENSION" : "CURATORIAL HOLD"}
            </p>
          </div>
          <p className="text-xs text-text-dim leading-relaxed font-semibold">
            {user.isBanned 
              ? "Your access credentials have been permanently declassified and severed from the sanctuary networks due to standard code infringement."
              : "Your sanctuary channel is currently on curatorial hold. Access permissions are temporarily frozen pending review."}
          </p>
          <div className="pt-2">
            <button 
              onClick={handleLogout}
              className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-text-main rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Disconnect Vessel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen relative overflow-hidden", isEmbed && "p-0")}>
      {/* Advanced Premium Theme Switcher Visual Effects Layer */}
      <ThemeVisualizer currentTheme={currentTheme} />

      {/* Immersive Protocol Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute inset-0 bg-bg-dark" />
        <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--brand-primary-rgb),0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-[100] pointer-events-none bg-[length:100%_2px,3px_100%] opacity-[0.02]" />
      </div>

      {!isEmbed && (
        <Navbar 
          searchQuery={searchQuery}
          isAdmin={effectiveUser?.isAdmin || false} 
          user={effectiveUser}
          onSearch={handleSearchChange} 
          onLogout={handleLogout}
          onLogin={handleLogin}
          onOpenProfileSwitcher={handleOpenProfileSwitcher}
          onInstall={deferredPrompt ? handleInstallClick : undefined}
          recommendations={searchRecommendations}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          mediaType={mediaType}
          onMediaTypeChange={setMediaType}
          aspectRatioFilter={aspectRatioFilter}
          onAspectRatioChange={setAspectRatioFilter}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
        />
      )}

      <AnimatePresence>
        {showOnboarding && (
          <SmartOnboarding 
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingComplete}
            userName={effectiveUser?.displayName || undefined}
          />
        )}
      </AnimatePresence>

      {/* Redesigned Floating Selection Toolbar */}
      {isSelectMode && !selectedImage && (
        <SelectionToolbar
          selectedPostIds={selectedPostIds}
          totalVisiblePosts={filteredImages.length > 0 ? filteredImages.length : images.length}
          allVisibleImages={filteredImages.length > 0 ? filteredImages : images}
          categories={categories}
          user={effectiveUser}
          onToggleSelectAll={handleToggleSelectAll}
          onClearSelection={handleClearSelection}
          onExitSelectMode={handleBulkExit}
          onBulkChangeCategory={handleBulkChangeCategory}
          onBulkChangeVisibility={handleBulkChangeVisibility}
          onBulkChangeTitle={handleBulkChangeTitle}
          onBulkAddTags={handleBulkAddTags}
          onBulkUpdateUrl={handleUpdateSinglePostUrl}
          onBulkDelete={handleBulkDelete}
          onBulkDownload={handleBulkDownload}
          onBulkShare={handleBulkShare}
        />
      )}

      <AnimatePresence>
        {showBackToTop && !selectedImage && (
          <motion.button
            key="back-to-top-btn"
            initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-brand-primary text-bg-dark rounded-2xl shadow-2xl hover:scale-110 active:scale-90 transition-all border border-brand-primary/20"
        >
          <ArrowLeft className="w-5 h-5 rotate-90" />
        </motion.button>
      )}
      </AnimatePresence>

      <Suspense fallback={
        <div className="pt-32 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-10 h-10 border-2 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/40 animate-pulse">Loading Sanctum...</p>
        </div>
      }>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname}>
            <Routes location={location}>
          <Route path="/" element={
            <motion.div 
               initial={{ opacity: 0, y: 10 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="pt-[80px] md:pt-[88px] min-h-screen"
            >
              
              <main className="pb-20">
                {isLoading && images.length === 0 ? (
                  <div className="px-4 md:px-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={`init-skeleton-${i}`} className="aspect-[3/4] bg-white/[0.03] rounded-3xl animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : filteredImages.length > 0 ? (
                  <>
                    <div className="px-6 md:px-10 mb-4 flex items-center justify-end">
                       {!hasMore && !isLoading && !isFetchingMore && filteredImages.length > 0 && sortOrder !== 'random' && (
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary/40 animate-pulse">Continuum Reached</span>
                       )}
                    </div>
                    <MasonryGrid 
                      key={`main-grid-${activeCategory}-${sortOrder}-${mediaType}`}
                      images={filteredImages} 
                      user={user}
                      onImageClick={handleImageClick}
                      onLike={handleLike}
                      onSave={handleSave}
                      likedImageIds={likedImageIds}
                      savedImageIds={savedImageIds}
                      isFetchingMore={isFetchingMore}
                      isSelectMode={isSelectMode}
                      selectedPostIds={selectedPostIds}
                      onToggleSelect={handleToggleSelect}
                      onStartSelectMode={handleStartSelectMode}
                    />
                    <div ref={ref} className="h-64 flex flex-col items-center justify-center gap-6">
                      {isFetchingMore ? (
                        <>
                          <div className="w-12 h-12 border-2 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/40 animate-pulse">{t('common.loading') || 'Accessing Aether...'}</p>
                        </>
                      ) : !hasMore && !isLoading && !isFetchingMore && filteredImages.length > 0 && sortOrder !== 'random' ? (
                        <div className="flex flex-col items-center gap-6 py-20 animate-in fade-in zoom-in duration-1000">
                          <div className="w-12 h-px bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent" />
                          <div className="text-center space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-dim/30">{t('common.end_of_sanctuary')}</p>
                            <p className="text-[9px] font-bold text-text-dim/20 uppercase tracking-[0.2em]">{t('common.all_manifestations')}</p>
                          </div>
                          <div className="w-12 h-px bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent" />
                        </div>
                      ) : (
                        <div className="w-1 h-1 bg-text-main/10 rounded-full" />
                      )}
                    </div>
                    <ImageModal 
                      image={selectedImage} 
                      onClose={handleCloseModal} 
                      onLike={handleLike}
                      onSave={(img) => handleSave(null, img)}
                      hasLiked={selectedImage ? likedImageIds.has(selectedImage.id) : false}
                      isSaved={selectedImage ? savedImageIds.has(selectedImage.id) : false}
                      user={effectiveUser}
                      onNavigate={handleNavigate}
                      hasNext={filteredImages.length > 1}
                      hasPrev={filteredImages.length > 1}
                      onSelectImage={handleImageClick}
                      onLogin={handleLogin}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 px-10 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="relative">
                       <div className="w-32 h-32 rounded-[40px] bg-white/[0.01] border border-white/[0.05] flex items-center justify-center text-text-dim/20 relative overflow-hidden group">
                        <Search className="w-12 h-12 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 to-transparent" />
                      </div>
                      <div className="absolute -inset-4 border border-brand-primary/10 rounded-[50px] animate-[pulse_4s_infinite] opacity-20" />
                    </div>
                    <div className="space-y-4 max-w-sm">
                      <h3 className="text-3xl font-display font-black text-text-main uppercase tracking-tighter italic">Deep Quietude</h3>
                      <p className="text-[10px] text-text-dim/40 leading-relaxed uppercase tracking-[0.2em] font-bold">The Aether has no reflections for this frequency. Try an alternative keyword.</p>
                    </div>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="px-10 py-4 bg-white/5 border border-white/10 hover:border-brand-primary/40 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all text-text-main hover:text-brand-primary shadow-2xl group"
                    >
                      {t('common.explore')}
                    </button>
                  </div>
                )}
              </main>
            </motion.div>
          } />

          <Route path="/profile/:profileId?" element={
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ProfilePage 
                user={effectiveUser} 
                onLike={handleLike} 
                onSave={handleSave} 
                likedImageIds={likedImageIds}
                savedImageIds={savedImageIds}
                onLogin={handleLogin}
                onOpenProfileSwitcher={handleOpenProfileSwitcher}
              />
            </motion.div>
          } />

          <Route path="/upload" element={
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {effectiveUser ? (
                <div className="pt-28 md:pt-36 px-4 md:px-8 max-w-7xl mx-auto space-y-8 pb-20">
                  <div className="flex justify-start">
                    <RouterLink 
                      to="/" 
                      className="flex items-center gap-2 text-text-dim hover:text-white transition-colors group"
                    >
                      <div className="p-2 rounded-full border border-border-dark group-hover:border-brand-primary/50 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">{t('common.back')}</span>
                    </RouterLink>
                  </div>
                  <header>
                    <h1 className="text-4xl font-display font-bold mb-2 text-text-main">{t('nav.post') || 'Share a Moment'}</h1>
                    <p className="text-text-dim/40 uppercase tracking-widest text-[10px] font-bold">Contribute your curated vision to the Aether Sanctuary</p>
                  </header>
                  <div className="max-w-4xl">
                    <UploadForm 
                      categories={categories} 
                      existingImages={images} 
                      onUpload={handleUploadImage} 
                      onAddCategory={handleAddCategory}
                      isAdmin={effectiveUser.isAdmin} 
                      onNotify={notify}
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-36 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-display font-black tracking-tight text-text-main">Manifest In Sanctuary</h2>
                    <p className="text-xs text-text-dim leading-relaxed font-medium">
                      Sign in or create your account to upload and publish images or videos to the Aether collection.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="px-8 py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20"
                  >
                    Sign In / Create Account
                  </button>
                  <RouterLink to="/" className="text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-text-main">
                    ← Explore Sanctuary Gallery
                  </RouterLink>
                </div>
              )}
            </motion.div>
          } />

          <Route path="/upgrade" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UpgradePage user={effectiveUser} onLogin={handleLogin} />
            </motion.div>
          } />

          <Route path="/moderation" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {effectiveUser?.isAdmin ? <ModerationPage /> : <Navigate to="/" replace />}
            </motion.div>
          } />

          <Route path="/about" element={
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <AboutPage />
             </motion.div>
          } />

          <Route path="/developer" element={
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <DeveloperPage user={effectiveUser} />
             </motion.div>
          } />

          <Route path="/admin" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {effectiveUser ? (
                effectiveUser.isAdmin ? (
                  <div className="pt-24 md:pt-36 px-4 md:px-8 max-w-7xl mx-auto space-y-6 pb-20">
                    <div className="flex justify-start">
                      <RouterLink 
                        to="/" 
                        className="flex items-center gap-2 text-text-dim/60 hover:text-text-main transition-colors group"
                      >
                        <div className="p-1.5 rounded-full border border-border-dark group-hover:border-brand-primary/30 transition-colors">
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Back</span>
                      </RouterLink>
                    </div>
                    <header className="space-y-1">
                      <h1 className="text-2xl md:text-3xl font-display font-black text-text-main uppercase tracking-tight">Admin Terminal</h1>
                      <p className="text-text-dim/40 uppercase tracking-[0.2em] text-[8px] font-bold">Structure management & Content Ingress</p>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      <div className="lg:col-span-3 space-y-6">
                        <div className="p-4 bg-white/[0.02] border border-border-dark rounded-2xl flex items-center justify-between">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-text-main">Health Monitor</p>
                              <p className="text-[8px] text-text-dim/40 uppercase tracking-widest mt-0.5">Integrity sync tools</p>
                           </div>
                           <button 
                             onClick={cleanupDuplicates}
                             className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all active:scale-95"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                             Clear All Duplicates
                           </button>
                        </div>
                        <UploadForm 
                          categories={categories} 
                          existingImages={images} 
                          onUpload={handleUploadImage} 
                          onAddCategory={handleAddCategory}
                          isAdmin={effectiveUser.isAdmin} 
                          onNotify={notify}
                        />
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
                    <p className="text-text-dim/40">You don't have permission to view this page.</p>
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
                    <h2 className="text-4xl font-display font-black mb-2 uppercase tracking-tighter text-text-main">Aether <span className="text-brand-primary italic">Gallery</span></h2>
                    <p className="text-text-dim/40 uppercase tracking-[0.3em] text-[10px] font-bold">The Curated Media Sanctuary</p>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-text-dim/40 text-xs font-medium">Sign in to manage your collection</p>
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
            }
          </motion.div>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  </Suspense>

        {!isEmbed && (
          <footer className="px-10 py-6 text-xs text-text-dim flex justify-between border-t border-border-dark mt-10">
            <div className="mx-auto text-center opacity-40 uppercase tracking-[0.2em] font-black">
              &copy; {new Date().getFullYear()} Aether Sanctuary • Pure Media Digital Realm
            </div>
          </footer>
        )}

        <AnimatePresence>
          {notification && (
            <Notification 
              key="global-notification"
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
        </AnimatePresence>

        {savingImage && (
          <CollectionModal 
            imageId={savingImage.id} 
            user={effectiveUser} 
            onClose={() => setSavingImage(null)} 
          />
        )}

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
          initialEmail={authInitialEmail}
          onSuccess={(msg) => {
            if (msg) notify(msg, 'success');
          }}
        />

        <ProfileSwitcherModal
          isOpen={profileSwitcherOpen}
          onClose={() => setProfileSwitcherOpen(false)}
          currentUser={effectiveUser}
          onSwitchToProfile={handleSwitchToProfile}
          onAddNewProfile={handleAddNewProfile}
          onLogoutAll={handleLogoutAll}
          onLogoutCurrent={handleLogoutCurrent}
        />

        <PwaInstallPrompt
          deferredPrompt={deferredPrompt}
          isDismissed={isInstallDismissed}
          onInstall={handleInstallClick}
          onDismiss={() => {
            localStorage.setItem('pwa-install-banner-dismissed', 'true');
            setIsInstallDismissed(true);
          }}
        />
      </div>
  );
}
