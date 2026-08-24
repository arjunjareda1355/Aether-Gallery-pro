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
 * Returns formatted share text strictly conforming to specifications:
 * - Images: description + post link + app link
 * - Direct MP4 Videos: description + post link + app link
 * - YouTube Videos: description (if any) + original video link + app link
 */
export function buildShareContent(image: Image) {
  const postUrl = `${APP_LINK}?post=${image.id}`;
  const originalLink = image.externalLink || (image.url && image.url.startsWith('http') && !image.url.includes('firebasestorage') && !image.url.includes('blob:') ? image.url : null);
  const isYouTube = /youtube\.com|youtu\.be/i.test(image.url || '') || (originalLink ? /youtube\.com|youtu\.be/i.test(originalLink) : false);

  const description = (image.description && image.description.trim()) || (image.title && image.title.trim()) || '';

  if (isYouTube) {
    const ytUrl = originalLink || image.url;
    const textParts = [];
    if (description) textParts.push(description);
    textParts.push(`Video: ${ytUrl}`);
    textParts.push(`App: ${APP_LINK}`);
    
    return {
      isYouTube: true,
      postUrl,
      targetUrl: ytUrl,
      title: image.title || 'Aether Gallery',
      text: textParts.join('\n\n')
    };
  }

  // Direct Image or MP4 Video
  const textParts = [];
  if (description) textParts.push(description);
  textParts.push(`Post: ${postUrl}`);
  textParts.push(`App: ${APP_LINK}`);

  return {
    isYouTube: false,
    postUrl,
    targetUrl: postUrl,
    title: image.title || 'Aether Gallery',
    text: textParts.join('\n\n')
  };
}

/**
 * Executes high-fidelity sharing:
 * 1. If YouTube: shares original link + app link
 * 2. If direct video/image: fetches media blob as mp4/image file and uses navigator.share({ files: [...] })
 * 3. Falls back to navigator.share({ text, url }) or clipboard copy
 */
export async function shareAsset(image: Image, user?: User | null): Promise<ShareResult> {
  const content = buildShareContent(image);

  if (user) {
    trackActivity(user.uid, [image.category, ...(image.tags || [])], 'share');
  }

  // 1. YouTube video sharing: share original link + app link
  if (content.isYouTube) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.targetUrl
        });
        return { success: true, method: 'native-link', message: 'YouTube video shared successfully!' };
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
      message: copied ? 'YouTube video link & app link copied to clipboard!' : 'Failed to copy share link.'
    };
  }

  // 2. Direct Image or Video (MP4): Attempt file share with media payload
  const targetMedia = image.url || image.thumbnailUrl;
  if (targetMedia && navigator.share && navigator.canShare) {
    try {
      const response = await fetch(targetMedia, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const isVideo = image.type === 'video' || blob.type.includes('video');
        const ext = isVideo ? 'mp4' : (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        const mimeType = isVideo ? 'video/mp4' : blob.type || 'image/jpeg';
        
        const cleanTitle = (image.title || 'aether_asset').replace(/[^a-zA-Z0-9_-]/g, '_');
        const file = new File([blob], `${cleanTitle}.${ext}`, { type: mimeType });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: content.title,
            text: content.text,
            url: content.postUrl,
            files: [file]
          });
          return { success: true, method: 'native-file', message: 'Shared successfully with media attachment!' };
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'native-file', message: 'Share dismissed.' };
      }
      console.warn('Direct media file share bypassed, falling back to link share:', err);
    }
  }

  // 3. Fallback: Generic Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.postUrl
      });
      return { success: true, method: 'native-link', message: 'Post link & description shared!' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'native-link', message: 'Share dismissed.' };
      }
    }
  }

  // 4. Absolute Fallback: Copy formatted text to clipboard
  const copied = await copyToClipboard(content.text);
  return {
    success: copied,
    method: 'clipboard',
    message: copied ? 'Post link, description & app link copied to clipboard!' : 'Failed to copy share link.'
  };
}
