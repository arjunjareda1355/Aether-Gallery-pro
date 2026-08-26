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

export default {
  FALLBACK_APP_LINK,
  APP_LINK,
  getBaseAppUrl,
  shareAsset,
  buildShareContent,
  isYouTubeUrl
};

export interface ShareResult {
  success: boolean;
  method: 'native-share' | 'native-file' | 'clipboard';
  message: string;
  shareUrl: string;
}

/**
 * Checks if a given media URL is a YouTube video
 */
export function isYouTubeUrl(url?: string | null): boolean {
  if (!url) return false;
  return /youtube\.com|youtu\.be/i.test(url);
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
      `✨ ${title}`,
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
  const textParts: string[] = [
    `✨ ${title}`,
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
 * Executes high-fidelity sharing:
 * - Shares the post link, title, and formatted description
 * - Works across WhatsApp, Telegram, iMessage, Twitter/X, Discord, Slack, Instagram
 * - Copies link to clipboard as a reliable backup
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

  // 1. Native Web Share API with full rich URL and text payload
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
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
