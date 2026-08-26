import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn, formatDate, copyToClipboard, useBodyScrollLock } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { ZoomIn, ZoomOut, Maximize2, X, Heart, Share2, Download, Copy, ExternalLink, Calendar, Tag, Flag, BookmarkPlus, MessageSquare, Clock, Trash2, AlertCircle, Sparkles, Minimize2, ChevronLeft, ChevronRight, UserCircle, Mail, ShieldCheck, PlusCircle, MapPin, Briefcase, User as UserIcon, Code, Play, Youtube, Bell, Check, Volume2, VolumeX, Music, Headphones, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Image, User } from '../../types';
import { shareAsset, APP_LINK, getBaseAppUrl } from '../../utils/shareUtils';
import CommentSection from './CommentSection';
import CollectionModal from './CollectionModal';
import { db, COLLECTIONS } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, query, where, getDocs, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { trackActivity } from '../../lib/recommendation';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../../utils/haptics';

interface ImageModalProps {
  image: Image | null;
  onClose: () => void;
  onLike: (e: React.MouseEvent, image: Image) => void;
  onSave: (img: Image) => void;
  hasLiked: boolean;
  isSaved: boolean;
  user: User | null;
  onNavigate?: (direction: 'next' | 'prev', mediaTypeFilter?: 'all' | 'video') => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onSelectImage?: (image: Image) => void;
  onLogin?: () => void;
}

const HeartBubble = ({ id, x, y, onComplete }: { id: string, x: number, y: number, onComplete: () => void, key?: React.Key }) => {
  const isPop = id.includes('tap') || id.includes('center');
  
  return (
    <motion.div
      initial={{ opacity: 1, scale: 0.2, rotate: (Math.random() - 0.5) * 60 }}
      animate={isPop ? {
        scale: [0.2, 1.4, 0.9, 1.2, 3],
        opacity: [0, 1, 1, 1, 0],
        rotate: [0, -15, 15, -5, 0],
        y: [0, -20, -10, -5, 0]
      } : { 
        opacity: [1, 0.8, 0], 
        scale: [0.5, 1.2, 1.5], 
        x: (Math.random() - 0.5) * 150, 
        y: -250 - Math.random() * 100 
      }}
      transition={{ 
        duration: isPop ? 0.9 : 1.2, 
        ease: isPop ? "easeOut" : "circOut"
      }}
      onAnimationComplete={onComplete}
      className={cn(
        "absolute pointer-events-none z-[160] text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.7)]",
        isPop ? "w-40 h-40" : "w-10 h-10"
      )}
      style={{ 
        left: x, 
        top: y, 
        transform: 'translate(-50%, -50%)'
      }}
    >
      <Heart className={cn("w-full h-full fill-current stroke-white stroke-2", isPop && "drop-shadow-[0_0_40px_rgba(255,255,255,0.6)]")} />
    </motion.div>
  );
};

export default function ImageModal({ image, onClose, onLike, onSave, hasLiked, isSaved, user, onNavigate, hasNext, hasPrev, onSelectImage, onLogin }: ImageModalProps) {
  const { t } = useTranslation();
  useBodyScrollLock(!!image);
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 500 : -500,
      opacity: 0,
      scale: 0.98
    })
  };

  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [reportTypeOpen, setReportTypeOpen] = useState(false);
  const [showUploaderDetails, setShowUploaderDetails] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);
  const [uploaderFullData, setUploaderFullData] = useState<any>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastWheelNavRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, image?.id]);
  const [isCommentsMinimized, setIsCommentsMinimized] = useState(true);
  const [isMobileUiHidden, setIsMobileUiHidden] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomBadge, setShowZoomBadge] = useState(false);
  const zoomBadgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [bubbles, setBubbles] = useState<{ id: string, x: number, y: number }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const mediaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<number>(0);

  const dragX = useMotionValue(0);
  const swipeOpacity = useTransform(dragX, [-100, 0, 100], [0.5, 1, 0.5]);

  const triggerZoomBadge = () => {
    setShowZoomBadge(true);
    if (zoomBadgeTimerRef.current) clearTimeout(zoomBadgeTimerRef.current);
    zoomBadgeTimerRef.current = setTimeout(() => setShowZoomBadge(false), 1200);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    panX.set(0);
    panY.set(0);
    dragX.set(0);
    setOffset({ x: 0, y: 0 });
    triggerZoomBadge();
  };

  const handleZoomIn = (step = 0.5) => {
    setZoomLevel(prev => Math.min(4, Math.round((prev + step) * 100) / 100));
    triggerZoomBadge();
  };

  const handleZoomOut = (step = 0.5) => {
    setZoomLevel(prev => {
      const next = Math.max(1, Math.round((prev - step) * 100) / 100);
      if (next === 1) {
        panX.set(0);
        panY.set(0);
        dragX.set(0);
      }
      return next;
    });
    triggerZoomBadge();
  };

  const handleToggleZoomAtPoint = () => {
    if (zoomLevel > 1) {
      resetZoom();
    } else {
      setZoomLevel(2.5);
      triggerZoomBadge();
    }
  };

  // Reset viewport and gallery state when image changes
  useEffect(() => {
    setCurrentSlide(0);
    resetZoom();
    setImageError(false);
    setIsDetailsExpanded(false);
    setNaturalAspectRatio(null);
  }, [image?.id]);

  const handleNavigateWithDirection = (dir: 'next' | 'prev', mediaTypeFilter: 'all' | 'video' = 'all') => {
    setDirection(dir === 'next' ? 1 : -1);
    onNavigate?.(dir, mediaTypeFilter);
  };

  const handleWheelNavigation = (e: React.WheelEvent) => {
    if (e.ctrlKey || zoomLevel > 1) {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25;
      setZoomLevel(prev => {
        const next = Math.min(4, Math.max(1, Math.round((prev + zoomDelta) * 100) / 100));
        if (next === 1) {
          panX.set(0);
          panY.set(0);
          dragX.set(0);
        }
        return next;
      });
      triggerZoomBadge();
      return;
    }
    
    // Strictly ONLY horizontal wheel (trackpad horizontal swipe or Shift+Wheel or horizontal mouse tilt) navigates next/prev post
    // Vertical scrolling (deltaY) NEVER changes the post so users can scroll through details and comments smoothly
    const now = Date.now();
    if (now - lastWheelNavRef.current > 350) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) {
        if (e.deltaX > 20 && hasNext) {
          lastWheelNavRef.current = now;
          handleNavigateWithDirection('next', image?.type === 'video' ? 'video' : 'all');
        } else if (e.deltaX < -20 && hasPrev) {
          lastWheelNavRef.current = now;
          handleNavigateWithDirection('prev', image?.type === 'video' ? 'video' : 'all');
        }
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMoveSwipe = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      handleTouchZoom(e);
      return;
    }
    if (touchStartXRef.current !== null && touchStartYRef.current !== null && e.touches.length === 1 && zoomLevel <= 1) {
      const deltaX = e.touches[0].clientX - touchStartXRef.current;
      const deltaY = e.touches[0].clientY - touchStartYRef.current;
      
      // Strict horizontal swipe check: horizontal swipe must be distinctly horizontal and pass threshold
      // Vertical touch movement is preserved for natural page and comment scrolling
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 40) {
        const now = Date.now();
        if (now - lastWheelNavRef.current > 350) {
          lastWheelNavRef.current = now;
          if (deltaX < 0 && hasNext) {
            handleNavigateWithDirection('next', image?.type === 'video' ? 'video' : 'all');
          } else if (deltaX > 0 && hasPrev) {
            handleNavigateWithDirection('prev', image?.type === 'video' ? 'video' : 'all');
          }
        }
        touchStartXRef.current = null;
        touchStartYRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = 0;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  useEffect(() => {
    if (image && user) {
      trackActivity(user.uid, [image.category, ...image.tags], 'view');
    }
  }, [image?.id, user?.uid]);

  useEffect(() => {
    if (showUploaderDetails && image?.userId) {
      const unsub = onSnapshot(doc(db, COLLECTIONS.USERS, image.userId), (snap) => {
        if (snap.exists()) setUploaderFullData(snap.data());
      });
      return () => unsub();
    }
  }, [showUploaderDetails, image?.userId]);

  const handleModalLike = (e: React.MouseEvent) => {
    hapticSelection();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add small bubble at click point
    const newBubbles = [{ id: `mod-bubble-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-1`, x, y }];
    
    // Add big center pop if Liking (not unliking)
    if (!hasLiked) {
      newBubbles.push({ id: `center-pop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-2`, x: rect.width / 2, y: rect.height / 2 });
    }
    
    setBubbles(prev => [...prev, ...newBubbles]);
    onLike(e, image!);
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchRef.current < 300) {
      // Double tap detected
      hapticLight();
      const rect = mediaRef.current?.getBoundingClientRect();
      if (rect) {
        const x = rect.width / 2;
        const y = rect.height / 2;
        setBubbles(prev => [...prev, { id: `tap-bubble-${now}-${Math.random().toString(36).substring(2, 9)}`, x, y }]);
        if (!hasLiked) {
           onLike(e as any, image!);
        }
      }
    }
    lastTouchRef.current = now;
  };

  useEffect(() => {
    if (image) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [!!image]);

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
      setIsFullscreen(isFs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' && hasNext && zoomLevel <= 1) handleNavigateWithDirection('next');
      if (e.key === 'ArrowLeft' && hasPrev && zoomLevel <= 1) handleNavigateWithDirection('prev');
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (zoomLevel > 1) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn(0.25);
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut(0.25);
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        resetZoom();
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('msfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('msfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasNext, hasPrev, onNavigate, onClose, zoomLevel]);

  const [relatedImages, setRelatedImages] = useState<Image[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!image) return;
    
    setZoomLevel(1);
    setOffset({ x: 0, y: 0 });
    dragX.set(0);
    setCurrentSlide(0);
    setLoadingRelated(true);

    const fetchRelated = async () => {
      try {
        let fetched: Image[] = [];
        const qCat = query(
          collection(db, COLLECTIONS.IMAGES),
          where('category', '==', image.category),
          limit(30)
        );
        const snapCat = await getDocs(qCat);
        fetched = snapCat.docs
          .map(d => ({ ...d.data(), id: d.id } as Image))
          .filter(img => img.id !== image.id);

        if (fetched.length < 30) {
          const qRecent = query(
            collection(db, COLLECTIONS.IMAGES),
            orderBy('timestamp', 'desc'),
            limit(35)
          );
          const snapRecent = await getDocs(qRecent);
          const recentFetched = snapRecent.docs
            .map(d => ({ ...d.data(), id: d.id } as Image))
            .filter(img => img.id !== image.id);
          
          fetched = [...fetched, ...recentFetched];
        }

        const unique = fetched.filter((img, idx, self) => 
          img && img.id && idx === self.findIndex(t => t.id === img.id)
        ).slice(0, 30);

        setRelatedImages(unique);
      } catch (e) {
        console.warn("Related fetch failed", e);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelated();
  }, [image?.id, image?.category]);

  const onClickRelated = (img: Image) => {
    if (onSelectImage) {
      onSelectImage(img);
    }
  };

  if (!image) return null;

  const toggleFullscreen = () => {
    const nextFs = !isFullscreen;
    setIsFullscreen(nextFs);
    
    // Always match immersive UI hides on mobile
    if (window.innerWidth < 768) {
      setIsMobileUiHidden(nextFs);
    }

    try {
      const targetElem = (modalRef.current || document.documentElement) as any;
      if (nextFs) {
        if (targetElem?.requestFullscreen) {
          targetElem.requestFullscreen().catch((err: any) => {
            console.warn("Native fullscreen delayed or prevented:", err);
          });
        } else if (targetElem?.webkitRequestFullscreen) {
          targetElem.webkitRequestFullscreen();
        } else if (targetElem?.msRequestFullscreen) {
          targetElem.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
          if (doc.exitFullscreen) {
            doc.exitFullscreen().catch((err: any) => {
              console.warn("Could not exit native fullscreen:", err);
            });
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
          } else if (doc.msExitFullscreen) {
            doc.msExitFullscreen();
          }
        }
      }
    } catch (e) {
      console.warn("Fullscreen API exception:", e);
    }
  };

  const handleDragEnd = (e: any, info: any) => {
    if (zoomLevel > 1) return;
    const threshold = 50;
    if (info.offset.x < -threshold && hasNext) {
      onNavigate?.('next');
    } else if (info.offset.x > threshold && hasPrev) {
      onNavigate?.('prev');
    }
    dragX.set(0);
  };

  const isPremiumLocked = image.isPremium && !user?.isPremium && !image.isSample;
  
  // Restriction for normal users on premium assets
  const isProtected = image.isPremium && !user?.isPremium;
  const isAdminUploader = ['arjunjareda2007@gmail.com', 'arjunjareda1355@gmail.com'].includes(image.uploaderEmail || '');

  const handlePinchZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      setZoomLevel(prev => {
        const next = Math.min(4, Math.max(1, Math.round((prev + delta * 0.01) * 100) / 100));
        if (next === 1) {
          panX.set(0);
          panY.set(0);
          dragX.set(0);
        }
        return next;
      });
      triggerZoomBadge();
    }
  };

  const handleTouchZoom = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      if (lastTouchRef.current === 0) {
        lastTouchRef.current = distance;
      } else {
        const delta = distance - lastTouchRef.current;
        setZoomLevel(prev => {
          const next = Math.min(4, Math.max(1, Math.round((prev + delta * 0.012) * 100) / 100));
          if (next === 1) {
            panX.set(0);
            panY.set(0);
            dragX.set(0);
          }
          return next;
        });
        lastTouchRef.current = distance;
        triggerZoomBadge();
      }
    }
  };

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return null;

    // Google Drive embed
    if (url.includes('drive.google.com')) {
      const driveMatch = url.match(/(?:\/file\/d\/|id=)([\w-]+)/);
      if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    // YouTube (including Shorts, embed, watch, youtu.be)
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|shorts\/|watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1`;
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;

    // Instagram
    const instaMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([^\/?#&]+)/);
    if (instaMatch) return `https://www.instagram.com/p/${instaMatch[1]}/embed/`;
    
    return null;
  };

  const isDirectVideo = /\.(mp4|webm|ogg|mov)$/i.test(image.url);
  const embedUrl = getVideoEmbedUrl(image.url);

  const isYoutube = /youtube\.com|youtu\.be/i.test(image.url);
  const isYoutubeShort = isYoutube && image.url.toLowerCase().includes('/shorts/');
  
  // Robust check for portrait content (either from database or inferred from url characteristics)
  const isInferredPortrait = image.aspectRatio === 'portrait' || 
                             isYoutubeShort || 
                             /portrait|vertical|reel|tiktok|9-16|9_16|9x16/i.test(image.url);

  const ratio = isInferredPortrait ? 'portrait' : (image.aspectRatio || 'landscape');
  const ratioStyle: React.CSSProperties = {
    aspectRatio: ratio === 'landscape' ? '16/9' :
                 ratio === 'portrait' ? '9/16' :
                 ratio === 'square' ? '1/1' :
                 ratio === 'ultrawide' ? '21/9' : '16/9',
    maxWidth: '100%',
    maxHeight: '100%',
    width: ratio === 'landscape' || ratio === 'ultrawide' ? '100%' : 'auto',
    height: ratio === 'portrait' || ratio === 'square' ? '100%' : 'auto'
  };

  const handleDelete = async () => {
    const canDelete = user?.isAdmin || (user && (image.userId === user.uid || (image.uploaderEmail && user.email === image.uploaderEmail)));
    if (!canDelete || !window.confirm("Are you sure you want to permanently delete this asset?")) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.IMAGES, image.id));
      onClose();
    } catch (e: any) {
      console.error("Delete failed:", e);
      alert(`Field transmission failed: ${e.message || "Unknown interference"}`);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleShare = async () => {
    if (isProtected) {
      alert("Aether Protocol: Sharing restricted for premium assets. Please upgrade to Divine Curator status.");
      return;
    }

    const res = await shareAsset(image, user);
    if (res.method === 'clipboard') {
      alert(res.message);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${getBaseAppUrl()}/?post=${encodeURIComponent(image.id)}`;
    const success = await copyToClipboard(shareUrl);
    if (success) {
      hapticSuccess();
    }
  };

  const handleDownload = async () => {
    if (!image.url || isProtected) return;
    setIsDownloading(true);
    try {
      if (image.type === 'video' && !isDirectVideo) {
         window.open(`https://en.savefrom.net/1-youtube-video-downloader-386/?url=${encodeURIComponent(image.url)}`, '_blank');
         alert("External downloader opened for platform video.");
         return;
      }

      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${image.title.replace(/\s+/g, '_')}_Aether.${blob.type.split('/')[1] || 'bin'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      window.open(image.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const submitReport = async (type: 'broken' | 'inappropriate' | 'spam') => {
    if (!user || isReporting) return;
    setIsReporting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.REPORTS), {
        imageId: image.id,
        imageUrl: image.url,
        userId: user.uid,
        type,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      setReportTypeOpen(false);
      alert("Report submitted. Thank you for keeping Lumina safe.");
    } catch (e) { 
      console.error(e); 
      alert("Failed to submit report. Please try again.");
    } finally { 
      setIsReporting(false); 
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-bg-dark/95 backdrop-blur-md cursor-pointer"
        />


        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            isFullscreen
              ? "fixed inset-0 w-screen h-screen max-w-none max-h-none h-full w-full rounded-none border-none z-[99999] bg-black p-0 m-0 overflow-hidden flex flex-col"
              : "relative w-full h-[92dvh] max-h-[920px] max-w-4xl glass-dark md:rounded-[36px] overflow-y-auto no-scrollbar flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] bg-card-dark z-[101] border border-white/10",
            !isFullscreen && isMobileUiHidden && "h-screen"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Universal Absolute Top Right Close Button */}
          <button 
            onClick={isFullscreen ? toggleFullscreen : onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 z-[150] p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-text-dim hover:text-brand-primary hover:border-brand-primary/30 transition-all cursor-pointer shadow-2xl active:scale-95 group"
            title={isFullscreen ? "Exit Device Fullscreen (Esc / F)" : "Close Details"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-brand-primary" /> : <X className="w-5 h-5 group-hover:rotate-90 transition-all duration-300" />}
          </button>

            {/* Media Section */}
            <div 
              ref={mediaRef}
              className={cn(
                "w-full bg-bg-dark flex items-center justify-center relative group overflow-hidden select-none transition-all duration-300 shrink-0",
                isFullscreen ? "fixed inset-0 w-screen h-screen bg-black z-[120] p-0 m-0 flex-1 max-h-none min-h-0" : 
                isMobileUiHidden ? "h-screen p-2 md:p-6" : "min-h-[350px] md:min-h-[460px] max-h-[60vh] rounded-t-[36px] p-2 md:p-6"
              )}
              onWheel={handleWheelNavigation}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMoveSwipe}
              onTouchEnd={handleTouchEnd}
              onClick={handleDoubleTap}
              onContextMenu={(e) => isProtected && e.preventDefault()}
            >
              {/* Background Ambient Blur */}
              <motion.div 
                key={`ambient-${image.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="absolute inset-[-100px] z-0 pointer-events-none"
              >
                <img src={image.urls?.[0] || image.url} alt="" className="w-full h-full object-cover blur-[120px] scale-150 opacity-50" />
                <div className="absolute inset-0 bg-bg-dark/40" />
              </motion.div>

              <AnimatePresence>
                {bubbles.map(bubble => (
                  <HeartBubble 
                    key={bubble.id} 
                    id={bubble.id}
                    x={bubble.x} 
                    y={bubble.y} 
                    onComplete={() => setBubbles(prev => prev.filter(b => b.id !== bubble.id))} 
                  />
                ))}
              </AnimatePresence>

              {isPremiumLocked ? (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg-dark/40 backdrop-blur-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-display font-bold text-text-main uppercase tracking-tight">Premium Sanctuary Asset</h3>
                  <p className="text-text-dim text-sm max-w-xs mx-auto leading-relaxed">This exclusive moment is reserved for Divine Curators. Upgrade your presence to unlock the full clarity.</p>
                </div>
                {!isMobileUiHidden && (
                  <Link 
                    to="/upgrade" 
                    onClick={onClose}
                    className="px-10 py-4 bg-text-main text-bg-dark rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                  >
                    Upgrade to View
                  </Link>
                )}
              </div>
            ) : null}

            {/* Minimized Video Navigation Controls - Streams only videos on scroll/click */}
            {image.type === 'video' && (
              <div className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-[140] flex flex-col items-center gap-1 bg-black/70 hover:bg-black/85 backdrop-blur-2xl p-1.5 rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.7)] transition-all group/vidnav">
                {hasPrev && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNavigateWithDirection('prev', 'video'); }}
                    className="w-7 h-7 bg-white/10 hover:bg-brand-primary hover:text-bg-dark text-white rounded-full transition-all active:scale-90 flex items-center justify-center cursor-pointer shadow-md"
                    title="Previous Video"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-90" />
                  </button>
                )}
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-brand-primary select-none opacity-80 group-hover/vidnav:opacity-100 transition-opacity" title="Videos Stream">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                {hasNext && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNavigateWithDirection('next', 'video'); }}
                    className="w-7 h-7 bg-brand-primary/80 hover:bg-brand-primary text-bg-dark font-bold rounded-full transition-all active:scale-90 flex items-center justify-center cursor-pointer shadow-md"
                    title="Next Video"
                  >
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                )}
              </div>
            )}

            {/* Video Content */}

            {image.type === 'video' ? (
               <div className={cn(
                 "w-full flex flex-col justify-between items-center bg-bg-dark relative overflow-hidden",
                 isFullscreen ? "h-full flex-1 p-0 m-0" : "h-full p-1 md:p-6"
               )}>
                 <div className="w-full flex-1 relative flex items-center justify-center min-h-0 w-full h-full">
                  {embedUrl ? (
                    <div 
                      className={cn(
                        "overflow-hidden flex items-center justify-center relative w-full h-full",
                        isFullscreen ? "max-h-none rounded-none" : "rounded-2xl shadow-2xl max-h-[80vh]"
                      )}
                      style={!isFullscreen && naturalAspectRatio ? { aspectRatio: `${naturalAspectRatio}` } : undefined}
                    >
                      <iframe
                        src={embedUrl}
                        className="w-full h-full border-0 object-contain"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={image.title}
                      />
                    </div>
                  ) : (
                    <div 
                      className={cn(
                        "overflow-hidden flex items-center justify-center relative bg-black/40 w-full h-full",
                        isFullscreen ? "max-h-none rounded-none" : "rounded-2xl shadow-2xl max-h-[80vh]"
                      )}
                      style={!isFullscreen && naturalAspectRatio ? { aspectRatio: `${naturalAspectRatio}` } : undefined}
                    >
                      <video
                        ref={videoRef}
                        src={image.url}
                        poster={image.thumbnailUrl}
                        controls
                        autoPlay
                        muted={isMuted}
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget;
                          if (v.videoWidth && v.videoHeight) {
                            setNaturalAspectRatio(v.videoWidth / v.videoHeight);
                          }
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                 </div>
               </div>
            ) : (
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.div
                    key={`${image.id}-${currentSlide}`}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "tween", duration: 0.22, ease: "easeOut" },
                      opacity: { duration: 0.15 }
                    }}
                    className="w-full h-full flex items-center justify-center absolute"
                  >
              <div 
                ref={containerRef}
                style={!isFullscreen && naturalAspectRatio ? { aspectRatio: `${naturalAspectRatio}` } : undefined}
                className={cn(
                  "overflow-hidden no-scrollbar flex items-center justify-center relative w-full h-full",
                  isFullscreen ? "max-w-none max-h-none rounded-none" : "rounded-2xl shadow-2xl max-w-full max-h-[80vh]"
                )}
                onWheel={handleWheelNavigation}
              >
                {/* Visual Zoom Badge */}
                <AnimatePresence>
                  {showZoomBadge && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] bg-black/85 backdrop-blur-xl text-white border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold shadow-2xl pointer-events-none flex items-center gap-1.5"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{Math.round(zoomLevel * 100)}%</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.img
                  style={{
                    x: zoomLevel > 1 ? panX : dragX,
                    y: zoomLevel > 1 ? panY : 0,
                    opacity: zoomLevel > 1 ? 1 : swipeOpacity,
                    cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
                    touchAction: zoomLevel > 1 ? 'none' : 'pan-y'
                  }}
                  drag={zoomLevel > 1 ? true : "x"}
                  dragConstraints={
                    zoomLevel > 1 && containerRef.current
                      ? {
                          left: -Math.max(0, (containerRef.current.clientWidth * (zoomLevel - 1)) / 2),
                          right: Math.max(0, (containerRef.current.clientWidth * (zoomLevel - 1)) / 2),
                          top: -Math.max(0, (containerRef.current.clientHeight * (zoomLevel - 1)) / 2),
                          bottom: Math.max(0, (containerRef.current.clientHeight * (zoomLevel - 1)) / 2)
                        }
                      : { left: 0, right: 0 }
                  }
                  dragElastic={zoomLevel > 1 ? 0.08 : 0.8}
                  onDragEnd={(e, info) => {
                    if (zoomLevel > 1) return;
                    
                    const swipeThreshold = 100;
                    const velocityThreshold = 500;
                    const isSwipeNext = info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold;
                    const isSwipePrev = info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold;

                    if (isSwipeNext) {
                      if (image.urls && currentSlide < image.urls.length - 1) {
                        setDirection(1);
                        setCurrentSlide(prev => prev + 1);
                      } else if (hasNext) {
                        handleNavigateWithDirection('next');
                      }
                    } else if (isSwipePrev) {
                      if (image.urls && currentSlide > 0) {
                        setDirection(-1);
                        setCurrentSlide(prev => prev - 1);
                      } else if (hasPrev) {
                        handleNavigateWithDirection('prev');
                      }
                    }
                    dragX.set(0);
                  }}
                  animate={{ 
                    scale: zoomLevel,
                    transition: { type: 'spring', damping: 28, stiffness: 220 }
                  }}
                  src={image.urls && image.urls[currentSlide] ? image.urls[currentSlide] : image.url}
                  alt={image.title}
                  draggable={!isProtected}
                  referrerPolicy="no-referrer"
                  onDoubleClick={(e) => {
                    if (isProtected) return;
                    e.stopPropagation();
                    handleToggleZoomAtPoint();
                  }}
                  onClick={() => {
                    if (isProtected) return;
                    if (window.innerWidth < 768) {
                      if (zoomLevel > 1) {
                        resetZoom();
                      } else {
                        setIsMobileUiHidden(!isMobileUiHidden);
                      }
                    }
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setNaturalAspectRatio(img.naturalWidth / img.naturalHeight);
                    }
                    setImageError(false);
                  }}
                  onError={() => setImageError(true)}
                  className={cn(
                    "w-full h-full object-contain transition-opacity duration-300 select-none",
                    imageError ? "opacity-20" : "opacity-100",
                    isProtected && "pointer-events-none"
                  )}
                />
              </div>
            </motion.div>
          </AnimatePresence>

                {/* Gallery Dots */}
                {image.urls && image.urls.length > 1 && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50 p-2 bg-bg-dark/20 backdrop-blur-md rounded-full shadow-2xl">
                    {image.urls.map((url, i) => (
                      <button
                        key={`media-dot-${image.id}-${i}-${url.substring(0, 10)}`}
                        onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          currentSlide === i ? "bg-brand-primary w-6 shadow-[0_0_10px_var(--brand-primary)]" : "bg-text-main/40 hover:bg-text-main/60"
                        )}
                      />
                    ))}
                  </div>
                )}


                {isProtected && !isPremiumLocked && (
                  <div 
                    className="absolute inset-0 z-40 cursor-not-allowed" 
                    onContextMenu={(e) => e.preventDefault()}
                    aria-hidden="true"
                  />
                )}
                
                {/* Navigation Arrows - Sleek & Refined */}
                {hasPrev && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNavigateWithDirection('prev'); }}
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xl border border-white/10 text-white transition-all flex items-center justify-center active:scale-90 shadow-lg group/nav",
                      isMobileUiHidden ? "opacity-0 pointer-events-none" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    )}
                    aria-label="Previous post"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover/nav:-translate-x-0.5 transition-transform" />
                  </button>
                )}
                {hasNext && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNavigateWithDirection('next'); }}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xl border border-white/10 text-white transition-all flex items-center justify-center active:scale-90 shadow-lg group/nav",
                      isMobileUiHidden ? "opacity-0 pointer-events-none" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    )}
                    aria-label="Next post"
                  >
                    <ChevronRight className="w-5 h-5 group-hover/nav:translate-x-0.5 transition-transform" />
                  </button>
                )}
                
                {/* Bottom-Centered Sleek Zoom Control Bar */}
                {!isProtected && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-1.5 bg-black/85 backdrop-blur-2xl border border-white/20 p-1.5 px-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoomOut(0.25);
                      }}
                      disabled={zoomLevel <= 1}
                      className={cn(
                        "p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer",
                        zoomLevel <= 1
                          ? "text-white/30 cursor-not-allowed"
                          : "text-white hover:bg-brand-primary hover:text-bg-dark active:scale-90"
                      )}
                      title="Zoom Out (-)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-white/15 mx-0.5" />

                    {/* Preset Quick Buttons */}
                    <div className="flex items-center gap-1">
                      {[1, 1.5, 2, 3].map((level) => (
                        <button
                          key={`zoom-preset-${level}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (level === 1) {
                              resetZoom();
                            } else {
                              setZoomLevel(level);
                              triggerZoomBadge();
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer select-none",
                            Math.abs(zoomLevel - level) < 0.1
                              ? "bg-brand-primary text-bg-dark shadow-[0_0_12px_rgba(var(--brand-primary-rgb),0.5)] font-bold"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                          )}
                          title={`Zoom to ${level * 100}%`}
                        >
                          {level === 1 ? '100%' : `${level}x`}
                        </button>
                      ))}
                    </div>

                    <div className="h-4 w-px bg-white/15 mx-0.5" />

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoomIn(0.25);
                      }}
                      disabled={zoomLevel >= 4}
                      className={cn(
                        "p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer",
                        zoomLevel >= 4
                          ? "text-white/30 cursor-not-allowed"
                          : "text-white hover:bg-brand-primary hover:text-bg-dark active:scale-90"
                      )}
                      title="Zoom In (+)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetZoom();
                      }}
                      className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90 flex items-center justify-center cursor-pointer ml-0.5"
                      title="Reset Zoom & Pan (0 / R)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {imageError && (
               <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 z-10 bg-bg-dark/80 backdrop-blur-md">
                  <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-3xl text-brand-primary shadow-xl">
                    <ExternalLink className="w-8 h-8 md:w-12 md:h-12" />
                  </div>
                  <div className="max-w-xs space-y-2">
                    <h3 className="text-lg md:text-xl font-bold text-text-main">Hosted External Link</h3>
                    <p className="text-xs md:text-sm text-text-dim leading-relaxed">
                      This post is hosted directly via an external web source.
                    </p>
                  </div>
                  <a
                    href={image.externalLink || image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-brand-primary text-bg-dark font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-xl"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Original Hosted Link
                  </a>
               </div>
            )}

            {/* Action Bar (Top Left) - Universal Floating Controls (Hidden in Fullscreen to prevent duplicate exit icons) */}
            {!isFullscreen && (
              <div className="absolute top-4 left-4 md:top-6 md:left-6 z-[140] flex items-center gap-3">
                {/* Fullscreen Toggle / Immersive Mode */}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className={cn(
                    "p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-text-main hover:text-brand-primary transition-all hover:bg-black/90 active:scale-90 shadow-2xl flex items-center justify-center cursor-pointer group/fs"
                  )}
                  title="View in Fullscreen of Device (F)"
                >
                  <Maximize2 className="w-5 h-5 group-hover/fs:scale-110 transition-transform" />
                </button>
              </div>
            )}
            </div>
            
            {!isFullscreen && (
              /* Post Content Area - Single Scrollable Flow Below Media */
              <div className="w-full flex-1 flex flex-col p-5 md:p-8 space-y-6 bg-card-dark/60">
                {/* 1. Clickable Post Title */}
                <div className="space-y-3">
                  <button 
                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                    className="w-full text-left p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-brand-primary/40 rounded-2xl cursor-pointer transition-all group select-none flex items-center justify-between gap-3 shadow-lg"
                    title="Click to view uploader & post details"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary text-[9px] font-black uppercase tracking-widest rounded-lg border border-brand-primary/20 shrink-0">
                        {image.category}
                      </span>
                      <h2 className="text-sm md:text-lg font-display font-black tracking-tight text-text-main uppercase italic truncate group-hover:text-brand-primary transition-colors">
                        {image.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-brand-primary text-xs shrink-0 font-bold bg-brand-primary/10 px-3 py-1.5 rounded-xl border border-brand-primary/20">
                      <UserCircle className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider">
                        {isDetailsExpanded ? 'Hide Info' : 'Details'}
                      </span>
                      <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", isDetailsExpanded && "rotate-90")} />
                    </div>
                  </button>

                  {/* 2. Expandable Screen: Uploader Profile & Post Details */}
                  <AnimatePresence>
                    {isDetailsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden pt-1"
                      >
                        {/* Uploader Card */}
                        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 space-y-3">
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-text-dim/60">Uploader Profile</p>
                          <div className="flex items-center justify-between gap-3">
                            <Link 
                              to={`/profile/${image.userId || ''}`}
                              onClick={onClose}
                              className="flex items-center gap-3 min-w-0 hover:text-brand-primary transition-colors group/user"
                            >
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-bg-dark shrink-0 group-hover/user:border-brand-primary/50 transition-all">
                                <img 
                                  src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${image.userId || image.id}`} 
                                  referrerPolicy="no-referrer" 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-black text-text-main truncate uppercase group-hover/user:text-brand-primary">
                                    {image.uploaderName || image.uploaderEmail?.split('@')[0] || 'Aether Resident'}
                                  </p>
                                  {isAdminUploader && <ShieldCheck className="w-4 h-4 text-brand-secondary shrink-0" />}
                                </div>
                                <p className="text-[9px] font-bold text-text-dim/50 uppercase tracking-widest mt-0.5">
                                  Uploaded {formatDate(image.timestamp)}
                                </p>
                              </div>
                            </Link>

                            <Link
                              to={`/profile/${image.userId || ''}`}
                              onClick={onClose}
                              className="px-3.5 py-1.5 bg-white/5 hover:bg-brand-primary hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-text-dim transition-all shrink-0"
                            >
                              View Profile
                            </Link>
                          </div>
                        </div>

                        {/* Post Details & Description */}
                        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 space-y-2">
                          <p className="text-[9px] font-extrabold uppercase tracking-widest text-text-dim/60">Post Details</p>
                          {image.description ? (
                            <p className="text-text-dim/90 text-xs leading-relaxed font-medium">
                              {image.description}
                            </p>
                          ) : (
                            <p className="text-text-dim/40 text-xs italic">No additional description provided.</p>
                          )}

                          {image.tags && image.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                              {Array.from(new Set(image.tags)).filter(Boolean).map((tag: string, i: number) => (
                                <span key={`exp-tag-${image.id}-${tag}-${i}`} className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-text-dim uppercase tracking-wider">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Action Buttons Row: Like, Comment, Save, Share, Flag, Download */}
                <div className="flex items-center justify-around gap-2 p-2 bg-white/[0.03] border border-white/5 rounded-2xl shadow-lg">
                  {/* Like Button */}
                  <button
                    onClick={handleModalLike}
                    className={cn(
                      "flex-1 p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center",
                      hasLiked ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white/5 text-text-main hover:bg-white/10"
                    )}
                    title={hasLiked ? "Unlike post" : "Like post"}
                    aria-label={hasLiked ? "Unlike post" : "Like post"}
                  >
                    <Heart className={cn("w-4.5 h-4.5", hasLiked && "fill-current")} />
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={() => setIsCommentsMinimized(prev => !prev)}
                    className={cn(
                      "flex-1 p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center",
                      !isCommentsMinimized ? "bg-brand-primary text-bg-dark font-black shadow-lg shadow-brand-primary/20" : "bg-white/5 text-text-main hover:bg-white/10"
                    )}
                    title="Toggle comments section"
                    aria-label="Toggle comments"
                  >
                    <MessageSquare className="w-4.5 h-4.5" />
                  </button>

                  {/* Save Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onSave(image!); }}
                    className={cn(
                      "flex-1 p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center",
                      isSaved ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/30 font-black" : "bg-white/5 text-text-main hover:bg-white/10"
                    )}
                    title={isSaved ? "Remove from saved" : "Save post"}
                    aria-label={isSaved ? "Remove from saved" : "Save post"}
                  >
                    <BookmarkPlus className={cn("w-4.5 h-4.5", isSaved && "fill-current")} />
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    className="flex-1 p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-text-main rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    title="Share post"
                    aria-label="Share post"
                  >
                    <Share2 className="w-4.5 h-4.5" />
                  </button>

                  {/* Flag / Report Button */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setReportTypeOpen(!reportTypeOpen)}
                      className={cn(
                        "w-full p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center",
                        reportTypeOpen ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-white/5 border-white/5 text-text-dim hover:text-red-400 hover:bg-red-500/10"
                      )}
                      title="Flag / Report"
                      aria-label="Flag / Report"
                    >
                      <Flag className="w-4.5 h-4.5" />
                    </button>
                    {reportTypeOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-36 bg-card-dark border border-border-dark rounded-2xl shadow-2xl py-1 overflow-hidden flex flex-col z-50">
                        {(['broken', 'inappropriate', 'spam'] as const).map((t) => (
                          <button 
                            key={`report-type-${t}`}
                            onClick={() => submitReport(t)}
                            className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider hover:bg-red-400/10 text-red-200 transition-colors"
                          >
                            Report {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  {!embedUrl && !isProtected && (
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="flex-1 p-2.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/20 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                      title="Download asset"
                      aria-label="Download asset"
                    >
                      <Download className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>

                {/* 4. Comments Section Inline */}
                <AnimatePresence>
                  {!isCommentsMinimized && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 md:p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4 overflow-hidden shadow-2xl"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-primary">
                          <MessageSquare className="w-4 h-4" /> Comments & Discussion
                        </div>
                        <button 
                          onClick={() => setIsCommentsMinimized(true)}
                          className="p-1 rounded-lg text-text-dim hover:text-white bg-white/5 hover:bg-white/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-[380px] overflow-y-auto no-scrollbar">
                        <CommentSection imageId={image.id} user={user} imageTags={image.tags} onLogin={onLogin} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Admin / Owner Delete Option */}
                {(user?.isAdmin || (user && image.userId === user.uid)) && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" /> Delete Post
                      </>
                    )}
                  </button>
                )}

                {/* 5. Related Posts Grid */}
                {relatedImages.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                        <Sparkles className="w-4 h-4 text-brand-primary" /> Related Sanctuary Assets
                      </div>
                      <span className="text-[10px] font-bold text-brand-primary">{relatedImages.length} items</span>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {relatedImages.map((img, i) => (
                        <button
                          key={`related-${image.id}-${img.id || i}-${i}`}
                          onClick={() => onClickRelated(img)}
                          className="relative aspect-square rounded-2xl overflow-hidden group/related ring-1 ring-white/10 hover:ring-brand-primary transition-all cursor-pointer shadow-lg"
                        >
                          <img 
                            src={img.type === 'video' ? img.thumbnailUrl || img.url : img.url} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/related:scale-110" 
                            alt={img.title || "Related asset"}
                          />
                          {img.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="w-4 h-4 text-white fill-current" />
                            </div>
                          )}
                          {img.isPremium && (
                            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md p-1 rounded-md">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
      </div>

      {/* MODAL: Curator Profile Details - Enhanced "Small Screen" Feel */}
      <AnimatePresence>
        {showUploaderDetails && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploaderDetails(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xs bg-card-dark rounded-3xl overflow-hidden border border-white/10 shadow-2xl z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-20 bg-gradient-to-br from-white/5 to-white/[0.02] relative border-b border-white/5">
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => setShowUploaderDetails(false)}
                    className="p-1.5 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors border border-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-8 -mt-10 relative flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-card-dark shadow-xl bg-white/[0.02]">
                  {image.uploaderPhotoURL ? (
                    <img 
                      src={image.uploaderPhotoURL} 
                      alt={image.uploaderName} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <UserCircle className="w-10 h-10" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 allow-select">
                  <h2 className="text-xl font-display font-light text-white leading-none">{image.uploaderName}</h2>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-primary">
                    {uploaderFullData?.isAdmin ? 'Architect' : 'Resident Curator'}
                  </p>
                </div>

                <div className="w-full grid grid-cols-1 gap-2 allow-select">
                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <Mail className="w-3 h-3 text-text-dim/40" />
                        <span className="text-[10px] text-text-main/60 truncate">{image.uploaderEmail}</span>
                    </div>

                    {uploaderFullData?.location && (
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                            <MapPin className="w-3 h-3 text-text-dim/40" />
                            <span className="text-[10px] text-text-main/60">{uploaderFullData.location}</span>
                        </div>
                    )}
                </div>

                {uploaderFullData?.bio && (
                    <p className="text-[10px] text-text-dim/40 leading-relaxed italic px-2 allow-select">
                        "{uploaderFullData.bio}"
                    </p>
                )}

                <button 
                  onClick={() => setShowUploaderDetails(false)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-text-dim/30 hover:text-text-main transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isCollectionsOpen && <CollectionModal imageId={image.id} user={user} onClose={() => setIsCollectionsOpen(false)} />}
    </AnimatePresence>
  );
}
