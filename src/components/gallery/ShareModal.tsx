import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Play, 
  Youtube, 
  FileText, 
  Image as ImageIcon,
  MessageCircle,
  Send,
  Pin
} from 'lucide-react';
import { Image, User } from '../../types';
import { 
  buildShareContent, 
  getSocialShareLinks, 
  shareAsset, 
  copyImageBitmapToClipboard,
  getBaseAppUrl,
  isYouTubeUrl,
  getYouTubeThumbnail
} from '../../utils/shareUtils';
import { copyToClipboard, cn } from '../../lib/utils';
import { hapticSuccess, hapticSelection, hapticSparkle } from '../../utils/haptics';

interface ShareModalProps {
  image: Image | null;
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export default function ShareModal({ image, isOpen, onClose, user }: ShareModalProps) {
  const [copiedType, setCopiedType] = useState<'link' | 'caption' | 'image' | null>(null);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [isSharingNative, setIsSharingNative] = useState(false);

  if (!isOpen || !image) return null;

  const content = buildShareContent(image);
  const socialLinks = getSocialShareLinks(image);
  const isYt = isYouTubeUrl(image.url);
  const ytThumb = isYt ? getYouTubeThumbnail(image.url) : null;
  const isVideo = image.type === 'video' || isYt;
  const displayThumb = ytThumb || image.url;

  const handleCopyLink = async () => {
    hapticSelection();
    const success = await copyToClipboard(content.postUrl);
    if (success) {
      hapticSuccess();
      setCopiedType('link');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleCopyCaption = async () => {
    hapticSelection();
    const success = await copyToClipboard(content.text);
    if (success) {
      hapticSuccess();
      setCopiedType('caption');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleCopyImageToClipboard = async () => {
    if (!displayThumb) return;
    hapticSelection();
    setIsCopyingImage(true);
    const success = await copyImageBitmapToClipboard(displayThumb);
    setIsCopyingImage(false);
    if (success) {
      hapticSuccess();
      setCopiedType('image');
      setTimeout(() => setCopiedType(null), 2500);
    } else {
      // Fallback: Copy link
      await handleCopyLink();
    }
  };

  const handleNativeShare = async () => {
    hapticSelection();
    setIsSharingNative(true);
    await shareAsset(image, user);
    setIsSharingNative(false);
    hapticSparkle();
  };

  const handleDownload = async () => {
    hapticSelection();
    if (!image.url) return;
    if (isYt) {
      window.open(`https://en.savefrom.net/1-youtube-video-downloader-386/?url=${encodeURIComponent(image.url)}`, '_blank');
      return;
    }
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(image.title || 'aether_creation').replace(/\s+/g, '_')}_Aether.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      hapticSuccess();
    } catch (e) {
      console.warn("Download failed:", e);
    }
  };

  const socialItems = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
      url: socialLinks.whatsapp
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30',
      url: socialLinks.telegram
    },
    {
      name: 'X (Twitter)',
      icon: ExternalLink,
      color: 'bg-white/10 text-white border-white/20 hover:bg-white/20',
      url: socialLinks.twitter
    },
    {
      name: 'Pinterest',
      icon: Pin,
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30',
      url: socialLinks.pinterest
    },
    {
      name: 'Reddit',
      icon: ExternalLink,
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
      url: socialLinks.reddit
    },
    {
      name: 'Facebook',
      icon: ExternalLink,
      color: 'bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30',
      url: socialLinks.facebook
    }
  ];

  return (
    <AnimatePresence>
      <div 
        id="share-modal-overlay"
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          id="share-modal-content"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-lg bg-[#111116] border border-white/15 rounded-3xl p-5 md:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                  Share Creation
                  {isVideo && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {isYt ? 'YouTube' : 'Video'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-white/50">Send media with instant preview and direct link</p>
              </div>
            </div>

            <button
              id="share-modal-close-btn"
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media Card Preview */}
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
              {displayThumb ? (
                <img 
                  src={displayThumb} 
                  alt={image.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              {isVideo && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  {isYt ? (
                    <Youtube className="w-5 h-5 text-red-500 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 text-brand-primary fill-current" />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{image.title || 'Untitled Sanctuary Asset'}</h4>
              <p className="text-xs text-brand-primary font-mono truncate">{content.postUrl}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-md">
                  {image.category || 'General'}
                </span>
                {(image.uploaderName || image.uploaderEmail) && (
                  <span className="text-[10px] text-white/40 truncate">
                    by {image.uploaderName || image.uploaderEmail}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Native System Share Feature Button */}
          <div className="mt-4">
            <button
              id="share-modal-native-btn"
              onClick={handleNativeShare}
              disabled={isSharingNative}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-primary via-amber-400 to-yellow-500 hover:brightness-110 text-bg-dark font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_8px_25px_rgba(var(--color-brand-primary-rgb,255,215,0),0.35)] transition-all active:scale-[0.98] cursor-pointer"
            >
              <Share2 className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>{isSharingNative ? 'Opening Native Share...' : 'Share Media & Link (Apps & AirDrop)'}</span>
            </button>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {/* Copy Link */}
            <button
              id="share-modal-copy-link-btn"
              onClick={handleCopyLink}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer",
                copiedType === 'link'
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10 hover:border-white/20"
              )}
            >
              {copiedType === 'link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="text-[11px]">{copiedType === 'link' ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            {/* Copy Image / Thumbnail */}
            <button
              id="share-modal-copy-image-btn"
              onClick={handleCopyImageToClipboard}
              disabled={isCopyingImage}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer",
                copiedType === 'image'
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10 hover:border-white/20"
              )}
            >
              {copiedType === 'image' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <ImageIcon className="w-4 h-4 text-brand-primary" />
              )}
              <span className="text-[11px]">
                {isCopyingImage ? 'Copying...' : copiedType === 'image' ? 'Image Copied!' : 'Copy Image'}
              </span>
            </button>

            {/* Copy Caption */}
            <button
              id="share-modal-copy-caption-btn"
              onClick={handleCopyCaption}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer",
                copiedType === 'caption'
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10 hover:border-white/20"
              )}
            >
              {copiedType === 'caption' ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-cyan-400" />}
              <span className="text-[11px]">{copiedType === 'caption' ? 'Text Copied!' : 'Copy Caption'}</span>
            </button>
          </div>

          {/* Social Platforms Destination */}
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">Send Directly To</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {socialItems.map((soc, idx) => {
                const Icon = soc.icon;
                return (
                  <a
                    key={`soc-share-${soc.name}-${idx}`}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => hapticSparkle()}
                    className={cn(
                      "p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all group active:scale-95",
                      soc.color
                    )}
                  >
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-bold truncate max-w-full">{soc.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Direct URL input & Download */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/70 truncate select-all">
              {content.postUrl}
            </div>

            <button
              id="share-modal-download-btn"
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer flex-shrink-0"
              title="Download Asset"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Save File</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
