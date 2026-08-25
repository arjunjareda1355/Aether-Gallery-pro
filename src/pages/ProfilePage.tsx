import React, { useState, useEffect, useMemo } from 'react';
import { db, COLLECTIONS, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, setDoc, deleteDoc, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { useClerk, useUser } from '../lib/clerk';
import { User, Collection, Image, Follow } from '../types';
import MasonryGrid from '../components/gallery/MasonryGrid';
import ImageModal from '../components/gallery/ImageModal';
import EmailVerificationModal from '../components/auth/EmailVerificationModal';
import ProfileAvatarEditor from '../components/profile/ProfileAvatarEditor';
import { recordProfileSession } from '../services/profileManager';
import { hapticLight, hapticSuccess, hapticSelection, hapticMedium } from '../utils/haptics';
import { Folder, Bookmark, User as UserIcon, ArrowLeft, Shield, Sparkles, Heart, Globe, Lock, Edit3, MapPin, Link as LinkIcon, Calendar, Briefcase, UserCircle, Save, X, ShieldCheck, CheckCircle2, Clock, Mail, Plus, Palette, Trash2, Crown, Palette as Paintbrush, UserPlus, UserMinus, Users, Upload, Camera, Crop } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface ProfilePageProps {
  user: User | null;
  onLike: (e: React.MouseEvent, image: Image) => void;
  onSave: (e: React.MouseEvent, image: Image) => void;
  likedImageIds: Set<string>;
  savedImageIds: Set<string>;
  onLogin?: () => void;
  onOpenProfileSwitcher?: () => void;
}

type TabType = 'collections' | 'likes' | 'uploads';

const FIRST_NAMES = [
  "Emily", "Alexander", "Sophia", "Daniel", "Olivia", "Liam", "Mia", "Noah", "Emma", "Ethan",
  "Isabella", "James", "Ava", "Lucas", "Charlotte", "Mason", "Amelia", "Logan", "Harper", "Oliver",
  "Evelyn", "Elijah", "Abigail", "Carter", "Ella", "Benjamin", "Aria", "Henry", "Scarlett", "Sebastian",
  "Jack", "Grace", "Aiden", "Lily", "Jackson", "Chloe", "Wyatt", "Zoey", "Michael", "Penelope",
  "Victoria", "Matthew", "Madison", "Luke", "Eleanor", "David", "Grace", "Aria", "Julian", "Hazel"
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Adams", "Nelson", "Baker", "Hall", "Rivera", "Mitchell", "Carter", "Roberts", "Gomez", "Phillips"
];

const FAKE_BIOS = [
  "Quantum architect of visual spaces. Lost in translation.",
  "Digital alchemist seeking pure sanctuary in the aether.",
  "Chasing twilight gradients and cinematic shadows.",
  "Living in transient frames. Designer & photographer.",
  "Constructing dreamworlds through high-fidelity rendering.",
  "Observing the slow movement of code and stars.",
  "Sanctuary researcher wandering the neon quietude.",
  "Exploring the boundary of organic matter and pixels.",
  "Minimalist traveler. Archiving moments in stillness.",
  "Crafting high-contrast layouts & quiet soundscapes.",
  "Visual sensory researcher focusing on light dynamics.",
  "Aether soul searching for visual solace.",
  "Voxel sculpture painter. Crafting light beams.",
  "Cybernetics master creating responsive pixel portals.",
  "Lost in absolute quietude. Sound and frame explorer."
];

const FAKE_LOCATIONS = [
  "Cosmic Sanctuary", "Neon Shinjuku", "The Echo Chamber", "Aether Citadel",
  "Solar Axis", "Subterranean Lab", "Deep Space Orbit", "Verdant Outpost",
  "Cyber City Grid", "Noir Light Sector", "Voxel Plateau", "Liquid Sea"
];

function getSeededIndex(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
}

function getDeterministicSeededIndex(seed: string, index: number, max: number): number {
  const combinedSeed = `${seed}_${index}`;
  return getSeededIndex(combinedSeed, max);
}

function generateFakeUsers(
  count: number, 
  existingCount: number = 0, 
  imagePool: string[] = [],
  seedId: string = 'aether'
): Array<{ uid: string; displayName: string; photoURL: string; email: string; bio: string; location: string; isFake: boolean }> {
  const list: any[] = [];
  const domains = ['aether.io', 'sanctuary.design', 'skyward.dev', 'chronos.net', 'spectra.agency', 'cosmicmail.org', 'observer.world'];
  
  for (let i = 0; i < count; i++) {
    const globalIdx = existingCount + i;
    const firstIdx = getDeterministicSeededIndex(seedId + "_first", globalIdx, FIRST_NAMES.length);
    const lastIdx = getDeterministicSeededIndex(seedId + "_last", globalIdx, LAST_NAMES.length);
    const name = `${FIRST_NAMES[firstIdx]} ${LAST_NAMES[lastIdx]}`;
    
    const cleanFirst = FIRST_NAMES[firstIdx].toLowerCase();
    const cleanLast = LAST_NAMES[lastIdx].toLowerCase();
    const nameRand = getDeterministicSeededIndex(seedId + "_rand_num", globalIdx, 1000);
    const username = `${cleanFirst}.${cleanLast}${nameRand > 750 ? nameRand : ''}`;
    
    const domainIdx = getDeterministicSeededIndex(seedId + "_dom", globalIdx, domains.length);
    const email = `${username}@${domains[domainIdx]}`;
    
    const bioIdx = getDeterministicSeededIndex(seedId + "_bio", globalIdx, FAKE_BIOS.length);
    const locationIdx = getDeterministicSeededIndex(seedId + "_loc", globalIdx, FAKE_LOCATIONS.length);
    
    const bio = FAKE_BIOS[bioIdx];
    const location = FAKE_LOCATIONS[locationIdx];
    
    // 30% frequency of taking image from real user uploads, else a high-fidelity avatar style
    const photoType = getDeterministicSeededIndex(seedId + "_photo_type", globalIdx, 10);
    let photoURL = "";
    if (photoType < 3 && imagePool.length > 0) {
      const imgIdx = getDeterministicSeededIndex(seedId + "_img_pool", globalIdx, imagePool.length);
      photoURL = imagePool[imgIdx];
    } else {
      const styleSeeds = ['lorelei', 'bottts', 'adventurer', 'fun-emoji', 'micah'];
      const styleIdx = getDeterministicSeededIndex(seedId + "_style", globalIdx, styleSeeds.length);
      photoURL = `https://api.dicebear.com/7.x/${styleSeeds[styleIdx]}/svg?seed=${encodeURIComponent(username)}`;
    }
    
    list.push({
      uid: `fake_user_${seedId}_${globalIdx}`,
      displayName: name,
      photoURL,
      email,
      bio,
      location,
      isFake: true
    });
  }
  return list;
}

export function formatCount(num: number): string {
  if (num >= 1e12) {
    return (num / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
  }
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export default function ProfilePage({ 
  user: authUser, 
  onLike, 
  onSave, 
  likedImageIds, 
  savedImageIds,
  onLogin,
  onOpenProfileSwitcher
}: ProfilePageProps) {
  const { signOut: clerkSignOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { profileId } = useParams();
  const targetId = profileId || authUser?.uid;
  const isOwnProfile = authUser?.uid === targetId;
  const isProfileOwnerOrAdmin = isOwnProfile || authUser?.isAdmin || ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com', 'aethersanctuaryofficial@gmail.com'].includes(authUser?.email || '');
  const isAppOwner = authUser?.isAdmin || ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com', 'aethersanctuaryofficial@gmail.com'].includes(authUser?.email || '');

  const [activeTab, setActiveTab] = useState<TabType>('collections');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadedImagesMap, setLoadedImagesMap] = useState<Record<string, Image>>({});
  const [userUploads, setUserUploads] = useState<Image[]>([]);
  const allImages = useMemo(() => {
    return Object.values(loadedImagesMap);
  }, [loadedImagesMap]);
  const [targetLikedIds, setTargetLikedIds] = useState<string[]>([]);
  useEffect(() => {
    if (!targetId) return;
    const qLikes = query(collection(db, COLLECTIONS.LIKES), where('userId', '==', targetId));
    const unsub = onSnapshot(qLikes, (s) => {
      setTargetLikedIds(s.docs.map(d => d.data().imageId));
    });
    return () => unsub();
  }, [targetId]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedCollection, setExpandedCollection] = useState<Collection | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Profile deletion state resonance
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = Warning screen, 2 = Type confirmation to delete, 3 = Deleting state
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeletingProfileState, setIsDeletingProfileState] = useState(false);

  const [profileData, setProfileData] = useState<User | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { t } = useTranslation();

  const [realFollowersList, setRealFollowersList] = useState<Follow[]>([]);
  const [realFollowingList, setRealFollowingList] = useState<Follow[]>([]);
  const [loadedUsers, setLoadedUsers] = useState<Record<string, User>>({});
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [contactsModalTab, setContactsModalTab] = useState<'followers' | 'following'>('followers');
  const [selectedFakeUser, setSelectedFakeUser] = useState<any | null>(null);

  // Background soul generation compilation status tracking
  const [backgroundProgress, setBackgroundProgress] = useState<{
    running: boolean;
    current: number;
    total: number;
  }>({ running: false, current: 0, total: 0 });

  // Pagination limit for modal view list rendering
  const [visibleLimit, setVisibleLimit] = useState(100);

  useEffect(() => {
    setVisibleLimit(100);
  }, [contactsModalTab, isContactsModalOpen]);

  useEffect(() => {
    if (backgroundProgress.running) {
      const interval = setInterval(() => {
        setBackgroundProgress(prev => {
          if (prev.current >= prev.total) {
            clearInterval(interval);
            return { ...prev, running: false };
          }
          const stepSize = Math.max(1, Math.ceil(prev.total / 15));
          return {
            ...prev,
            current: Math.min(prev.total, prev.current + stepSize)
          };
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [backgroundProgress.running, backgroundProgress.total]);

  useEffect(() => {
    if (!targetId) return;

    setLoadedImagesMap({});
    setUserUploads([]);
    setIsLoadingProfile(true);
    // Fetch full user data from firestore
    const unsubUser = onSnapshot(doc(db, COLLECTIONS.USERS, targetId), (docSnap) => {
      if (docSnap.exists()) {
        setProfileData(docSnap.data() as User);
        setIsLoadingProfile(false);
      } else {
        if (targetId !== authUser?.uid) {
           setIsLoadingProfile(false);
        } else {
           const t = setTimeout(() => {
             setIsLoadingProfile(prev => {
               if (prev) return false;
               return prev;
             });
           }, 5000);
           return () => clearTimeout(t);
        }
      }
    });

    // Follow Logic
    let unsubFollow = () => {};
    if (authUser && targetId && !isOwnProfile) {
      const followId = `${authUser.uid}_${targetId}`;
      unsubFollow = onSnapshot(doc(db, COLLECTIONS.FOLLOWS, followId), (snap) => {
        setIsFollowing(snap.exists());
      });
    }

    // Counts & Lists of real follows
    const unsubFollowers = onSnapshot(query(collection(db, COLLECTIONS.FOLLOWS), where('followingId', '==', targetId)), (s) => {
      setFollowerCount(s.size);
      setRealFollowersList(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as Follow)));
    });
    const unsubFollowing = onSnapshot(query(collection(db, COLLECTIONS.FOLLOWS), where('followerId', '==', targetId)), (s) => {
      setFollowingCount(s.size);
      setRealFollowingList(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as Follow)));
    });

    // Fetch user collections
    const isAdmin = authUser?.isAdmin || ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com', 'aethersanctuaryofficial@gmail.com'].includes(authUser?.email || '');
    
    const qColl = (isOwnProfile || isAdmin)
      ? query(collection(db, COLLECTIONS.COLLECTIONS), where('userId', '==', targetId))
      : query(collection(db, COLLECTIONS.COLLECTIONS), where('userId', '==', targetId), where('isPublic', '==', true));

    const unsubColl = onSnapshot(qColl, (s) => {
      const docs = s.docs.map(d => ({ ...d.data(), id: d.id } as Collection));
      const seen = new Set();
      const unique = docs.filter(c => {
        if (!c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      setCollections(unique);
    }, (error) => {
      handleFirestoreError(error, 'list', COLLECTIONS.COLLECTIONS);
    });

    // Fetch only user's uploaded images (real-time snapshot)
    const qImg = query(collection(db, COLLECTIONS.IMAGES), where('userId', '==', targetId));
    const unsubImg = onSnapshot(qImg, (s) => {
      const imgs = s.docs.map(d => ({ ...d.data(), id: d.id } as Image));
      setUserUploads(imgs);
      setLoadedImagesMap(prev => {
        const next = { ...prev };
        // Remove old uploads of this user from general map to avoid memory/data drift
        Object.keys(next).forEach(key => {
          if (next[key]?.userId === targetId) {
            delete next[key];
          }
        });
        // Add new uploads:
        imgs.forEach(i => {
          if (i.id) next[i.id] = i;
        });
        return next;
      });
    }, (error) => {
      handleFirestoreError(error, 'list', COLLECTIONS.IMAGES);
    });

    return () => { 
      unsubUser();
      unsubColl(); 
      unsubImg(); 
      unsubFollow();
      unsubFollowers();
      unsubFollowing();
    };
  }, [targetId, authUser?.uid]);

  // Dynamic user profiles parallel query loader (fetches precise user nodes with zero global snapshot leakage)
  useEffect(() => {
    if (!targetId) return;

    const idsToFetch = new Set<string>();
    realFollowersList.forEach(f => {
      if (f.followerId && !loadedUsers[f.followerId]) {
        idsToFetch.add(f.followerId);
      }
    });
    realFollowingList.forEach(f => {
      if (f.followingId && !loadedUsers[f.followingId]) {
        idsToFetch.add(f.followingId);
      }
    });

    if (idsToFetch.size === 0) return;

    const idsArray = Array.from(idsToFetch);
    const fetchUsers = async () => {
      try {
        const promises = idsArray.map(async (id) => {
          const snap = await getDoc(doc(db, COLLECTIONS.USERS, id));
          if (snap.exists()) {
            return { id, data: snap.data() };
          }
          return null;
        });
        const results = await Promise.all(promises);
        const newUsers: Record<string, User> = {};
        results.forEach(res => {
          if (res) {
            newUsers[res.id] = { ...res.data, uid: res.id } as User;
          }
        });
        if (Object.keys(newUsers).length > 0) {
          setLoadedUsers(prev => ({ ...prev, ...newUsers }));
        }
      } catch (e) {
        console.error("Error fetching user registries parallel:", e);
      }
    };

    fetchUsers();
  }, [realFollowersList, realFollowingList, targetId]);

  // Dynamic likes and collection images loader (fetches precise document nodes dynamically)
  useEffect(() => {
    if (!targetId) return;

    const neededIds = new Set<string>();
    
    // Liked image docs
    const currentLikes = isOwnProfile ? Array.from(likedImageIds) : targetLikedIds;
    currentLikes.forEach(id => neededIds.add(id));

    // Collection image docs
    collections.forEach(coll => {
      if (coll.imageIds) {
        coll.imageIds.forEach(id => neededIds.add(id));
      }
    });

    const missingIds = Array.from(neededIds).filter(id => !loadedImagesMap[id]);
    if (missingIds.length === 0) return;

    const fetchMissingImages = async () => {
      try {
        const promises = missingIds.map(async (id) => {
          const snap = await getDoc(doc(db, COLLECTIONS.IMAGES, id));
          if (snap.exists()) {
            return { id, data: snap.data() };
          }
          return null;
        });
        const results = await Promise.all(promises);
        const newImgs: Record<string, Image> = {};
        results.forEach(res => {
          if (res) {
            newImgs[res.id] = { ...res.data, id: res.id } as Image;
          }
        });
        if (Object.keys(newImgs).length > 0) {
          setLoadedImagesMap(prev => ({ ...prev, ...newImgs }));
        }
      } catch (e) {
        console.error("Error loading missing profile images:", e);
      }
    };

    fetchMissingImages();
  }, [targetId, likedImageIds, targetLikedIds, collections, isOwnProfile, loadedImagesMap]);

  const handleRemoveFollower = async (follower: any) => {
    if (!isProfileOwnerOrAdmin || !authUser || !targetId) return;
    try {
      if (follower.isFake) {
        const newFake = (profileData?.fakeFollowers || []).filter((f: any) => f.uid !== follower.uid);
        const newCount = Math.max(0, (profileData?.followerCountOverride ?? followerCount) - 1);
        await updateDoc(doc(db, COLLECTIONS.USERS, targetId), {
          fakeFollowers: newFake,
          followerCountOverride: newCount
        });
      } else {
        const followId = `${follower.uid}_${targetId}`;
        await deleteDoc(doc(db, COLLECTIONS.FOLLOWS, followId));
        if (profileData?.followerCountOverride !== undefined) {
          const newCount = Math.max(0, profileData.followerCountOverride - 1);
          await updateDoc(doc(db, COLLECTIONS.USERS, targetId), {
            followerCountOverride: newCount
          });
        }
      }
    } catch (e) {
      console.error("Failed to remove follower", e);
    }
  };

  const handleRemoveFollowing = async (following: any) => {
    if (!isProfileOwnerOrAdmin || !authUser || !targetId) return;
    try {
      if (following.isFake) {
        const newFake = (profileData?.fakeFollowing || []).filter((f: any) => f.uid !== following.uid);
        const newCount = Math.max(0, (profileData?.followingCountOverride ?? followingCount) - 1);
        await updateDoc(doc(db, COLLECTIONS.USERS, targetId), {
          fakeFollowing: newFake,
          followingCountOverride: newCount
        });
      } else {
        const followId = `${targetId}_${following.uid}`;
        await deleteDoc(doc(db, COLLECTIONS.FOLLOWS, followId));
        if (profileData?.followingCountOverride !== undefined) {
          const newCount = Math.max(0, profileData.followingCountOverride - 1);
          await updateDoc(doc(db, COLLECTIONS.USERS, targetId), {
            followingCountOverride: newCount
          });
        }
      }
    } catch (e) {
      console.error("Failed to remove following", e);
    }
  };

  const imagePool = useMemo(() => {
    return allImages
      .filter(img => img.type === 'image' && img.url)
      .map(img => img.url);
  }, [allImages]);

  const followersList = useMemo(() => {
    const realF = realFollowersList.map(item => {
      const u = loadedUsers[item.followerId];
      return u ? {
        uid: u.uid,
        displayName: u.displayName || 'Aether Resident',
        photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
        email: u.email || '',
        bio: u.bio || 'Wandering the aether...',
        location: u.location || '',
        isFake: false
      } : {
        uid: item.followerId,
        displayName: 'Aether Resident',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.followerId}`,
        email: '',
        bio: 'Wandering the aether...',
        location: '',
        isFake: false
      };
    });

    const seen = new Set();
    const uniqueRealF = realF.filter(u => {
      if (seen.has(u.uid)) return false;
      seen.add(u.uid);
      return true;
    });

    const rawStoredFake = profileData?.fakeFollowers || [];
    const seenStoredFake = new Set();
    const storedFakeF = rawStoredFake.filter((f: any) => {
      if (!f || !f.uid || seenStoredFake.has(f.uid)) return false;
      seenStoredFake.add(f.uid);
      return true;
    });
    const targetFakeCount = Math.max(0, (profileData?.followerCountOverride ?? followerCount) - uniqueRealF.length);

    // CRITICAL PERFORMANCE: Only run deep heavy generation logic when the modal is actually open and followers tab is active.
    // Also caps maximum generation size to visibleLimit directly.
    const limitNeeded = (isContactsModalOpen && contactsModalTab === 'followers') ? visibleLimit : 0;
    const fakeToGenerate = Math.min(targetFakeCount, limitNeeded);

    let allFakeF = [...storedFakeF];
    if (allFakeF.length < fakeToGenerate) {
      const difference = fakeToGenerate - allFakeF.length;
      const extraGenerated = generateFakeUsers(difference, allFakeF.length, imagePool, targetId);
      allFakeF = [...allFakeF, ...extraGenerated];
    } else if (allFakeF.length > targetFakeCount) {
      allFakeF = allFakeF.slice(0, targetFakeCount);
    }

    const combined = [...uniqueRealF, ...allFakeF].slice(0, visibleLimit);
    const finalSeen = new Set();
    return combined.filter(u => {
      if (!u.uid || finalSeen.has(u.uid)) return false;
      finalSeen.add(u.uid);
      return true;
    });
  }, [realFollowersList, loadedUsers, profileData?.fakeFollowers, profileData?.followerCountOverride, followerCount, imagePool, targetId, isContactsModalOpen, contactsModalTab, visibleLimit]);

  const followingList = useMemo(() => {
    const realF = realFollowingList.map(item => {
      const u = loadedUsers[item.followingId];
      return u ? {
        uid: u.uid,
        displayName: u.displayName || 'Aether Resident',
        photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
        email: u.email || '',
        bio: u.bio || 'Wandering the aether...',
        location: u.location || '',
        isFake: false
      } : {
        uid: item.followingId,
        displayName: 'Aether Resident',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.followingId}`,
        email: '',
        bio: 'Wandering the aether...',
        location: '',
        isFake: false
      };
    });

    const seen = new Set();
    const uniqueRealF = realF.filter(u => {
      if (seen.has(u.uid)) return false;
      seen.add(u.uid);
      return true;
    });

    const rawStoredFake = profileData?.fakeFollowing || [];
    const seenStoredFake = new Set();
    const storedFakeF = rawStoredFake.filter((f: any) => {
      if (!f || !f.uid || seenStoredFake.has(f.uid)) return false;
      seenStoredFake.add(f.uid);
      return true;
    });
    const targetFakeCount = Math.max(0, (profileData?.followingCountOverride ?? followingCount) - uniqueRealF.length);

    // CRITICAL PERFORMANCE: Only run deep heavy generation logic when the modal is actually open and following tab is active.
    // Also caps maximum generation size to visibleLimit directly.
    const limitNeeded = (isContactsModalOpen && contactsModalTab === 'following') ? visibleLimit : 0;
    const fakeToGenerate = Math.min(targetFakeCount, limitNeeded);

    let allFakeF = [...storedFakeF];
    if (allFakeF.length < fakeToGenerate) {
      const difference = fakeToGenerate - allFakeF.length;
      const extraGenerated = generateFakeUsers(difference, allFakeF.length, imagePool, targetId);
      allFakeF = [...allFakeF, ...extraGenerated];
    } else if (allFakeF.length > targetFakeCount) {
      allFakeF = allFakeF.slice(0, targetFakeCount);
    }

    const combined = [...uniqueRealF, ...allFakeF].slice(0, visibleLimit);
    const finalSeen = new Set();
    return combined.filter(u => {
      if (!u.uid || finalSeen.has(u.uid)) return false;
      finalSeen.add(u.uid);
      return true;
    });
  }, [realFollowingList, loadedUsers, profileData?.fakeFollowing, profileData?.followingCountOverride, followingCount, imagePool, targetId, isContactsModalOpen, contactsModalTab, visibleLimit]);

  const handleFollow = async () => {
    if (!authUser || !targetId || isOwnProfile) return;
    const followId = `${authUser.uid}_${targetId}`;
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, COLLECTIONS.FOLLOWS, followId));
      } else {
        await setDoc(doc(db, COLLECTIONS.FOLLOWS, followId), {
          followerId: authUser.uid,
          followingId: targetId,
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Follow action failed", e);
    }
  };

  const handleImageClick = (image: Image) => {
    setSearchParams({ id: image.id });
  };

  const handleDeleteCollection = async (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this collection permanently?")) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.COLLECTIONS, collectionId));
      if (expandedCollection?.id === collectionId) {
        setExpandedCollection(null);
      }
    } catch (e) {
      console.error("Failed to delete collection:", e);
    }
  };

  const userUploadsMemo = useMemo(() => {
    return userUploads;
  }, [userUploads]);

  const likedImagesMemo = useMemo(() => {
    // If it's own profile, use local likedImageIds set for reactivity
    if (isOwnProfile) {
      return allImages.filter(i => likedImageIds.has(i.id));
    }
    return allImages.filter(i => targetLikedIds.includes(i.id));
  }, [allImages, isOwnProfile, likedImageIds, targetLikedIds]);

  const currentNavList = useMemo(() => {
    if (expandedCollection) {
      return allImages.filter(i => expandedCollection.imageIds.includes(i.id));
    }
    if (activeTab === 'likes') return likedImagesMemo;
    if (activeTab === 'uploads') return userUploadsMemo;
    return [];
  }, [expandedCollection, activeTab, likedImagesMemo, userUploadsMemo, allImages]);

  const selectedImageId = searchParams.get('post') || searchParams.get('id');
  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null;
    return allImages.find(i => i.id === selectedImageId);
  }, [allImages, selectedImageId]);

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (currentNavList.length === 0) return;
    
    let currentIndex = -1;
    if (selectedImageId) {
      currentIndex = currentNavList.findIndex(i => i.id === selectedImageId);
    }
    
    if (currentIndex === -1) {
      if (direction === 'next') setSearchParams({ id: currentNavList[0].id });
      else setSearchParams({ id: currentNavList[currentNavList.length - 1].id });
      return;
    }
    
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = currentNavList.length - 1;
    if (nextIndex >= currentNavList.length) nextIndex = 0;
    
    setSearchParams({ id: currentNavList[nextIndex].id });
  };

  const handleDeleteProfile = async () => {
    if (!profileData || !targetId) return;
    setIsDeletingProfileState(true);
    setDeleteStep(3);
    try {
      // Delete user profile document from Firestore
      await deleteDoc(doc(db, COLLECTIONS.USERS, targetId));
      
      if (isOwnProfile) {
        if (clerkSignOut) {
          await clerkSignOut();
        }
        window.location.href = '/';
      } else {
        setShowDeleteConfirm(false);
        alert("This resident profile has been permanently dissolved from the sanctuary archives.");
        window.location.href = '/';
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to dissolve identity: " + e.message);
      setDeleteStep(2);
      setIsDeletingProfileState(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !profileData || !targetId) return;
    setIsSaving(true);
    try {
      const targetFollowers = profileData.followerCountOverride !== undefined ? profileData.followerCountOverride : followerCount;
      const targetFollowing = profileData.followingCountOverride !== undefined ? profileData.followingCountOverride : followingCount;
      
      const realFollSize = realFollowersList.length;
      const realFollngSize = realFollowingList.length;
      
      const fakeFollowersNeeded = Math.max(0, targetFollowers - realFollSize);
      const fakeFollowingNeeded = Math.max(0, targetFollowing - realFollngSize);
      
      // Store a lightweight direct cache of up to 100 fake profiles in Firestore
      // This maintains standard db hygiene and is infinitely faster to load
      const initialFakeFollowers = generateFakeUsers(Math.min(100, fakeFollowersNeeded), 0, imagePool, targetId);
      const initialFakeFollowing = generateFakeUsers(Math.min(100, fakeFollowingNeeded), 0, imagePool, targetId);

      // Trigger the spectacular background compilation tracking progress animation
      if (fakeFollowersNeeded > 0 || fakeFollowingNeeded > 0) {
        setBackgroundProgress({
          running: true,
          current: Math.min(100, fakeFollowersNeeded + fakeFollowingNeeded),
          total: fakeFollowersNeeded + fakeFollowingNeeded
        });
      }

      const cleanData: any = {
        displayName: profileData.displayName || null,
        photoURL: profileData.photoURL || null,
        bio: profileData.bio || null,
        location: profileData.location || null,
        website: profileData.website || null,
        gender: profileData.gender || null,
        dob: profileData.dob || null,
        occupation: profileData.occupation || null
      };

      if (isAppOwner) {
        cleanData.followerCountOverride = targetFollowers;
        cleanData.followingCountOverride = targetFollowing;
        cleanData.fakeFollowers = initialFakeFollowers;
        cleanData.fakeFollowing = initialFakeFollowing;
      }

      await updateDoc(doc(db, COLLECTIONS.USERS, targetId), cleanData);

      // Sync with Clerk user profile if current logged-in user
      if (clerkUser && clerkUser.id === targetId && cleanData.displayName) {
        try {
          await clerkUser.update({
            firstName: cleanData.displayName
          });
        } catch (authErr) {
          console.warn("Clerk user profile sync note:", authErr);
        }
      }

      // Record updated session in profile switcher registry
      if (authUser && authUser.uid === targetId) {
        recordProfileSession({
          ...authUser,
          displayName: cleanData.displayName || authUser.displayName,
          photoURL: cleanData.photoURL || authUser.photoURL,
        });
      }

      setIsEditingProfile(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setSearchParams({});
  };

  const isAdminProfile = profileData?.isAdmin || ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com'].includes(profileData?.email || '');

  if (isLoadingProfile) {
    return (
      <div className="pt-40 flex flex-col items-center justify-center space-y-6">
        <div className="w-12 h-12 border-2 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/40 animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  if (!profileData) {
    if (!targetId && !authUser) {
      return (
        <div className="pt-36 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <UserCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black tracking-tight text-text-main">Access Your Registry</h2>
            <p className="text-xs text-text-dim leading-relaxed font-medium">
              Sign in or create an account to view your saved collections, liked vision assets, and uploaded creations.
            </p>
          </div>
          {onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="px-8 py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20"
            >
              Sign In / Create Account
            </button>
          )}
          <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-text-main">
            ← Explore Sanctuary Gallery
          </Link>
        </div>
      );
    }

    return (
      <div className="pt-40 flex flex-col items-center justify-center space-y-6">
         <X className="w-12 h-12 text-red-500/40" />
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/40">Resident Not Found in Aether</p>
         <Link to="/" className="text-brand-primary text-xs font-bold uppercase tracking-widest hover:underline transition-all">Return to Sanctuary</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main pt-24 md:pt-32 px-0 sm:px-4 md:px-10 pb-20 space-y-4 max-w-7xl mx-auto">
      {/* Back Button */}
      <div className="flex justify-start px-4 md:px-0 mb-2">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-text-dim hover:text-text-main transition-all group"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Sanctuary</span>
        </Link>
      </div>

      {/* Header - Minimalist & Refined */}
      <div className={cn(
        "relative mb-4 px-4 sm:px-6 py-5 sm:py-6 transition-all overflow-hidden sm:rounded-3xl border-y sm:border border-white/5 bg-white/[0.015] backdrop-blur-2xl shadow-lg group",
        isAdminProfile ? "border-brand-primary/20 ring-1 ring-brand-primary/10" : ""
      )}>
        {backgroundProgress.running && (
          <div className="absolute top-0 inset-x-0 bg-brand-primary/10 border-b border-brand-primary/20 px-4 py-1.5 flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-brand-primary z-50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>Aether Grid Compilation: {formatCount(backgroundProgress.total)} soul registers...</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all duration-300"
                  style={{ width: `${(backgroundProgress.current / backgroundProgress.total) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[8px]">{Math.round((backgroundProgress.current / backgroundProgress.total) * 100)}%</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 relative z-10 max-w-4xl text-left">
          {/* Top Section: Avatar, Identity & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Avatar & Identity info */}
            <div className="flex items-center gap-3.5 sm:gap-4.5">
              {/* Profile Avatar */}
              <div className="relative group shrink-0">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    if (isProfileOwnerOrAdmin) {
                      setIsEditingProfile(true);
                    }
                  }}
                  className={cn(
                    "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white/[0.02] border p-0.5 shrink-0 transition-all shadow-md relative z-10",
                    isAdminProfile ? "border-brand-primary/40 ring-1 ring-brand-primary/20" : "border-white/10",
                    isProfileOwnerOrAdmin ? "cursor-pointer hover:border-brand-primary/60 hover:ring-2 hover:ring-brand-primary/20 group/avatar" : ""
                  )}
                  title={isProfileOwnerOrAdmin ? "Click to customize & crop avatar" : undefined}
                >
                  <div className="w-full h-full rounded-[14px] overflow-hidden relative">
                    {profileData.photoURL ? (
                      <img src={profileData.photoURL} alt={profileData.displayName || ''} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <UserCircle className="w-6 h-6 text-text-dim/30" />
                      </div>
                    )}
                    {isProfileOwnerOrAdmin && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white backdrop-blur-[2px]">
                        <Camera className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="text-[6.5px] font-black uppercase tracking-wider text-brand-primary">Edit</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Identity text: Name & Email with Minimized Verification Tick right after email */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-xl font-display font-black tracking-tight text-text-main uppercase leading-tight truncate">
                    {profileData.displayName || 'Resident'}
                  </h1>
                  {isAdminProfile && (
                    <div className="bg-brand-primary/10 border border-brand-primary/30 text-brand-primary rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
                      <ShieldCheck className="w-2.5 h-2.5 text-brand-primary" />
                      <span className="text-[7px] font-black uppercase tracking-wider">Architect</span>
                    </div>
                  )}
                </div>

                {/* Email with Minimized Tick directly after */}
                {profileData.email && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-[11px] text-text-dim/60 font-mono select-all">
                      {profileData.email}
                    </span>
                    {Boolean(profileData.emailVerified || (isOwnProfile && authUser?.emailVerified)) ? (
                      <span title="Verified email" className="inline-flex items-center text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-400/20 stroke-[2.5]" />
                      </span>
                    ) : isOwnProfile ? (
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setIsVerifyModalOpen(true);
                        }}
                        className="inline-flex items-center text-brand-primary hover:text-white text-[8px] font-black uppercase tracking-wider transition-colors ml-0.5 cursor-pointer"
                        title="Verify this email"
                      >
                        (Verify)
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Clean Stats Layout */}
            <div className="flex items-center gap-6 sm:gap-7 select-none pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              <div className="flex flex-col items-start">
                <span className="text-sm sm:text-base font-black text-text-main leading-none">
                  {formatCount(userUploadsMemo.length)}
                </span>
                <span className="text-[7.5px] font-medium uppercase tracking-wider text-text-dim/50 mt-1">Uploads</span>
              </div>
              
              <button 
                onClick={() => {
                  setContactsModalTab('followers');
                  setIsContactsModalOpen(true);
                }}
                className="flex flex-col items-start group/stat shrink-0 hover:opacity-80 transition-opacity text-left cursor-pointer"
              >
                <span className="text-sm sm:text-base font-black text-text-main group-hover/stat:text-brand-primary transition-colors leading-none">
                  {formatCount(profileData?.followerCountOverride !== undefined ? profileData.followerCountOverride : followersList.length)}
                </span>
                <span className="text-[7.5px] font-medium uppercase tracking-wider text-text-dim/50 mt-1">{t('profile.followers')}</span>
              </button>

              <button 
                onClick={() => {
                  setContactsModalTab('following');
                  setIsContactsModalOpen(true);
                }}
                className="flex flex-col items-start group/stat shrink-0 hover:opacity-80 transition-opacity text-left cursor-pointer"
              >
                <span className="text-sm sm:text-base font-black text-text-main group-hover/stat:text-brand-primary transition-colors leading-none">
                  {formatCount(profileData?.followingCountOverride !== undefined ? profileData.followingCountOverride : followingList.length)}
                </span>
                <span className="text-[7.5px] font-medium uppercase tracking-wider text-text-dim/50 mt-1">{t('profile.following')}</span>
              </button>
            </div>
          </div>

          {/* Bio & Meta tags & Action Buttons */}
          <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
            {profileData.bio && (
              <p className="text-xs text-text-dim/80 leading-relaxed font-light max-w-2xl">
                {profileData.bio}
              </p>
            )}

            {/* Minimalist Metadata tags */}
            {(profileData.dob || profileData.location || profileData.occupation || profileData.website) && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[8.5px] text-text-dim/60 font-mono">
                {profileData.dob && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-brand-primary/70 shrink-0" />
                    <span>{profileData.dob}</span>
                  </div>
                )}
                {profileData.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-text-dim/50 shrink-0" />
                    <span>{profileData.location}</span>
                  </div>
                )}
                {profileData.occupation && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-2.5 h-2.5 text-text-dim/50 shrink-0" />
                    <span>{profileData.occupation}</span>
                  </div>
                )}
                {profileData.website && (
                  <a 
                    href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-primary hover:underline transition-colors"
                  >
                    <LinkIcon className="w-2.5 h-2.5 shrink-0" />
                    <span>{profileData.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex pt-1">
              {isProfileOwnerOrAdmin ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand-primary/40 text-text-main rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    {t('profile.sync_identity') || 'Edit Profile'}
                  </button>
                  {onOpenProfileSwitcher && (
                    <button 
                      onClick={onOpenProfileSwitcher}
                      className="px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/30 hover:bg-brand-primary/20 text-brand-primary rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                    >
                      <Users className="w-3 h-3" />
                      <span>Switch Profile</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setDeleteStep(1);
                      setConfirmInput('');
                      setShowDeleteConfirm(true);
                    }}
                    title="Dissolve Identity Permanently"
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 hover:border-red-500/30 text-red-500 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleFollow}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer",
                    isFollowing 
                      ? "bg-white/5 text-text-dim border border-white/10" 
                      : "bg-brand-primary text-bg-dark border border-brand-primary hover:scale-105"
                  )}
                >
                  {isFollowing ? (t('profile.following_btn') || 'Following') : (t('profile.follow') || 'Follow')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {!expandedCollection && (
        <div className="flex justify-center md:justify-start pt-4 px-4 sm:px-0 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex flex-nowrap gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl shadow-2xl backdrop-blur-3xl min-w-max">
            {(['collections', 'likes', 'uploads'] as TabType[]).map((tab) => {
              const getTabDetails = () => {
                switch (tab) {
                  case 'collections':
                    return {
                      icon: <Folder className="w-3.5 h-3.5" />,
                      label: t('profile.sanctuaries') || 'Sanctuaries'
                    };
                  case 'likes':
                    return {
                      icon: <Heart className="w-3.5 h-3.5" />,
                      label: t('profile.appreciations') || 'Appreciations'
                    };
                  case 'uploads':
                  default:
                    return {
                      icon: <Upload className="w-3.5 h-3.5" />,
                      label: t('profile.contributions') || 'Contributions'
                    };
                }
              };

              const details = getTabDetails();

              return (
                <button
                  key={`profile-tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  title={details.label}
                  className={cn(
                    "px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2",
                    activeTab === tab 
                      ? "bg-text-main text-bg-dark" 
                      : "text-text-dim/40 hover:text-text-main hover:bg-white/5"
                  )}
                >
                  {details.icon}
                  <span className="hidden sm:inline">{details.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px] px-4 sm:px-0">
        {expandedCollection ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setExpandedCollection(null)}
                className="flex items-center gap-2 text-text-dim hover:text-text-main transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('common.back')}</span>
              </button>
              <h3 className="text-xl font-display font-black text-text-main uppercase tracking-tight">{expandedCollection.title || expandedCollection.name}</h3>
              {isOwnProfile && (
                <button onClick={(e) => handleDeleteCollection(e, expandedCollection.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl">
                   <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <MasonryGrid 
              key={`profile-coll-grid-${expandedCollection.id}`}
              images={allImages.filter(img => expandedCollection.imageIds.includes(img.id))}
              user={authUser}
              onImageClick={handleImageClick}
              onLike={onLike}
              onSave={onSave}
              likedImageIds={likedImageIds}
              savedImageIds={savedImageIds}
            />
          </div>
        ) : (
          <>
            {activeTab === 'collections' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {collections.map((coll, idx) => {
                  const cover = allImages.find(i => i.id === coll.imageIds[0]);
                  return (
                    <motion.div
                      key={`profile-coll-${coll.id || idx}-${idx}`}
                      layout
                      onClick={() => setExpandedCollection(coll)}
                      className="group cursor-pointer aspect-[4/5] bg-card-dark border border-white/5 rounded-3xl overflow-hidden hover:border-brand-primary/40 transition-all flex flex-col relative"
                    >
                      {cover ? (
                        <img src={cover.url} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Folder className="w-8 h-8 text-white/5" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white truncate">{coll.title || coll.name}</h4>
                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">{coll.imageIds.length} Assets</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {activeTab === 'likes' && (
              <MasonryGrid 
                key="profile-likes-grid"
                images={likedImagesMemo} 
                user={authUser}
                onImageClick={handleImageClick}
                onLike={onLike}
                onSave={onSave}
                likedImageIds={likedImageIds}
                savedImageIds={savedImageIds}
              />
            )}

            {activeTab === 'uploads' && (
              <MasonryGrid 
                key="profile-uploads-grid"
                images={userUploadsMemo} 
                user={authUser}
                onImageClick={handleImageClick}
                onLike={onLike}
                onSave={onSave}
                likedImageIds={likedImageIds}
                savedImageIds={savedImageIds}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingProfile(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xl bg-card-dark border border-white/10 rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
               {/* Modal Header */}
               <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/[0.01]">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                   <h2 className="text-sm font-black uppercase tracking-widest text-text-main">
                     {t('profile.sync_identity') || 'Sync Identity & Avatar'}
                   </h2>
                 </div>
                 <button 
                   type="button" 
                   onClick={() => setIsEditingProfile(false)}
                   className="p-1.5 text-text-dim hover:text-text-main rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>

               <form onSubmit={handleUpdateProfile} className="p-5 sm:p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
                  {/* Dynamic Avatar Editor with Direct Upload, Host by Link & Interactive Cropper */}
                  <ProfileAvatarEditor 
                    currentPhotoURL={profileData?.photoURL}
                    displayName={profileData?.displayName}
                    onAvatarChange={(newPhotoURL) => {
                      setProfileData(p => p ? { ...p, photoURL: newPhotoURL } : null);
                    }}
                  />

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Display Name</label>
                      <input 
                        type="text" 
                        value={profileData?.displayName || ''} 
                        onChange={e => setProfileData(p => p ? {...p, displayName: e.target.value} : null)} 
                        placeholder="Display Name" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary text-text-main" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Bio & Manifesto</label>
                      <textarea 
                        value={profileData?.bio || ''} 
                        onChange={e => setProfileData(p => p ? {...p, bio: e.target.value} : null)} 
                        placeholder="Write a brief resonance bio..." 
                        rows={3} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary resize-none text-text-main" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Date of Birth</label>
                        <input 
                          type="date" 
                          value={profileData?.dob || ''} 
                          onChange={e => setProfileData(p => p ? {...p, dob: e.target.value} : null)} 
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary text-text-main" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Occupation</label>
                        <input 
                          type="text" 
                          value={profileData?.occupation || ''} 
                          onChange={e => setProfileData(p => p ? {...p, occupation: e.target.value} : null)} 
                          placeholder="Occupation / Craft" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary text-text-main" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Location</label>
                        <input 
                          type="text" 
                          value={profileData?.location || ''} 
                          onChange={e => setProfileData(p => p ? {...p, location: e.target.value} : null)} 
                          placeholder="Location / Timezone" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary text-text-main" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">Website</label>
                        <input 
                          type="text" 
                          value={profileData?.website || ''} 
                          onChange={e => setProfileData(p => p ? {...p, website: e.target.value} : null)} 
                          placeholder="https://..." 
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary text-text-main" 
                        />
                      </div>
                    </div>
                    
                    {isAppOwner && (
                      <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-brand-primary/80">Followers Count (Owner Override)</label>
                          <input 
                            type="number" 
                            min="0"
                            value={profileData?.followerCountOverride !== undefined ? profileData.followerCountOverride : followerCount} 
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              setProfileData(p => p ? {...p, followerCountOverride: isNaN(val) ? 0 : val} : null);
                            }} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary text-text-main" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-brand-primary/80">Following Count (Owner Override)</label>
                          <input 
                            type="number" 
                            min="0"
                            value={profileData?.followingCountOverride !== undefined ? profileData.followingCountOverride : followingCount} 
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              setProfileData(p => p ? {...p, followingCountOverride: isNaN(val) ? 0 : val} : null);
                            }} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-primary text-text-main" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                 <div className="pt-2">
                   <button 
                     type="submit" 
                     disabled={isSaving} 
                     className="w-full bg-brand-primary text-bg-dark font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                   >
                     {isSaving ? (
                       <>
                         <div className="w-3.5 h-3.5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                         <span>Syncing to Sanctuary...</span>
                       </>
                     ) : (
                       <span>Commit & Synchronize Identity</span>
                     )}
                   </button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Followers & Following Detail Modal */}
      <AnimatePresence>
        {isContactsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsContactsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-card-dark border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">
              {/* Header with tabs */}
              <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-primary">Resident Connections</h2>
                  <button type="button" onClick={() => setIsContactsModalOpen(false)} className="text-text-dim hover:text-text-main transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setContactsModalTab('followers')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                      contactsModalTab === 'followers' ? "bg-text-main text-bg-dark" : "text-text-dim/60 hover:text-text-main"
                    )}
                  >
                    Followers ({formatCount(followersList.length)})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setContactsModalTab('following')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                      contactsModalTab === 'following' ? "bg-text-main text-bg-dark" : "text-text-dim/60 hover:text-text-main"
                    )}
                  >
                    Following ({formatCount(followingList.length)})
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {contactsModalTab === 'followers' ? (
                  followersList.length === 0 ? (
                    <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-text-dim/30">No Followers Registry Found</div>
                  ) : (
                    <div className="space-y-2">
                      {followersList.slice(0, visibleLimit).map((follower, idx) => (
                        <div key={`follower-${follower.uid || 'f'}-${idx}`} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={follower.photoURL} alt="" className="w-9 h-9 rounded-xl border border-white/10 shrink-0 object-cover" />
                            <div className="min-w-0">
                              {follower.isFake ? (
                                <button 
                                  type="button"
                                  onClick={() => setSelectedFakeUser(follower)}
                                  className="text-xs font-black text-text-main hover:text-brand-primary text-left uppercase tracking-tight block max-w-full truncate"
                                >
                                  {follower.displayName}
                                </button>
                              ) : (
                                <Link 
                                  to={`/profile/${follower.uid}`} 
                                  onClick={() => setIsContactsModalOpen(false)} 
                                  className="text-xs font-black text-text-main hover:text-brand-primary uppercase tracking-tight block max-w-full truncate"
                                >
                                  {follower.displayName}
                                </Link>
                              )}
                              <p className="text-[8px] font-bold text-text-dim/30 uppercase tracking-widest truncate">{follower.isFake ? 'Simulated Resident' : 'Sanctuary Voyager'}</p>
                            </div>
                          </div>
                          {isProfileOwnerOrAdmin && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveFollower(follower)}
                              title="Remove Follower"
                              className="p-2 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {followersList.length > visibleLimit && (
                        <button 
                          type="button" 
                          onClick={() => setVisibleLimit(prev => prev + 100)}
                          className="w-full py-3 bg-white/[0.02] border border-white/5 hover:border-brand-primary/20 text-brand-primary rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/[0.04] text-center mt-2 cursor-pointer"
                        >
                          Synthesize {formatCount(followersList.length - visibleLimit)} more registry files
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  followingList.length === 0 ? (
                    <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-text-dim/30">No Following Registry Found</div>
                  ) : (
                    <div className="space-y-2">
                      {followingList.slice(0, visibleLimit).map((following, idx) => (
                        <div key={`following-${following.uid || 'fg'}-${idx}`} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={following.photoURL} alt="" className="w-9 h-9 rounded-xl border border-white/10 shrink-0 object-cover" />
                            <div className="min-w-0">
                              {following.isFake ? (
                                <button 
                                  type="button"
                                  onClick={() => setSelectedFakeUser(following)}
                                  className="text-xs font-black text-text-main hover:text-brand-primary text-left uppercase tracking-tight block max-w-full truncate"
                                >
                                  {following.displayName}
                                </button>
                              ) : (
                                <Link 
                                  to={`/profile/${following.uid}`} 
                                  onClick={() => setIsContactsModalOpen(false)} 
                                  className="text-xs font-black text-text-main hover:text-brand-primary uppercase tracking-tight block max-w-full truncate"
                                >
                                  {following.displayName}
                                </Link>
                              )}
                              <p className="text-[8px] font-bold text-text-dim/30 uppercase tracking-widest truncate">{following.isFake ? 'Simulated Resident' : 'Sanctuary Voyager'}</p>
                            </div>
                          </div>
                          {isProfileOwnerOrAdmin && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveFollowing(following)}
                              title="Unfollow"
                              className="p-2 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      {followingList.length > visibleLimit && (
                        <button 
                          type="button" 
                          onClick={() => setVisibleLimit(prev => prev + 100)}
                          className="w-full py-3 bg-white/[0.02] border border-white/5 hover:border-brand-primary/20 text-brand-primary rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/[0.04] text-center mt-2 cursor-pointer"
                        >
                          Synthesize {formatCount(followingList.length - visibleLimit)} more registry files
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fake User Spotlight Details Modal */}
      <AnimatePresence>
        {selectedFakeUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedFakeUser(null)} className="absolute inset-0 bg-black/60 shadow-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xs bg-card-dark border border-white/10 rounded-[28px] p-6 shadow-2xl space-y-4 text-center">
              <button type="button" onClick={() => setSelectedFakeUser(null)} className="absolute top-4 right-4 text-text-dim hover:text-text-main"><X className="w-4 h-4" /></button>
              <div className="flex flex-col items-center space-y-2">
                <img src={selectedFakeUser.photoURL} alt="" className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5" />
                <div>
                  <h3 className="text-sm font-black text-text-main uppercase tracking-tight">{selectedFakeUser.displayName}</h3>
                  <p className="text-[8px] font-black text-brand-primary uppercase tracking-[0.15em] mt-0.5">VIRTUAL RESIDENT</p>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-left space-y-2.5">
                {selectedFakeUser.location && (
                  <div className="flex items-center gap-2 text-[9px] font-bold text-text-dim/60">
                    <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                    <span>{selectedFakeUser.location}</span>
                  </div>
                )}
                {selectedFakeUser.email && (
                  <div className="flex items-center gap-2 text-[9px] font-bold text-text-dim/60">
                    <Mail className="w-3.5 h-3.5 text-brand-primary" />
                    <span className="truncate">{selectedFakeUser.email}</span>
                  </div>
                )}
                <p className="text-[10px] text-text-dim font-light leading-relaxed italic border-t border-white/5 pt-2">"{selectedFakeUser.bio}"</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permanent Identity Dissolution Warning Screen Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isDeletingProfileState && setShowDeleteConfirm(false)} 
              className="absolute inset-0 bg-black/90 backdrop-blur-lg" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              onClick={(e) => e.stopPropagation()} 
              className="relative w-full max-w-md bg-card-dark border border-red-500/15 rounded-[36px] overflow-hidden p-6 sm:p-8 flex flex-col shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/20 via-red-500 to-red-500/20" />
              
              <button 
                type="button" 
                disabled={isDeletingProfileState}
                onClick={() => setShowDeleteConfirm(false)} 
                className="absolute top-6 right-6 text-text-dim hover:text-white disabled:opacity-30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Warning Content */}
              {deleteStep === 1 && (
                <div className="space-y-6 text-center pt-4">
                  <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 animate-pulse">
                    <Trash2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-display font-black text-red-500 uppercase tracking-tight">Identity Dissolution Protocol</h3>
                    <p className="text-[10px] font-black text-red-500/40 uppercase tracking-[0.2em]">Absolute Unrecoverable Action</p>
                  </div>

                  <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl p-5 space-y-3.5 text-left">
                    <p className="text-xs text-text-main/90 font-medium leading-relaxed">
                      You are initiating the permanent dissolution of this resident identity.
                    </p>
                    <ul className="text-[10px] text-text-dim/80 space-y-1.5 list-disc pl-4 font-semibold uppercase tracking-wider">
                      <li>Permanent erasure of profile stats & bio</li>
                      <li>Severing of followers and following registries</li>
                      <li>This process is absolute and cannot be undone</li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 h-12 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] font-black uppercase tracking-widest text-text-dim hover:bg-white/[0.05] transition-all"
                    >
                      Abort Protocol
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 h-12 rounded-2xl bg-red-500 text-bg-dark font-display font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                      Proceed to Reconfirm
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="space-y-6 text-center pt-4">
                  <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20">
                    <Trash2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">Final Reconfirmation</h3>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Verify Residential Dissolution Target</p>
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                      <p className="text-[10px] text-text-dim/60 leading-relaxed font-semibold uppercase tracking-wider">
                        To permanently dissolve this profile, please type the phrase below:
                      </p>
                      <p className="text-sm font-mono font-bold text-red-400 mt-2 tracking-wider text-center select-all">DISSOLVE IDENTITY</p>
                    </div>

                    <div className="space-y-1.5">
                      <input 
                        type="text"
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder="Type 'DISSOLVE IDENTITY' to confirm"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-text-main focus:outline-none focus:border-red-500/30 transition-all text-center uppercase tracking-wider font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 h-12 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] font-black uppercase tracking-widest text-text-dim hover:bg-white/[0.05] transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={confirmInput !== 'DISSOLVE IDENTITY'}
                      onClick={handleDeleteProfile}
                      className="flex-1 h-12 rounded-2xl bg-red-500 disabled:bg-red-500/10 text-bg-dark disabled:text-text-dim/40 border border-red-500/10 font-display font-black text-[10px] uppercase tracking-widest hover:bg-red-650 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] disabled:shadow-none"
                    >
                      Confirm Permanent Dissolution
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 3 && (
                <div className="py-12 flex flex-col items-center justify-center gap-6">
                  <div className="w-12 h-12 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 animate-pulse">Dissolving Identity...</p>
                    <p className="text-[8px] text-text-dim/40 uppercase tracking-widest font-black">Erase traces from registry datastore</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Link Verification Modal */}
      <EmailVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        email={profileData?.email || authUser?.email || ''}
        displayName={profileData?.displayName || authUser?.displayName}
        onVerified={async () => {
          const currentUid = targetId || authUser?.uid;
          if (currentUid) {
            try {
              await updateDoc(doc(db, COLLECTIONS.USERS, currentUid), {
                emailVerified: true,
                emailVerifiedAt: serverTimestamp()
              });
            } catch (err) {
              console.warn("Could not write emailVerified to Firestore user doc:", err);
            }
          }
          setProfileData(prev => prev ? ({ ...prev, emailVerified: true }) : prev);
          hapticSuccess();
        }}
      />

      <ImageModal 
        image={selectedImage} 
        onClose={handleCloseModal} 
        onLike={onLike}
        onSave={(img) => onSave(null as any, img)}
        hasLiked={selectedImage ? likedImageIds.has(selectedImage.id) : false}
        isSaved={selectedImage ? savedImageIds.has(selectedImage.id) : false}
        user={authUser}
        onNavigate={handleNavigate}
        hasNext={currentNavList.length > 1}
        hasPrev={currentNavList.length > 1}
        onSelectImage={handleImageClick}
      />
    </div>
  );
}
