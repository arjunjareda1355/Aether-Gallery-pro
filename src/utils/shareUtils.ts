import { Image, User } from '../types';
import { copyToClipboard } from '../lib/utils';
import { trackActivity } from '../lib/recommendation';

export const APP_LINK = 'https://aethergallerypro.vercel.app/';

export interface ShareResult {
  success: boolean;
  method: 'native-file' | 'native-link' | 'clipboard';
  message: string;
}

/**
 * Checks if a given media URL is a YouTube video
 */
export function isYouTubeUrl(url?: string | null): boolean {
  if (!url) return false;
  return /youtube\.com|youtu\.be/i.test(url);
}

/**
 * Returns formatted share text strictly conforming to specifications:
 * - Images: description + post link + app link
 * - Direct MP4 Videos: description + post link + app link
 * - YouTube Videos: description (if any) + original video link + post link + app link (share link only)
 */
export function buildShareContent(image: Image) {
  const postUrl = `${APP_LINK}?post=${image.id}`;
  const originalLink = image.externalLink || (image.url && image.url.startsWith('http') && !image.url.includes('firebasestorage') && !image.url.includes('blob:') ? image.url : null);
  const isYouTube = isYouTubeUrl(image.url) || isYouTubeUrl(originalLink);

  const title = (image.title && image.title.trim()) || 'Aether Sanctuary';
  const description = (image.description && image.description.trim()) || '';

  if (isYouTube) {
    const ytUrl = isYouTubeUrl(image.url) ? image.url : (originalLink || image.url);
    const textParts: string[] = [];
    if (title) textParts.push(`✨ ${title}`);
    if (description && description !== title) textParts.push(description);
    textParts.push(`▶️ YouTube Video: ${ytUrl}`);
    textParts.push(`🔗 Post Link: ${postUrl}`);
    textParts.push(`🌐 App Link: ${APP_LINK}`);
    
    return {
      isYouTube: true,
      isVideo: true,
      postUrl,
      targetUrl: ytUrl,
      title,
      text: textParts.join('\n\n')
    };
  }

  const isVideo = image.type === 'video' || /\.(mp4|webm|ogg|mov)$/i.test(image.url || '');

  // Direct Image or MP4 Video
  const textParts: string[] = [];
  if (title) textParts.push(`✨ ${title}`);
  if (description && description !== title) textParts.push(description);
  textParts.push(`🔗 Post Link: ${postUrl}`);
  textParts.push(`🌐 App Link: ${APP_LINK}`);

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
 * Helper to fetch media blob safely with Data URL, CORS, and Canvas image fallback
 */
async function fetchMediaBlob(url: string, isVideo: boolean): Promise<Blob | null> {
  if (!url) return null;

  // 1. Data URL
  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : (isVideo ? 'video/mp4' : 'image/jpeg');
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn('Data URL conversion failed:', e);
    }
  }

  // 2. Direct CORS Fetch with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const blob = await res.blob();
      return blob;
    }
  } catch (err) {
    console.warn('Direct fetch failed, checking canvas fallback for image:', err);
  }

  // 3. For images, try loading into Image element + Canvas to get Blob
  if (!isVideo) {
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
      if (blob) return blob;
    } catch (e) {
      console.warn('Canvas blob conversion fallback failed:', e);
    }
  }

  return null;
}

/**
 * Executes high-fidelity sharing:
 * 1. YouTube videos: share with link only (title + original video link + post link + app link)
 * 2. Direct Images: share as image file with post link and app link
 * 3. Direct Videos: share as mp4 video file with post link and app link
 * 4. Falls back to Web Share API (links) or Clipboard Copy
 */
export async function shareAsset(image: Image, user?: User | null): Promise<ShareResult> {
  const content = buildShareContent(image);

  if (user) {
    trackActivity(user.uid, [image.category, ...(image.tags || [])], 'share');
  }

  // 1. YouTube video sharing: share YouTube videos with link only
  if (content.isYouTube) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.targetUrl
        });
        return { success: true, method: 'native-link', message: 'YouTube video link shared successfully!' };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: true, method: 'native-link', message: 'Share dismissed.' };
        }
      }
    }

    const copied = await copyToClipboard(content.text);
    return {
      success: copied,
      method: 'clipboard',
      message: copied ? 'YouTube video link & post link copied to clipboard!' : 'Failed to copy share link.'
    };
  }

  // 2. Direct Image or MP4 Video: Share as File with links
  const targetMedia = image.url || image.thumbnailUrl;
  const isVideo = content.isVideo;

  if (targetMedia && navigator.share) {
    try {
      const blob = await fetchMediaBlob(targetMedia, isVideo);
      if (blob) {
        let mimeType = blob.type;
        let ext = 'jpg';

        if (isVideo) {
          mimeType = 'video/mp4';
          ext = 'mp4';
        } else {
          if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('webp')) ext = 'webp';
          else if (mimeType.includes('gif')) ext = 'gif';
          else {
            ext = 'jpg';
            mimeType = 'image/jpeg';
          }
        }

        const cleanTitle = (image.title || (isVideo ? 'aether_video' : 'aether_image'))
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 50);

        const file = new File([blob], `${cleanTitle}.${ext}`, { type: mimeType });

        // Check file share capability
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          const sharePayload: ShareData = {
            title: content.title,
            text: content.text,
            files: [file]
          };

          // Try sharing with files + links
          try {
            await navigator.share(sharePayload);
            return {
              success: true,
              method: 'native-file',
              message: isVideo ? 'MP4 Video shared with links!' : 'Image shared with links!'
            };
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') {
              return { success: true, method: 'native-file', message: 'Share dismissed.' };
            }
            throw shareErr;
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'native-file', message: 'Share dismissed.' };
      }
      console.warn('Direct media file share fallback to link share:', err);
    }
  }

  // 3. Fallback: Generic Web Share API (link only)
  if (navigator.share) {
    try {
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.postUrl
      });
      return { 
        success: true, 
        method: 'native-link', 
        message: isVideo ? 'Video link & description shared!' : 'Image link & description shared!' 
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'native-link', message: 'Share dismissed.' };
      }
    }
  }

  // 4. Absolute Fallback: Copy formatted text with links to clipboard
  const copied = await copyToClipboard(content.text);
  return {
    success: copied,
    method: 'clipboard',
    message: copied ? 'Post link, description & app link copied to clipboard!' : 'Failed to copy share link.'
  };
}

