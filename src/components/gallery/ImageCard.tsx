import { Heart, Share2, ZoomIn, AlertCircle, Play, Sparkles, Download, BookmarkPlus, User as UserIcon, Layers, Volume2, VolumeX, Check, Music, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn, copyToClipboard } from '../../lib/utils';
import { Image, User } from '../../types';
import { trackActivity } from '../../lib/recommendation';
import { shareAsset } from '../../utils/shareUtils';
import ShareModal from './ShareModal';

interface ImageCardProps {
  image: Image;
  user: User | null;
  onClick: (image: Image) => void;
  onLike: (e: React.MouseEvent, image: Image) => void;
  onSave?: (e: React.MouseEvent, image: Image) => void;
  hasLiked: boolean;
  isSaved?: boolean;
  isFeatured?: boolean;
  index?: number;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (image: Image) => void;
  onStartSelectMode?: (image: Image) => void;
}

const HeartBubble = ({ x, y, onComplete }: { x: number, y: number, onComplete: () => void, key?: React.Key }) => (
  <motion.div
    initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
    animate={{ 
      opacity: 0, 
      scale: 1.5, 
      x: (Math.random() - 0.5) * 100, 
      y: -150 - Math.random() * 50 
    }}
    exit={{ opacity: 0 }}
    onAnimationComplete={onComplete}
    className="absolute pointer-events-none z-50 text-red-500"
    style={{ left: x, top: y }}
  >
    <Heart className="w-6 h-6 fill-current shadow-xl" />
  </motion.div>
);

const getFileType = (img: Image) => {
  if (img.type === 'video') {
    if (/youtube\.com|youtu\.be/i.test(img.url)) return 'YouTube Video';
    const match = img.url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
    return match ? match[1].toUpperCase() : 'MP4';
  }
  const match = img.url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  const ext = match ? match[1].toUpperCase() : 'JPEG';
  return ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'AVIF', 'SVG'].includes(ext) ? ext : 'JPEG';
};

const getResolution = (img: Image) => {
  const seed = img.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const aspect = img.aspectRatio || 'landscape';
  if (aspect === 'portrait') {
    const options = ['1080 x 1920', '1440 x 2560', '1200 x 1600'];
    return options[seed % options.length];
  } else if (aspect === 'square') {
    const options = ['1080 x 1080', '2048 x 2048', '1200 x 1200'];
    return options[seed % options.length];
  } else if (aspect === 'ultrawide') {
    const options = ['2560 x 1080', '3440 x 1440', '3840 x 1600'];
    return options[seed % options.length];
  } else {
    const options = ['1920 x 1080', '2560 x 1440', '3840 x 2160', '1600 x 1200'];
    return options[seed % options.length];
  }
};

export default React.memo(function ImageCard({ 
  image, 
  user, 
  onClick, 
  onLike, 
  onSave, 
  hasLiked, 
  isSaved, 
  isFeatured, 
  index = 0,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onStartSelectMode
}: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [bubbles, setBubbles] = useState<{ id: string, x: number, y: number }[]>([]);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  const shouldBlur = image.isPremium && !user?.isPremium && !image.isSample;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isInViewport, setIsInViewport] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // videos are on mute mode by default

  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartTimestamp = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasTriggeredLongPress = useRef(false);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  const isDirectVideo = /\.(mp4|webm|ogg|mov)$/i.test(image.url);
  const isYoutube = /youtube\.com|youtu\.be/i.test(image.url);
  const isYoutubeShort = isYoutube && image.url.toLowerCase().includes('/shorts/');

  // Robust check for portrait content (either from database or inferred from url characteristics)
  const isInferredPortrait = image.aspectRatio === 'portrait' || 
                             isYoutubeShort || 
                             /portrait|vertical|reel|tiktok|9-16|9_16|9x16/i.test(image.url);
                             
  const finalRatio = isInferredPortrait ? 'portrait' : (image.aspectRatio || 'landscape');

  const shouldRenderVideo = isPlaying && !shouldBlur;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getCardYoutubeEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|shorts\/|watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (!ytMatch) return '';
    const videoId = ytMatch[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1&controls=0&loop=1&playlist=${videoId}`;
  };

  useEffect(() => {
    if (image.type !== 'video' || (!isDirectVideo && !isYoutube)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        setIsInViewport(entry.isIntersecting);
        // If the item scrolls out of the viewport, stop playing
        if (!entry.isIntersecting) {
          setIsPlaying(false);
          setHoldProgress(0);
        }
      });
    }, {
      threshold: 0.1
    });

    const currentEl = containerRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [image.type, image.url, isDirectVideo, isYoutube]);

  // Coordinate playing state: pause other videos when a new one starts playing
  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.imageId !== image.id) {
        setIsPlaying(false);
      }
    };

    window.addEventListener('aether_play_video', handleGlobalPlay);
    return () => {
      window.removeEventListener('aether_play_video', handleGlobalPlay);
    };
  }, [image.id]);

  // Coordinate muting state: mute other videos when one becomes unmuted
  useEffect(() => {
    const handleGlobalUnmute = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.imageId !== image.id) {
        setIsMuted(true);
      }
    };

    window.addEventListener('aether_unmute_video', handleGlobalUnmute);
    return () => {
      window.removeEventListener('aether_unmute_video', handleGlobalUnmute);
    };
  }, [image.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Playback delayed or prevented:", error);
        });
      }
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Control YouTube embedding mute/play states dynamically via postMessage
  useEffect(() => {
    if (isYoutube && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const command = isMuted ? 'mute' : 'unMute';
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: command
        }), '*');

        const playCommand = isPlaying ? 'playVideo' : 'pauseVideo';
        iframeRef.current.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: playCommand
        }), '*');
      } catch (e) {
        console.warn("Could not post message to YouTube iframe:", e);
      }
    }
  }, [isMuted, isPlaying, isYoutube]);

  const playVideoInstantly = () => {
    if (image.type !== 'video' || (!isDirectVideo && !isYoutube) || shouldBlur) return;
    if (!isPlaying) {
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent('aether_play_video', { detail: { imageId: image.id } }));
    }
  };

  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    const isAdminLongPress = user?.isAdmin && !isSelectMode;
    const isVideoHold = image.type === 'video' && !isAdminLongPress;
    
    if (!isAdminLongPress && !isVideoHold) return;

    if ('touches' in e && e.touches[0]) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else {
      touchStartPos.current = null;
    }

    hasTriggeredLongPress.current = false;
    setHoldProgress(0);
    holdStartTimestamp.current = Date.now();

    const updateProgress = () => {
      if (!holdStartTimestamp.current) return;
      const elapsed = Date.now() - holdStartTimestamp.current;
      const targetTime = isAdminLongPress ? 1200 : 1000; // 1.2s for admin hold select to prevent accidents
      const progress = Math.min((elapsed / targetTime) * 100, 100);
      setHoldProgress(progress);

      if (elapsed < targetTime) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        hasTriggeredLongPress.current = true;
        if (isAdminLongPress) {
          if (onStartSelectMode) {
            onStartSelectMode(image);
          }
          setHoldProgress(0);
          holdStartTimestamp.current = null;
        } else if (isVideoHold) {
          playVideoInstantly();
          setHoldProgress(0);
          holdStartTimestamp.current = null;
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelHold = () => {
    if (holdStartTimestamp.current) {
      holdStartTimestamp.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setHoldProgress(0);
  };

  const checkTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !e.touches[0]) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 5 || dy > 5) {
      cancelHold();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsVideoActive(false);
    cancelHold();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) {
      window.dispatchEvent(new CustomEvent('aether_unmute_video', { detail: { imageId: image.id } }));
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setBubbles(prev => [...prev, { id: `card-bubble-btn-${Math.random().toString(36).substr(2, 9)}-${Date.now()}-${prev.length}`, x, y }]);
    onLike(e, image);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (isSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      if (onToggleSelect) {
        onToggleSelect(image);
      }
      return;
    }

    if (hasTriggeredLongPress.current) {
      hasTriggeredLongPress.current = false;
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected: ONLY LIKE, cancel single tap opening
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      setLastTap(0);
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
      
      if (!hasLiked) {
        onLike(e, image);
        const rect = containerRef.current?.getBoundingClientRect();
        const x = rect ? e.clientX - rect.left : 100;
        const y = rect ? e.clientY - rect.top : 100;
        setBubbles(prev => [...prev, { 
          id: `card-bubble-tap-${Math.random().toString(36).substr(2, 9)}-${Date.now()}-${prev.length}`, 
          x, 
          y 
        }]);
      }
    } else {
      setLastTap(now);
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        onClick(image);
        singleTapTimerRef.current = null;
      }, 280);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (shouldBlur) {
      alert("Aether Protocol: Sharing restricted for premium assets. Please upgrade to Divine Curator status.");
      return;
    }
    
    // If native share is supported, use rich shareAsset with attached media file
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await shareAsset(image, user);
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!image.url || shouldBlur) return;
    setIsDownloading(true);
    try {
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
    } catch (err) {
      console.error("Download failed:", err);
      window.open(image.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const getOptimizedUrl = (url: string, width = 500) => {
    if (!url) return url;
    // General quality and format optimization for all URLs if they support standard params or known CDNs
    if (url.includes('cloudinary.com')) {
      if (url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/q_auto,f_auto,w_${width},c_limit/`);
      }
    }
    
    if (url.includes('images.unsplash.com')) {
      if (url.includes('?')) {
        try {
          const baseUrl = url.split('?')[0];
          const params = new URLSearchParams(url.split('?')[1]);
          params.set('w', width.toString());
          params.set('q', '75');
          params.set('auto', 'format');
          return `${baseUrl}?${params.toString()}`;
        } catch {
          return `${url}&w=${width}&q=75&auto=format`;
        }
      } else {
        return `${url}?auto=format&fit=crop&w=${width}&q=75`;
      }
    }

    if (url.includes('picsum.photos')) {
      const height = Math.round(width * 0.75);
      return url.replace(/\/\d+\/\d+$/, `/${width}/${height}`);
    }
    
    // Fallback for placeholder or missing image signals (optional)
    if (!url.startsWith('http')) return `https://picsum.photos/seed/${image.id}/${width}/${Math.round(width * 0.75)}`;

    return url;
  };

  // Robust uploader metadata with deep fallbacks
  const uploaderName = image.uploaderName || image.uploaderEmail?.split('@')[0] || 'Aether Resident';
  const uploaderPhoto = image.uploaderPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${image.userId || image.id}`;
  
  return (
    <motion.div
      ref={containerRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        y: isSelectMode ? 0 : -4,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ scale: isSelectMode ? 0.97 : 0.98 }}
      onMouseEnter={() => {
        setIsHovered(true);
        if (image.type === 'video') {
          playVideoInstantly();
        }
      }}
      onMouseLeave={handleMouseLeave}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      onTouchMove={checkTouchMove}
      className={cn(
        "relative group cursor-pointer break-inside-avoid rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] w-full max-w-full masonry-item bg-bg-dark/20 select-none",
        isFeatured ? "rounded-[24px]" : "",
        isSelectMode ? "ring-2" : "border border-white/5",
        isSelectMode && isSelected 
          ? "ring-brand-primary border-brand-primary bg-brand-primary/[0.04] scale-[0.98]" 
          : isSelectMode 
            ? "ring-white/10 hover:ring-white/25 scale-[0.99]" 
            : ""
      )}
      onClick={handleImageClick}
    >
      <div 
        className={cn(
          "relative overflow-hidden bg-white/[0.01] transition-colors duration-500 w-full",
          !isLoaded ? (finalRatio === 'portrait' ? "aspect-[9/16] skeleton" : isYoutube ? "aspect-video skeleton" : "aspect-[3/4] skeleton") : "",
          isFeatured ? "aspect-video" : "",
          !naturalRatio && (
            finalRatio === 'portrait' ? "aspect-[9/16]" : 
            isYoutube ? "aspect-video" : 
            finalRatio === 'landscape' ? "aspect-video" : 
            finalRatio === 'square' ? "aspect-square" : 
            finalRatio === 'ultrawide' ? "aspect-[21/9]" : "aspect-[3/4]"
          )
        )}
        style={naturalRatio ? { aspectRatio: `${naturalRatio}` } : undefined}
      >
        <AnimatePresence>
          {showHeartPop && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1], 
                opacity: [0, 1, 1],
              }}
              transition={{ duration: 0.4, ease: "backOut" }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-20 h-20 text-red-500 fill-current drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {isSelectMode && (
          <div className="absolute top-3 left-3 z-[41] pointer-events-none select-none">
            {isSelected ? (
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center border-2 border-black/30 text-bg-dark shadow-[0_4px_16px_rgba(0,0,0,0.6)] animate-in zoom-in-75 duration-200">
                <Check className="w-4.5 h-4.5 stroke-[3.5]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-black/60 backdrop-blur-md transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:border-brand-primary group-hover:scale-105" />
            )}
          </div>
        )}

        {holdProgress > 0 && holdProgress < 100 && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 transition-all duration-150">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="var(--color-brand-primary, #ffd700)"
                  strokeWidth="4"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - holdProgress / 100)}`}
                />
              </svg>
              {user?.isAdmin && !isSelectMode ? (
                <Check className="w-7 h-7 text-brand-primary animate-pulse stroke-[3]" />
              ) : (
                <Play className="w-7 h-7 fill-current text-brand-primary animate-pulse" />
              )}
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-black/80 border border-white/20 backdrop-blur-md shadow-2xl mt-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                {user?.isAdmin && !isSelectMode ? 'Hold to Select...' : 'Hold to Preview...'}
              </span>
            </div>
          </div>
        )}
 
        {/* Low-resolution blur-up loading placeholder */}
        {!isLoaded && !shouldBlur && (
          <img
            src={getOptimizedUrl(image.type === 'video' ? (image.thumbnailUrl || image.url) : image.url, 20)}
            alt=""
            aria-hidden="true"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg' viewBox%3D'0 0 300 400'%3E%3Crect width%3D'100%25' height%3D'100%25' fill%3D'%231c1c1e'%2F%3E%3C%2Fsvg%3E";
            }}
            className="w-full h-full object-cover absolute inset-0 blur-xl scale-110 opacity-80 pointer-events-none transition-opacity duration-500"
          />
        )}

        <img
          src={getOptimizedUrl(image.type === 'video' ? (image.thumbnailUrl || `https://picsum.photos/seed/${image.id}/800/600?blur=4`) : image.url)}
          alt={image.title}
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setNaturalRatio(img.naturalWidth / img.naturalHeight);
            }
            setIsLoaded(true);
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://picsum.photos/seed/broken/800/600?blur=4';
            setIsLoaded(true);
          }}
          className={cn(
            "w-full h-full object-cover transition-all duration-700 ease-out transform-gpu absolute inset-0",
            isLoaded ? "opacity-100" : "opacity-0",
            shouldBlur ? "blur-2xl scale-110 opacity-60" : "group-hover:scale-105"
          )}
        />

        {image.type === 'video' && isDirectVideo && shouldRenderVideo && (
          <video
            ref={videoRef}
            src={image.url}
            poster={image.thumbnailUrl || undefined}
            muted={isMuted}
            playsInline
            loop
            className={cn(
              "w-full h-full object-cover absolute inset-0 transition-all duration-700 ease-out transform-gpu z-10 group-hover:scale-105",
              isVideoActive ? "opacity-100" : "opacity-0"
            )}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              if (video.videoWidth && video.videoHeight) {
                setNaturalRatio(video.videoWidth / video.videoHeight);
              }
            }}
            onCanPlay={() => setIsVideoActive(true)}
          />
        )}

        {image.type === 'video' && isYoutube && shouldRenderVideo && (
          <iframe
            ref={iframeRef}
            src={getCardYoutubeEmbedUrl(image.url)}
            allow="autoplay; encrypted-media"
            title={image.title}
            className="w-full h-full object-cover absolute inset-0 border-0 z-10 pointer-events-none transition-all duration-700 ease-out transform-gpu group-hover:scale-105"
          />
        )}

        {/* Floating Type Icon */}
        {image.type === 'video' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
            <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
        )}

        {/* Floating Actions on Top Right - Includes premium indication & preview trigger */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-40">
          {image.isPremium && (
            <div className="p-1 rounded-md bg-brand-primary/40 backdrop-blur-md border border-brand-primary/20 text-white flex items-center justify-center">
              <Sparkles className="w-3 h-3" />
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClick(image);
            }}
            className="p-1.5 rounded-md bg-black/50 backdrop-blur-md border border-white/15 text-brand-primary hover:bg-brand-primary hover:text-bg-dark transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 pointer-events-auto shadow-md"
            title="Preview Fullscreen"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Dedicated compact/minimized line connected to the post */}
      <div 
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-black/40 border-t border-white/5 select-none text-[10px] gap-2"
        )}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Left: Minimized Uploader info / Category */}
        <div 
          className={cn(
            "flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity cursor-pointer",
            isSelectMode && "pointer-events-none opacity-40"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (image.userId) window.location.href = `/profile/${image.userId}`;
          }}
        >
          {uploaderPhoto ? (
            <img src={uploaderPhoto} alt="" referrerPolicy="no-referrer" className="w-4 h-4 rounded-full border border-white/10 shrink-0 object-cover" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
              <UserIcon className="w-1.5 h-1.5 text-text-dim/40" />
            </div>
          )}
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[8px] font-semibold tracking-wider text-white/90 truncate max-w-[65px]">
              {uploaderName}
            </span>
            <span className="text-[7px] font-bold text-brand-primary/80 uppercase tracking-widest truncate max-w-[65px]">
              {image.category}
            </span>
          </div>
        </div>

        {/* Right: Minimized Icons in a dedicated line */}
        <div className="flex items-center gap-2.5 shrink-0 text-white/60">
          {/* Like Button with Count */}
          <button 
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 hover:text-red-400 transition-colors active:scale-75",
              hasLiked ? "text-red-500 hover:text-red-600" : "text-white/60 hover:text-white",
              isSelectMode && "pointer-events-none opacity-40"
            )}
            title="Like"
          >
            <Heart className={cn("w-3.5 h-3.5", hasLiked && "fill-current")} />
            <span className="text-[9px] font-bold tabular-nums">
              {image.likes || 0}
            </span>
          </button>

          {/* Registry (Share) */}
          <button 
            onClick={handleShare}
            className={cn(
              "p-0.5 hover:text-brand-primary transition-colors active:scale-75 text-white/60 hover:text-white",
              isSelectMode && "pointer-events-none opacity-40"
            )}
            title="Registry (Share)"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Save (Collection) */}
          <button 
            onClick={(e) => { e.stopPropagation(); onSave?.(e, image); }}
            className={cn(
              "p-0.5 hover:text-brand-primary transition-colors active:scale-75 text-white/60 hover:text-white",
              isSaved ? "text-brand-primary hover:text-brand-primary/80" : "text-white/60 hover:text-white",
              isSelectMode && "pointer-events-none opacity-40"
            )}
            title="Save to Collection"
          >
            <BookmarkPlus className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
          </button>

          {/* Download */}
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className={cn(
              "p-0.5 hover:text-brand-primary transition-colors active:scale-75 text-white/60 hover:text-white disabled:opacity-50",
              isDownloading && "text-brand-primary animate-pulse",
              isSelectMode && "pointer-events-none opacity-40"
            )}
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ShareModal 
        image={image} 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        user={user} 
      />
    </motion.div>
  );
});
