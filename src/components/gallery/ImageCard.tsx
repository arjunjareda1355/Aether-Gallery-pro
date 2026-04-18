import { Heart, Share2, ZoomIn, AlertCircle, Play, Sparkles, Download, BookmarkPlus } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Image, User } from '../../types';

interface ImageCardProps {
  image: Image;
  user: User | null;
  onClick: (image: Image) => void;
  onLike: (e: React.MouseEvent, image: Image) => void;
  onSave?: (e: React.MouseEvent, image: Image) => void;
  hasLiked: boolean;
  key?: React.Key;
}

export default function ImageCard({ image, user, onClick, onLike, onSave, hasLiked }: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const shouldBlur = image.isPremium && !user?.isPremium && !image.isSample;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/?id=${image.id}`;
      if (navigator.share) {
        await navigator.share({
          title: image.title,
          text: image.description,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Sharing failed:', err);
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-5 group cursor-pointer break-inside-avoid bg-card-dark border border-border-dark rounded-2xl overflow-hidden hover:border-brand-primary/50 transition-colors"
      onClick={() => onClick(image)}
    >
      <div className={cn(
        "relative overflow-hidden bg-bg-dark transition-all duration-500",
        !isLoaded ? "aspect-[3/4] animate-pulse" : ""
      )}>
        <img
          src={image.type === 'video' ? (image.thumbnailUrl || `https://picsum.photos/seed/${image.id}/800/600?blur=4`) : image.url}
          alt={image.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://picsum.photos/seed/broken/800/600?blur=4';
            const parent = target.parentElement;
            if (parent) {
              const overlay = parent.querySelector('.broken-overlay');
              if (overlay) overlay.classList.remove('hidden');
            }
          }}
          className={cn(
            "w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110",
            isLoaded ? "opacity-100" : "opacity-0",
            shouldBlur && "blur-xl scale-125 opacity-50"
          )}
        />

        {/* Action Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 md:group-hover:opacity-100 lg:group-hover:opacity-100 transition-opacity duration-300">
          {/* Top Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button 
              onClick={handleShare}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-brand-primary transition-all"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSave?.(e, image); }}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-brand-primary transition-all"
              title="Save to Collection"
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
            {!shouldBlur && (
               <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-brand-primary transition-all disabled:opacity-50"
                title="Download"
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <div className="absolute top-3 left-3">
             <div className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white">
                <ZoomIn className="w-4 h-4" />
             </div>
          </div>
        </div>

        {image.isPremium && (
          <div className="absolute top-3 left-3 z-10">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md",
              image.isSample 
                ? "bg-green-500/20 border-green-500/40 text-green-400" 
                : "bg-amber-500/20 border-amber-500/40 text-amber-400"
            )}>
              <Sparkles className="w-3 h-3" />
              {image.isSample ? "Sample" : "Premium"}
            </div>
          </div>
        )}

        {shouldBlur && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto opacity-80" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white">Unlock Premium</p>
            </div>
          </div>
        )}

        {image.type === 'video' && !shouldBlur && (
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 text-brand-primary shadow-[0_0_30px_rgba(242,125,38,0.3)] group-hover:scale-110 transition-transform">
                 <Play className="w-6 h-6 fill-current" />
              </div>
           </div>
        )}

        {/* Broken link indicator */}
        <div className="broken-overlay hidden absolute inset-0 bg-red-500/10 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="flex flex-col items-center gap-1.5 opacity-60">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-red-200">Invalid Source</span>
           </div>
        </div>
        
        {/* Subtle Overlay on Image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Zoom Icon - Always visible on mobile, hover on desktop */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 lg:opacity-0 transition-opacity md:group-hover:opacity-100 lg:group-hover:opacity-100">
          <div className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white">
            <ZoomIn className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="p-4 flex justify-between items-center bg-card-dark">
        <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-sm font-bold text-white truncate leading-tight mb-0.5">{image.title}</h3>
            <span className="text-[10px] font-extrabold text-brand-primary uppercase tracking-wider opacity-80">{image.category}</span>
        </div>
        <div className="flex items-center gap-2">
            {/* Quick Actions (Mobile fallback or consistent access) */}
            <div className="flex md:hidden items-center gap-1.5 mr-2">
                <button 
                  onClick={handleShare}
                  className="p-1.5 text-text-dim hover:text-white"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
            </div>
            
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onLike(e, image);
                }}
                className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90",
                    hasLiked ? "bg-red-500/10 text-red-500" : "bg-white/5 text-text-dim hover:text-red-400"
                )}
            >
                <Heart className={cn("w-4.5 h-4.5", hasLiked && "fill-current")} />
            </button>
            <span className="text-xs font-bold text-text-main tabular-nums">{image.likes >= 1000 ? (image.likes / 1000).toFixed(1) + 'k' : image.likes}</span>
        </div>
      </div>
    </motion.div>
  );
}
