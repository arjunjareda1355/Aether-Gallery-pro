import { Image, User } from '../types';
import { copyToClipboard } from '../lib/utils';
import { trackActivity } from '../lib/recommendation';
import { hapticSparkle, hapticSuccess } from './haptics';

export const FALLBACK_APP_LINK = 'https://aethergallerypro.vercel.app';
export const APP_LINK = FALLBACK_APP_LINK;

/**
 * Returns the current application base URL dynamically
 */
export function getBaseAppUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    // If not a local dev port or if user opens in iframe, return origin
    if (!origin.includes('localhost:3000')) {
      return origin.replace(/\/$/, '');
    }
  }
  return FALLBACK_APP_LINK;
}

export interface ShareResult {
  success: boolean;
  method: 'native-file' | 'native-share' | 'clipboard';
  message: string;
  shareUrl: string;
  hasMediaFile?: boolean;
}

/**
 * Checks if a given media URL is a YouTube video
 */
export function isYouTubeUrl(url?: string | null): boolean {
  if (!url) return false;
  return /youtube\.com|youtu\.be/i.test(url);
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Gets high-resolution thumbnail URL for YouTube videos
 */
export function getYouTubeThumbnail(url?: string | null): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Returns formatted share text with rich context and direct clickable links:
 * - Title
 * - Description (if available)
 * - Direct Post Link (clickable in all messaging platforms)
 * - Original Video Link (for YouTube)
 * - Application Link
 */
export function buildShareContent(image: Image) {
  const baseAppUrl = getBaseAppUrl();
  const postUrl = `${baseAppUrl}/?post=${encodeURIComponent(image.id)}`;
  const originalLink = image.externalLink || (image.url && image.url.startsWith('http') && !image.url.includes('firebasestorage') && !image.url.includes('blob:') ? image.url : null);
  const isYouTube = isYouTubeUrl(image.url) || isYouTubeUrl(originalLink);

  const title = (image.title && image.title.trim()) || 'Aether Visual Creation';
  const description = (image.description && image.description.trim()) || '';
  const isVideo = image.type === 'video' || /\.(mp4|webm|ogg|mov)$/i.test(image.url || '');

  if (isYouTube) {
    const ytUrl = isYouTubeUrl(image.url) ? image.url : (originalLink || image.url);
    const textParts: string[] = [
      `🎬 ${title}`,
      description && description !== title ? `${description}` : '',
      `▶️ YouTube Video: ${ytUrl}`,
      `🔗 View on Aether: ${postUrl}`,
      `🌐 Aether Sanctuary: ${baseAppUrl}`
    ].filter(Boolean);

    return {
      isYouTube: true,
      isVideo: true,
      postUrl,
      targetUrl: ytUrl || postUrl,
      title,
      text: textParts.join('\n\n')
    };
  }

  // Direct Image or Direct MP4 Video
  const icon = isVideo ? '🎥' : '✨';
  const textParts: string[] = [
    `${icon} ${title}`,
    description && description !== title ? `${description}` : '',
    `🔗 View Post: ${postUrl}`,
    `🌐 Aether Sanctuary: ${baseAppUrl}`
  ].filter(Boolean);

  return {
    isYouTube: false,
    isVideo,
    postUrl,
    targetUrl: postUrl,
    title,
    text: textParts.join('\n\n')
  };
}

/**
 * Safely fetches a media URL as a Blob
 */
export async function getMediaBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    return await res.blob();
  } catch (err) {
    // If CORS is blocked on direct fetch, return null
    return null;
  }
}

/**
 * Creates a real File object for the image or video to attach to Web Share API
 */
export async function createMediaFileForSharing(image: Image): Promise<File | null> {
  let targetMediaUrl = image.url;
  const isYt = isYouTubeUrl(image.url);
  
  if (isYt) {
    const ytThumb = getYouTubeThumbnail(image.url);
    if (ytThumb) {
      targetMediaUrl = ytThumb;
    }
  }

  if (!targetMediaUrl) return null;

  try {
    const blob = await getMediaBlob(targetMediaUrl);
    if (!blob) return null;

    // Skip if blob is excessively large (>35MB) to avoid mobile OS memory crashes
    if (blob.size > 35 * 1024 * 1024) return null;

    let mimeType = blob.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = isYt || image.type !== 'video' ? 'image/jpeg' : 'video/mp4';
    }

    let ext = mimeType.split('/')[1] || 'jpg';
    if (ext.includes(';')) ext = ext.split(';')[0];
    if (ext === 'quicktime') ext = 'mov';

    const safeTitle = (image.title || 'aether_asset')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const filename = `${safeTitle}_aether.${ext}`;

    return new File([blob], filename, { type: mimeType });
  } catch (e) {
    console.warn("Could not generate media file for sharing:", e);
    return null;
  }
}

/**
 * Copies real image bitmap to the system clipboard (PNG format)
 */
export async function copyImageBitmapToClipboard(imageUrl: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !navigator.clipboard || !window.ClipboardItem) {
      return false;
    }

    // Convert image to PNG using Canvas to satisfy ClipboardItem requirements
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG conversion failed'));
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Image failed to load for clipboard copying'));
      img.src = imageUrl;
    });

    await navigator.clipboard.write([
      new window.ClipboardItem({ 'image/png': pngBlob })
    ]);
    hapticSuccess();
    return true;
  } catch (err) {
    console.warn('Direct image clipboard copy failed:', err);
    return false;
  }
}

/**
 * Generates direct share URLs for popular social platforms
 */
export function getSocialShareLinks(image: Image) {
  const content = buildShareContent(image);
  const encodedText = encodeURIComponent(content.text);
  const encodedUrl = encodeURIComponent(content.postUrl);
  const encodedTitle = encodeURIComponent(content.title);
  const tags = (image.tags || ['AetherSanctuary', 'Art', 'Design']).slice(0, 3).map(t => t.replace(/\s+/g, '')).join(',');
  
  // Media URL for Pinterest
  let mediaUrl = image.url;
  if (isYouTubeUrl(image.url)) {
    mediaUrl = getYouTubeThumbnail(image.url) || image.url;
  }
  const encodedMedia = encodeURIComponent(mediaUrl || '');

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`${content.title}\n\n${content.text}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`✨ ${content.title}`)}&url=${encodedUrl}&hashtags=${encodeURIComponent(tags)}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedMedia}&description=${encodedTitle}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  };
}

/**
 * Executes high-fidelity sharing:
 * - Attempts to attach the actual Image / Video File alongside the post link
 * - Fallbacks smoothly to rich native share and clipboard copy
 */
export async function shareAsset(image: Image, user?: User | null): Promise<ShareResult> {
  const content = buildShareContent(image);

  if (user) {
    trackActivity(user.uid, [image.category, ...(image.tags || [])], 'share');
  }

  // Pre-copy direct post link to clipboard so the user always has it instantly
  try {
    await copyToClipboard(content.postUrl);
  } catch (e) {
    // Non-blocking
  }

  // 1. Native Web Share API with Media File + Rich Text + URL
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // Try generating real media File
      const mediaFile = await createMediaFileForSharing(image);

      if (mediaFile && navigator.canShare && navigator.canShare({ files: [mediaFile] })) {
        try {
          await navigator.share({
            files: [mediaFile],
            title: content.title,
            text: `${content.title}\n\n🔗 ${content.postUrl}`,
            url: content.postUrl
          });
          hapticSparkle();
          return {
            success: true,
            method: 'native-file',
            message: 'Shared with media asset & post link!',
            shareUrl: content.postUrl,
            hasMediaFile: true
          };
        } catch (fileErr: any) {
          if (fileErr.name === 'AbortError') {
            return {
              success: true,
              method: 'native-file',
              message: 'Share dismissed.',
              shareUrl: content.postUrl
            };
          }
          // Some clients fail if both 'url' and 'files' exist, retry with files and embedded link in text
          await navigator.share({
            files: [mediaFile],
            title: content.title,
            text: `${content.title}\n\n🔗 ${content.postUrl}\n\n${content.text}`
          });
          hapticSparkle();
          return {
            success: true,
            method: 'native-file',
            message: 'Shared with media asset & post link!',
            shareUrl: content.postUrl,
            hasMediaFile: true
          };
        }
      }

      // Standard Native Share with URL & Text
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.postUrl
      });
      hapticSparkle();
      return {
        success: true,
        method: 'native-share',
        message: 'Shared successfully with direct post link!',
        shareUrl: content.postUrl
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: true,
          method: 'native-share',
          message: 'Share dismissed.',
          shareUrl: content.postUrl
        };
      }
      console.warn('Native share API error, falling back to clipboard:', err);
    }
  }

  // 2. Clipboard Fallback: Copy the rich formatted post text and clickable link
  const copied = await copyToClipboard(content.text);
  if (copied) {
    hapticSuccess();
  }
  return {
    success: copied,
    method: 'clipboard',
    message: copied ? 'Post link & details copied to clipboard!' : 'Failed to copy share link.',
    shareUrl: content.postUrl
  };
}

export default {
  FALLBACK_APP_LINK,
  APP_LINK,
  getBaseAppUrl,
  shareAsset,
  buildShareContent,
  isYouTubeUrl,
  extractYouTubeId,
  getYouTubeThumbnail,
  createMediaFileForSharing,
  copyImageBitmapToClipboard,
  getSocialShareLinks
};
