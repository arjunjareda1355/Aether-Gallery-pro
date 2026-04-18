import React, { useState, useRef, useEffect } from 'react';
import { cn, formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { ZoomIn, ZoomOut, Maximize2, X, Heart, Share2, Download, Copy, ExternalLink, Calendar, Tag, Flag, BookmarkPlus, MessageSquare, Clock, Trash2, AlertCircle, Sparkles, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Image, User } from '../../types';
import CommentSection from './CommentSection';
import CollectionModal from './CollectionModal';
import { db, COLLECTIONS } from '../../lib/firebase';
import { addDoc, collection, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

interface ImageModalProps {
  image: Image | null;
  onClose: () => void;
  onLike: (e: React.MouseEvent, image: Image) => void;
  hasLiked: boolean;
  user: User | null;
  onNavigate?: (direction: 'next' | 'prev') => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export default function ImageModal({ image, onClose, onLike, hasLiked, user, onNavigate, hasNext, hasPrev }: ImageModalProps) {
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [reportTypeOpen, setReportTypeOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileUiHidden, setIsMobileUiHidden] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const mediaRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<number>(0);

  const dragX = useMotionValue(0);
  const swipeOpacity = useTransform(dragX, [-100, 0, 100], [0.5, 1, 0.5]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext) onNavigate?.('next');
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate?.('prev');
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasNext, hasPrev, onNavigate, onClose]);

  if (!image) return null;

  const toggleFullscreen = () => {
    if (window.innerWidth < 768) {
      setIsMobileUiHidden(!isMobileUiHidden);
      return;
    }
    if (!document.fullscreenElement) {
      mediaRef.current?.requestFullscreen().catch(err => {
        setIsMobileUiHidden(true);
      });
    } else {
      document.exitFullscreen();
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

  const handlePinchZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      setZoomLevel(prev => Math.min(4, Math.max(1, prev + delta * 0.01)));
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
        setZoomLevel(prev => Math.min(4, Math.max(1, prev + delta * 0.01)));
        lastTouchRef.current = distance;
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = 0;
  };

  const getVideoEmbedUrl = (url: string) => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    
    return null;
  };

  const isDirectVideo = /\.(mp4|webm|ogg|mov)$/i.test(image.url);
  const embedUrl = getVideoEmbedUrl(image.url);

  const handleDelete = async () => {
    if (!user?.isAdmin || !window.confirm("Are you sure you want to permanently delete this asset?")) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.IMAGES, image.id));
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to delete image.");
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: image.title,
          text: image.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownload = async () => {
    if (!image.url) return;
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
          className="fixed inset-0 bg-black/95 backdrop-blur-md cursor-pointer"
        />

        {/* Universal Close Button - Refined & Accessible */}
        <motion.button
          initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
          onClick={onClose}
          className="fixed top-4 left-4 md:top-6 md:left-6 lg:top-8 lg:left-8 z-[150] w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-xl text-white hover:bg-brand-primary hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-90 group flex items-center justify-center border border-white/20"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform duration-300" />
          <span className="sr-only">Close</span>
        </motion.button>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            "relative w-full h-[100dvh] md:h-[90vh] md:max-h-[850px] max-w-7xl glass-dark md:rounded-[40px] overflow-hidden flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,1)] bg-card-dark z-[101]",
            isMobileUiHidden && "h-screen"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Internal Close Button (Mobile Only) - Fallback */}
          {!isMobileUiHidden && (
            <button
              onClick={onClose}
              className="md:hidden absolute top-4 left-4 z-[110] p-3 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* Media Section */}
          <div 
            ref={mediaRef}
            className={cn(
              "flex-none lg:flex-1 bg-black flex items-center justify-center p-0 md:p-6 relative group overflow-hidden select-none transition-all duration-500",
              isMobileUiHidden ? "h-screen" : "h-[45vh] lg:h-full"
            )}
            onWheel={handlePinchZoom}
            onTouchMove={handleTouchZoom}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => isProtected && e.preventDefault()}
          >
            {isPremiumLocked ? (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Premium Sanctuary Asset</h3>
                  <p className="text-text-dim text-sm max-w-xs mx-auto leading-relaxed">This exclusive moment is reserved for Divine Curators. Upgrade your presence to unlock the full clarity.</p>
                </div>
                {!isMobileUiHidden && (
                  <Link 
                    to="/upgrade" 
                    onClick={onClose}
                    className="px-10 py-4 bg-white text-bg-dark rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                  >
                    Upgrade to View
                  </Link>
                )}
              </div>
            ) : null}

            {image.type === 'video' ? (
               <div className="w-full h-full flex items-center justify-center bg-black relative">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="absolute inset-0 w-full h-full md:relative md:rounded-2xl border-0 shadow-2xl"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={image.title}
                    />
                  ) : isDirectVideo ? (
                    <video
                      src={image.url}
                      poster={image.thumbnailUrl}
                      controls
                      autoPlay
                      className="absolute inset-0 w-full h-full md:relative md:object-contain md:rounded-2xl"
                    />
                  ) : (
                    <div className="p-10 text-center space-y-4">
                       <AlertCircle className="w-12 h-12 text-brand-primary mx-auto" />
                       <p className="text-white font-bold">Unsupported Video Format</p>
                       <p className="text-xs text-text-dim">Try a YouTube, Vimeo, or a direct link (.mp4, .webm)</p>
                       <a href={image.url} target="_blank" className="inline-block mt-4 px-6 py-2 bg-brand-primary rounded-full text-xs font-bold text-white uppercase tracking-widest">Open in External Player</a>
                    </div>
                  )}
               </div>
            ) : (
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                <motion.img
                  key={image.id}
                  style={{ x: dragX, opacity: swipeOpacity, cursor: zoomLevel > 1 ? 'grab' : 'zoom-in' }}
                  drag={zoomLevel > 1 ? true : "x"}
                  dragConstraints={zoomLevel > 1 ? { left: -500, right: 500, top: -500, bottom: 500 } : { left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  animate={{ scale: zoomLevel }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  src={image.url}
                  alt={image.title}
                  draggable={!isProtected}
                  referrerPolicy="no-referrer"
                  onLoad={() => setImageError(false)}
                  onError={() => setImageError(true)}
                  className={cn(
                    "max-w-full max-h-full object-contain cursor-zoom-in transition-opacity duration-300",
                    imageError ? "opacity-20" : "opacity-100",
                    isProtected && "pointer-events-none"
                  )}
                  onClick={() => !isProtected && setZoomLevel(prev => prev === 1 ? 2 : 1)}
                />

                {isProtected && !isPremiumLocked && (
                  <div 
                    className="absolute inset-0 z-40 cursor-not-allowed" 
                    onContextMenu={(e) => e.preventDefault()}
                    aria-hidden="true"
                  />
                )}
                
                {/* Fullscreen Toggle / Immersive Mode */}
                <button 
                  onClick={toggleFullscreen}
                  className={cn(
                    "absolute top-6 right-6 z-40 p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white transition-all hover:bg-brand-primary active:scale-90 shadow-2xl flex items-center justify-center",
                    isMobileUiHidden ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  )}
                  title={isMobileUiHidden ? "Exit Immersive Mode" : "Enter Immersive Mode"}
                >
                  {isFullscreen || isMobileUiHidden ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>

                {/* Mobile Specific Indicator (Helpful for first-time users) */}
                {!isMobileUiHidden && (
                  <div className="md:hidden absolute bottom-6 right-6 z-40 p-3 rounded-full bg-brand-primary text-white shadow-lg animate-bounce pointer-events-none opacity-20">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                )}

                {/* Navigation Arrows */}
                {hasPrev && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate?.('prev'); }}
                    className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white transition-all md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center active:scale-90 shadow-2xl",
                      isMobileUiHidden ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                    aria-label="Previous post"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {hasNext && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate?.('next'); }}
                    className={cn(
                      "absolute right-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white transition-all md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center active:scale-90 shadow-2xl",
                      isMobileUiHidden ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                    aria-label="Next post"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
                
                {/* Zoom Controls */}
                {!isProtected && (
                  <div className={cn(
                    "absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/20 p-1.5 rounded-2xl transition-opacity z-30 shadow-2xl",
                    isMobileUiHidden ? "opacity-0 pointer-events-none" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  )}>
                    <button 
                      onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                      className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-white w-12 text-center uppercase tracking-widest">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button 
                      onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}
                      className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button 
                      onClick={() => setZoomLevel(1)}
                      className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {imageError && (
               <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 z-10 bg-black/60 backdrop-blur-sm">
                  <div className="p-4 bg-red-500/10 rounded-3xl">
                    <AlertCircle className="w-8 h-8 md:w-12 md:h-12 text-red-500" />
                  </div>
                  <div className="max-w-xs space-y-2">
                    <h3 className="text-lg md:text-xl font-bold text-white">Visibility Issue</h3>
                    <p className="text-xs md:text-sm text-text-dim leading-relaxed">
                      Source is blocking display or link has expired. 
                    </p>
                  </div>
               </div>
            )}
            
            {/* Source Link Overlay */}
            <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-white"
              >
                <ExternalLink className="w-3 h-3" /> View Source
              </a>
            </div>
          </div>

          {/* Sidebar Area */}
          <motion.div 
            animate={{ x: isMobileUiHidden ? 480 : 0 }}
            className={cn(
              "w-full lg:w-[400px] xl:w-[480px] flex-none flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto bg-card-dark md:bg-transparent custom-scrollbar transition-all duration-300",
              isMobileUiHidden && "hidden lg:flex"
            )}
          >
            <div className="p-5 md:p-8 lg:p-10 space-y-6 md:space-y-10 flex-1">
              {/* Header Info */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-full">
                    {image.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-text-dim text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> {formatDate(image.timestamp)}
                  </span>
                </div>
                <h2 className="text-xl md:text-3xl font-display font-extrabold tracking-tight text-white leading-tight">
                  {image.title}
                </h2>
                <p className="text-text-dim text-xs md:text-sm leading-relaxed">
                  {image.description}
                </p>
              </div>

              {/* Primary Actions Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2 md:gap-3 py-6 border-y border-white/5">
                <button
                  onClick={(e) => onLike(e, image)}
                  className={cn(
                    "col-span-2 flex items-center justify-center gap-2 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold transition-all active:scale-95",
                    hasLiked
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                      : "bg-white/5 text-text-main border border-white/10 hover:bg-white/10"
                  )}
                >
                  <Heart className={cn("w-5 h-5", hasLiked && "fill-current")} />
                  <span className="text-sm">{hasLiked ? 'Liked' : 'Like'}</span>
                </button>

                <button
                  onClick={() => setIsCollectionsOpen(true)}
                  className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-main hover:bg-white/10 transition-all active:scale-90"
                  title="Save"
                >
                  <BookmarkPlus className="w-5 h-5" />
                </button>

                <button
                  onClick={handleShare}
                  className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-main hover:bg-white/10 transition-all active:scale-90"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                {!embedUrl && !isProtected && (
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={cn(
                        "h-12 md:h-14 rounded-xl md:rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all active:scale-90",
                        isDownloading && "opacity-50"
                    )}
                    title="Download"
                  >
                    {isDownloading ? (
                      <div className="w-4 h-4 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                )}
                
                {isProtected && !embedUrl && (
                  <div className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-dim opacity-40 cursor-not-allowed" title="Download restricted">
                    <Download className="w-5 h-5" />
                  </div>
                )}
                
                <div className="relative">
                  <button
                    onClick={() => setReportTypeOpen(!reportTypeOpen)}
                    className={cn(
                        "w-full h-12 md:h-14 rounded-xl md:rounded-2xl border flex items-center justify-center transition-all active:scale-90",
                        reportTypeOpen ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-white/5 border-white/10 text-text-dim hover:text-red-400 hover:bg-red-400/5"
                    )}
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                  {reportTypeOpen && (
                    <div className="absolute bottom-full right-0 mb-4 w-40 bg-card-dark border border-border-dark rounded-2xl shadow-2xl py-2 overflow-hidden flex flex-col z-50">
                      {(['broken', 'inappropriate', 'spam'] as const).map((t) => (
                         <button 
                          key={t}
                          onClick={() => submitReport(t)}
                          className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider hover:bg-red-400/10 text-red-100 transition-colors"
                         >
                          Report {t}
                         </button>
                      ))}
                    </div>
                  )}
                </div>

                {user?.isAdmin && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              {/* Tags */}
              {image.tags.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim">
                    <Tag className="w-3.5 h-3.5" /> Discovery Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 md:px-4 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-text-dim uppercase tracking-widest hover:text-white hover:border-white/20 transition-all cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment Section */}
              <div className="pt-2 md:pt-4 pb-10">
                <CommentSection imageId={image.id} user={user} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      {isCollectionsOpen && <CollectionModal imageId={image.id} user={user} onClose={() => setIsCollectionsOpen(false)} />}
    </AnimatePresence>
  );
}
