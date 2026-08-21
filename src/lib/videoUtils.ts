/**
 * Captures a thumbnail from a video URL at a specific timestamp.
 * Attempts to capture a clear frame by seeking to a representative part of the video.
 */
export const captureVideoThumbnail = (videoUrl: string, seekPercentage: number = 0.25): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous'; 
    video.muted = true;
    video.preload = 'metadata';
    
    // Set a timeout
    const timeout = setTimeout(() => {
       video.remove();
       reject(new Error('Thumbnail capture timed out'));
    }, 15000);

    video.onloadedmetadata = () => {
      // Seek to a percentage of the duration if available, else default to 2s
      const duration = video.duration || 10;
      const seekTime = isFinite(duration) ? duration * seekPercentage : 2;
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      const captureFrame = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale down if video is massive to save memory, but keep it clear
          const maxWidth = 1280;
          let width = video.videoWidth;
          let height = video.videoHeight;
          
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            // High quality JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            clearTimeout(timeout);
            resolve(dataUrl);
          } else {
            reject(new Error('Canvas context failure'));
          }
        } catch (e) {
          reject(e);
        } finally {
          video.remove();
        }
      };

      // Wait a tiny bit for the frame to decode fully
      if (video.readyState >= 2) {
        captureFrame();
      } else {
        video.oncanplay = captureFrame;
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      video.remove();
      reject(new Error('Failed to load video signature for extraction'));
    };
  });
};
