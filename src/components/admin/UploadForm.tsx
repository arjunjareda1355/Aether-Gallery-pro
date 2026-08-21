import { Plus, X, Tag, Sparkles, Link as LinkIcon, Type, Wand2, EyeOff, Image as ImageIcon, Video, PlayCircle, FolderPlus, Activity, ChevronDown, AlertCircle, Upload as UploadIcon, Music, Headphones, Globe, ExternalLink } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Category, Image } from '../../types';
import { cn } from '../../lib/utils';
import { analyzeAsset, analyzeFromTitle } from '../../services/geminiService';
import { captureVideoThumbnail } from '../../lib/videoUtils';
import { motion, AnimatePresence } from 'motion/react';
import { serverTimestamp } from 'firebase/firestore';

const getAudioPlatformLabel = (url: string) => {
  if (!url) return 'Audio';
  if (url.includes('spotify')) return 'Spotify';
  if (url.includes('soundcloud')) return 'Soundcloud';
  return 'Audio Track';
};

interface UploadFormProps {
  categories: Category[];
  existingImages: Image[];
  onUpload: (data: any) => Promise<void>;
  onAddCategory?: (name: string) => Promise<string | null>;
  isAdmin?: boolean;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function UploadForm({ categories, existingImages, onUpload, onAddCategory, isAdmin = false, onNotify }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const lastFetchedUrlRef = useRef('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    thumbnailUrl: '',
    type: 'image' as 'image' | 'video',
    category: '',
    tags: [] as string[],
    sceneContext: '',
    isPremium: false,
    isSample: false,
    isGallery: false,
    aspectRatio: 'landscape' as 'portrait' | 'landscape' | 'square' | 'ultrawide'
  });

  // Auto-detect video type and thumbnails from URL
  useEffect(() => {
    // Auto-normalize Google Drive links to direct content links
    if (formData.url.includes('drive.google.com') && !formData.url.includes('uc?export=view')) {
      const driveMatch = formData.url.match(/(?:\/file\/d\/|id=)([\w-]+)/);
      if (driveMatch) {
         const fileId = driveMatch[1];
         setFormData(prev => ({ ...prev, url: `https://drive.google.com/uc?export=view&id=${fileId}` }));
         return;
      }
    }

    // STRICT: Remove iframe/embed code if pasted
    if (formData.url.includes('<iframe') || formData.url.includes('</iframe>')) {
      const srcMatch = formData.url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        setFormData(prev => ({ ...prev, url: srcMatch[1] }));
      } else {
        setFormData(prev => ({ ...prev, url: '' }));
      }
      return;
    }

    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(formData.url) || 
                   formData.url.toLowerCase().includes('youtube.com') || 
                   formData.url.toLowerCase().includes('youtu.be') || 
                   formData.url.toLowerCase().includes('vimeo.com') ||
                   formData.url.toLowerCase().includes('instagram.com/p/') ||
                   formData.url.toLowerCase().includes('instagram.com/reel/') ||
                   formData.url.toLowerCase().includes('instagram.com/tv/');
    
    if (isVideo && formData.type === 'image') {
      setFormData(prev => ({ ...prev, type: 'video' }));
    }

    // Auto-fetch YouTube Thumbnail & metadata (including shorts)
    const ytMatch = formData.url.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|shorts\/|watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) {
      const videoId = ytMatch[1];
      if (!formData.thumbnailUrl) {
        setFormData(prev => ({ 
          ...prev, 
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` 
        }));
      }

      // Check if URL metadata was already fetched to avoid loop
      if (lastFetchedUrlRef.current !== formData.url) {
        lastFetchedUrlRef.current = formData.url;
        
        // Fetch official YouTube oEmbed which has CORS enabled
        fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(formData.url)}&format=json`)
          .then(res => {
            if (!res.ok) throw new Error("CORS or YouTube fetch fail");
            return res.json();
          })
          .then(data => {
            if (data && data.title) {
              setFormData(prev => ({
                ...prev,
                title: prev.title || data.title || '',
                description: prev.description || (data.author_name ? `A video by ${data.author_name}. Synced from YouTube.` : '')
              }));
              if (onNotify) {
                onNotify("Synchronized title and creator details from YouTube.", 'info');
              }
            }
          })
          .catch(() => {
            // Try noembed fallback (also CORS free and open)
            fetch(`https://noembed.com/embed?url=${encodeURIComponent(formData.url)}`)
              .then(res => res.json())
              .then(data => {
                if (data && data.title) {
                  setFormData(prev => ({
                    ...prev,
                    title: prev.title || data.title || '',
                    description: prev.description || (data.author_name ? `A video by ${data.author_name}. Synced from YouTube.` : '')
                  }));
                  if (onNotify) {
                    onNotify("Synchronized title and creator details via fallback server.", 'info');
                  }
                }
              })
              .catch(err => console.warn("Could not fetch YouTube metadata:", err));
          });
      }
    } else if (isVideo && !formData.thumbnailUrl && formData.url.startsWith('http')) {
      // Auto-capture frame from direct video link
      captureVideoThumbnail(formData.url).then(thumb => {
        setFormData(prev => ({ ...prev, thumbnailUrl: thumb }));
      }).catch(err => console.warn("Could not auto-capture thumbnail:", err));
    }
  }, [formData.url]);
  // Auto-detect from title logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      // More aggressive trigger for AI analysis if only title is provided
      const shouldAnalyze = formData.title.length > 3 && 
                           (!formData.description || formData.description.length < 5) && 
                           (formData.tags.length < 3) && 
                           !isAnalyzing;

      if (shouldAnalyze) {
        setIsAnalyzing(true);
        try {
          const result = await analyzeFromTitle(formData.title);
          if (result) {
            let categoryName = result.category || 'Abstract';
            const existingCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            
            setFormData(prev => {
              let categoryId = prev.category;
              if (!categoryId) {
                if (existingCat) {
                  categoryId = existingCat.id;
                } else if (onAddCategory) {
                  // Wait for auto-generation
                  onAddCategory(categoryName).then(id => {
                    if (id) setFormData(curr => ({ ...curr, category: id }));
                  });
                }
              }

              return {
                ...prev,
                description: prev.description || result.description,
                tags: Array.from(new Set([...prev.tags, ...result.tags])),
                category: categoryId
              };
            });
          }
        } catch (e) {
          console.warn("Auto title analysis failed:", e);
        } finally {
          setIsAnalyzing(false);
        }
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [formData.title]);

  const [newTag, setNewTag] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBulkMagic, setIsBulkMagic] = useState(false);

  const isBulkInput = formData.url.split('\n').filter(u => u.trim()).length > 1;
  
  const detectAspectRatio = (width: number, height: number): 'portrait' | 'landscape' | 'square' | 'ultrawide' => {
    const ratio = width / height;
    if (ratio > 2.2) return 'ultrawide';
    if (ratio > 1.1) return 'landscape';
    if (ratio < 0.9) return 'portrait';
    return 'square';
  };

  // Auto-detect other video types and Extract Thumbs
  useEffect(() => {
    const detectMetadata = async () => {
      const url = formData.url.trim();
      if (!url) return;

      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      const isVimeo = url.includes('vimeo.com');
      const isDirectVideo = /\.(mp4|webm|mov)$/i.test(url);

      // Auto-detect other video types
      if (formData.type !== 'video' && (isDirectVideo || isYoutube || isVimeo)) {
        setFormData(prev => ({ ...prev, type: 'video' }));
      }

      if (isYoutube) {
        // Thumbnail & oEmbed check
        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch) {
          const videoId = ytMatch[1];
          const newThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          
          setFormData(prev => {
            const updates: Partial<typeof prev> = {};
            if (!prev.thumbnailUrl) updates.thumbnailUrl = newThumb;
            if (prev.type !== 'video') updates.type = 'video';
            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });

          // Fetch title & description via oEmbed
          try {
            const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (response.ok) {
              const data = await response.json();
              setFormData(curr => ({
                ...curr,
                title: curr.title || data.title || '',
                description: curr.description || `Video by ${data.author_name}` || ''
              }));
              if (onNotify) {
                onNotify("Loaded YouTube video details automatically", "success");
              }
            }
          } catch (e) {
            console.warn("YouTube oEmbed fetch failed during typing:", e);
          }
        }
      }
    };

    const timeout = setTimeout(detectMetadata, 1000);
    return () => clearTimeout(timeout);
  }, [formData.url]);

  const runAutoAI = async (url: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeAsset(url, undefined, formData.title);
      if (result) {
        const catId = categories.find(c => c.name.toLowerCase() === result.category?.toLowerCase())?.id;
        setFormData(prev => ({
          ...prev,
          title: prev.title || result.title,
          description: prev.description || result.description,
          tags: Array.from(new Set([...prev.tags, ...result.tags])),
          category: prev.category || catId || prev.category
        }));
      }
    } catch (e) {
      console.warn("AI extraction post-upload failed:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeUpload = async (modeOverride?: 'skip' | 'keep') => {
    if (!formData.url.trim() || !formData.title || !formData.category) {
      if (onNotify) onNotify("Missing required resonance parameters (URL, Title, Category)", "error");
      else alert("Missing required resonance parameters");
      return;
    }

    // Dynamic and robust split of URLs by newlines, carriage returns, commas, semicolons, and any whitespace
    const urls = formData.url
      .split(/[\r\n\s]+|[,;](?=\s|$|https?:\/\/)/i)
      .map(u => {
        let trimmed = u.trim();
        if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
          trimmed = trimmed.slice(0, -1);
        }
        return trimmed;
      })
      .filter(u => u.length > 0 && /^https?:\/\//i.test(u));

    if (urls.length === 0) {
      if (onNotify) onNotify("No valid URLs found in the entry. Ensure URLs start with http:// or https://", "error");
      else alert("No valid URLs found.");
      return;
    }

    // Check for duplicates
    const duplicates = urls.filter(url => existingImages.some(img => img.url === url));
    const activeMode = modeOverride || conflictData.mode;

    if (duplicates.length > 0 && !activeMode) {
      setConflictData({ urls: duplicates, mode: null });
      return;
    }

    let finalUrls = urls;
    if (activeMode === 'skip') {
      finalUrls = urls.filter(url => !duplicates.includes(url));
    }

    if (finalUrls.length === 0) {
      if (onNotify) onNotify("All provided links are already present. No new assets added.", "info");
      else alert("All provided links are already present.");
      setConflictData({ urls: [], mode: null });
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      // Final pass to ensure aspect ratios are detected for all URLs concurrently
      const urlToRatio = new Map<string, 'portrait' | 'landscape' | 'square' | 'ultrawide'>();
      await Promise.all(finalUrls.map(async (url) => {
        const isDirectVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
        const isYoutube = /youtube\.com|youtu\.be/i.test(url);
        const isVimeo = /vimeo\.com/i.test(url);
        const isYoutubeShort = isYoutube && url.toLowerCase().includes('/shorts/');
        const isPortraitUrlPattern = /portrait|vertical|reel|tiktok|9-16|9_16|9x16/i.test(url);

        if (isDirectVideo) {
           try {
             await new Promise((resolve) => {
               const video = document.createElement('video');
               video.preload = 'metadata';
               video.src = url;
               video.onloadedmetadata = () => {
                 if (video.videoWidth > 0 && video.videoHeight > 0) {
                   urlToRatio.set(url, detectAspectRatio(video.videoWidth, video.videoHeight));
                 } else {
                   urlToRatio.set(url, isPortraitUrlPattern ? 'portrait' : 'landscape');
                 }
                 resolve(true);
               };
               video.onerror = () => {
                 urlToRatio.set(url, isPortraitUrlPattern ? 'portrait' : 'landscape');
                 resolve(false);
               };
               // Timeout to prevent hanging if video cannot be loaded
               setTimeout(() => {
                 if (!urlToRatio.has(url)) {
                   urlToRatio.set(url, isPortraitUrlPattern ? 'portrait' : 'landscape');
                 }
                 resolve(false);
               }, 3500);
             });
           } catch (e) {
             urlToRatio.set(url, isPortraitUrlPattern ? 'portrait' : 'landscape');
           }
        } else if (isYoutube || isVimeo) {
          urlToRatio.set(url, isYoutubeShort || isPortraitUrlPattern ? 'portrait' : 'landscape');
        } else {
           // It's an image
           try {
             await new Promise((resolve) => {
               const img = new window.Image();
               img.onload = () => {
                 urlToRatio.set(url, detectAspectRatio(img.width, img.height));
                 resolve(true);
               };
               img.onerror = () => {
                 urlToRatio.set(url, isPortraitUrlPattern ? 'portrait' : 'landscape');
                 resolve(false);
               };
               img.src = url;
               // Safe timeout of 3 seconds to prevent long hanging
               setTimeout(() => {
                 if (!urlToRatio.has(url)) {
                   urlToRatio.set(url, isPortraitUrlPattern ? 'portrait' : 'landscape');
                 }
                 resolve(false);
               }, 3000);
             });
           } catch (e) {
             urlToRatio.set(url, isPortraitUrlPattern ? 'portrait' : 'landscape');
           }
        }
      }));

      if (formData.isGallery && finalUrls.length > 1) {
        // Gallery Mode: Multiple URLs in ONE post
        try {
          await onUpload({
            ...formData,
            url: finalUrls[0], // Cover image
            urls: finalUrls,
            aspectRatio: urlToRatio.get(finalUrls[0]) || 'landscape',
            timestamp: new Date()
          });
          successCount = 1;
        } catch (err) {
          console.error("Gallery upload failed:", err);
          throw err;
        }
      } else {
        // Standard Mode: Multiple URLs as SEPARATE posts
        const isBulk = finalUrls.length > 1;

        for (const [index, url] of finalUrls.entries()) {
          try {
            const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || 
                           url.includes('youtube.com') || 
                           url.includes('youtu.be') || 
                           url.includes('vimeo.com');
            
            let thumb = formData.thumbnailUrl;
            let currentMetadata = { ...formData };
            currentMetadata.aspectRatio = urlToRatio.get(url) || 'landscape';

            // Bulk Variety Mode: Generate unique metadata for each if requested
            if (isBulk && isBulkMagic && !isAnalyzing) {
               try {
                 const result = await analyzeFromTitle(`${formData.title} - Version ${index + 1}`);
                 if (result) {
                   currentMetadata = {
                     ...currentMetadata,
                     title: result.title,
                     description: result.description,
                     tags: Array.from(new Set([...currentMetadata.tags, ...result.tags])),
                     category: result.category || currentMetadata.category,
                     sceneContext: result.sceneContext
                   };
                 }
               } catch (e: any) {
                 console.warn("Bulk AI Variety failed for index", index, e);
               }
            }
            
            if (!thumb && isVideo && !url.includes('youtube.com') && !url.includes('vimeo.com')) {
               try { thumb = await captureVideoThumbnail(url); } catch (e) { /* fallback */ }
            }

            if (!thumb && (url.includes('youtube.com') || url.includes('youtu.be'))) {
              const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
              if (ytMatch) thumb = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
            }

            await onUpload({
              ...currentMetadata,
              url,
              thumbnailUrl: thumb,
              type: isVideo ? 'video' : 'image',
              likes: 0,
              timestamp: new Date()
            });
            successCount++;
          } catch (err) {
            console.error("Post upload failed for url", url, err);
          }
        }
      }
      setFormData({ 
        title: '', 
        description: '', 
        url: '', 
        category: '', 
        tags: [], 
        sceneContext: '',
        thumbnailUrl: '', 
        type: 'image',
        isPremium: false,
        isSample: false,
        isGallery: false,
        aspectRatio: 'landscape'
      });
      if (onNotify) {
        const typeLabel = finalUrls.length > 1 ? "Integrated Links" : "Direct Resonance";
        onNotify(`${successCount} asset(s) successfully added via ${typeLabel}.`, "success");
      }
      setConflictData({ urls: [], mode: null });
    } catch (error) {
      console.error(error);
      if (onNotify) {
        onNotify(`Sanctuary sync partially failed. Success: ${successCount}`, "error");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeUpload();
  };

  const handleResolveConflict = async (mode: 'skip' | 'keep') => {
    setConflictData(prev => ({ ...prev, mode }));
    await executeUpload(mode);
  };

  const [conflictData, setConflictData] = useState<{ urls: string[], mode: 'skip' | 'keep' | 'replace' | null }>({ urls: [], mode: null });

  const handleAIAnalysis = async () => {
    if (!formData.url && !formData.title) return;
    setIsAnalyzing(true);
    
    try {
      let result = null;
      let platformMetadata = { title: '', description: '' };

      // Step 1: Handle YouTube/Vimeo Metadata (as baseline)
      if (formData.url.includes('youtube.com') || formData.url.includes('youtu.be')) {
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(formData.url)}&format=json`);
        if (response.ok) {
          const data = await response.json();
          platformMetadata = { title: data.title, description: `Video by ${data.author_name}` };
        }
      } else if (formData.url.includes('vimeo.com')) {
        const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(formData.url)}`);
        if (response.ok) {
          const data = await response.json();
          platformMetadata = { title: data.title, description: data.description || `Vimeo video by ${data.author_name}` };
        }
      } else if (formData.url.includes('instagram.com')) {
        try {
          const response = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(formData.url)}`);
          if (response.ok) {
            const data = await response.json();
            platformMetadata = { 
              title: data.title || `Instagram post by ${data.author_name}`, 
              description: `Shared by ${data.author_name} on Instagram` 
            };
            if (data.thumbnail_url && !formData.thumbnailUrl) {
              setFormData(prev => ({ ...prev, thumbnailUrl: data.thumbnail_url, type: 'video' }));
            }
          }
        } catch (e) {
          console.warn("Instagram oEmbed failed:", e);
        }
      }

      // Step 2: Perform Visual Analysis if possible
      let visualTarget = formData.type === 'image' ? formData.url : formData.thumbnailUrl;
      
      // If video and no thumbnail yet, try to capture one last second before AI
      if (formData.type === 'video' && !visualTarget && !formData.url.includes('youtube') && !formData.url.includes('vimeo')) {
        try {
          const captured = await captureVideoThumbnail(formData.url);
          if (captured) {
            visualTarget = captured;
            setFormData(prev => ({ ...prev, thumbnailUrl: captured }));
          }
        } catch (e) {
          console.warn("Pre-analysis thumbnail capture failed:", e);
        }
      }

      if (visualTarget) {
        result = await analyzeAsset(visualTarget, undefined, formData.title || platformMetadata.title);
      } else if (formData.title || platformMetadata.title) {
        // Fallback to title only if no visual target available
        result = await analyzeFromTitle(formData.title || platformMetadata.title);
      }

      // Step 3: Combined Analysis fallback (Title only if visual failed)
      if (!result && (formData.title || platformMetadata.title)) {
        result = await analyzeFromTitle(formData.title || platformMetadata.title);
      }

      // Step 4: Apply results
      if (result) {
        let categoryName = result.category || 'Abstract';
        let categoryId = formData.category;
        
        const existingCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        
        if (existingCat) {
          categoryId = existingCat.id;
        } else if (onAddCategory) {
          // Auto-create category if it doesn't exist and get its new ID
          const newId = await onAddCategory(categoryName);
          if (newId) categoryId = newId;
        }

        setFormData(prev => ({
          ...prev,
          title: prev.title || result?.title || platformMetadata.title,
          description: prev.description || result?.description || platformMetadata.description,
          tags: Array.from(new Set([...prev.tags, ...(result?.tags || [])])),
          sceneContext: result?.sceneContext || '',
          category: categoryId
        }));
      } else if (platformMetadata.title) {
        // Just platform meta if AI failed completely
        setFormData(prev => ({
          ...prev,
          title: prev.title || platformMetadata.title,
          description: prev.description || platformMetadata.description
        }));
      }

    } catch (error: any) {
      console.error("Analysis failed:", error);
      if (onNotify) onNotify(error.message || "AI Analysis anomaly detected.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  return (
    <div className="bg-card-dark border border-white/5 p-6 md:p-8 rounded-[40px] space-y-8 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
      <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {conflictData.urls.length > 0 && conflictData.mode === null && (
          <div 
            className="fixed inset-0 z-[160] flex items-center justify-center p-4"
            onClick={() => setConflictData({ urls: [], mode: null })}
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConflictData({ urls: [], mode: null })}
              className="absolute inset-0 bg-bg-dark/95 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-card-dark border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-6 mb-10">
                <div className="w-20 h-20 rounded-[30px] bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-black uppercase tracking-tight text-text-main">Duplicate Signals</h3>
                  <p className="text-xs text-text-dim leading-relaxed">The sanctuary identifies {conflictData.urls.length} signatures that already exist in our digital realm.</p>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  type="button"
                  onClick={() => handleResolveConflict('skip')}
                  className="w-full p-6 bg-white/5 border border-white/10 rounded-[28px] text-left hover:bg-white/10 hover:border-brand-primary/50 transition-all group flex items-center gap-6"
                >
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-brand-primary/20 transition-colors">
                    <X className="w-5 h-5 text-text-dim/50 group-hover:text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-text-main group-hover:text-brand-primary">Omit Duplicates</p>
                    <p className="text-[10px] text-text-dim mt-1">Recommended. Only process unique signals.</p>
                  </div>
                </button>
                <button 
                  type="button"
                  onClick={() => handleResolveConflict('keep')}
                  className="w-full p-6 bg-white/5 border border-white/10 rounded-[28px] text-left hover:bg-white/10 hover:border-amber-500/50 transition-all group flex items-center gap-6"
                >
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-amber-500/20 transition-colors">
                    <Plus className="w-5 h-5 text-text-dim/50 group-hover:text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-text-main group-hover:text-amber-500">Duplicate All</p>
                    <p className="text-[10px] text-text-dim mt-1">Force parallel existance for these signatures.</p>
                  </div>
                </button>
                <button 
                  type="button"
                  onClick={() => setConflictData({ urls: [], mode: null })}
                  className="w-full py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-text-dim/40 hover:text-text-main transition-colors"
                >
                  Terminate Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-white/[0.05] pb-8 relative z-10">
        <div className="p-4 bg-brand-primary/5 rounded-[24px] text-brand-primary border border-brand-primary/10">
          <ImageIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-medium tracking-tight text-text-main">Registry Addition</h2>
          <p className="text-text-dim text-[11px] font-medium uppercase tracking-[0.2em] mt-1 opacity-60">Sequence integration from cloud origins</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
            <div className="space-y-6">
              {isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-dim ml-1">Atmosphere Status</label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isPremium: !prev.isPremium, isSample: !prev.isPremium ? prev.isSample : false }))}
                      className={cn(
                        "w-full h-12 rounded-full border flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-500",
                        formData.isPremium 
                          ? "bg-brand-primary/10 border-brand-primary text-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.1)]" 
                          : "bg-white/[0.02] border-white/5 text-text-dim/40 hover:text-text-main"
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Premium
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-dim ml-1">Public Frequency</label>
                    <button
                      type="button"
                      disabled={!formData.isPremium}
                      onClick={() => setFormData(prev => ({ ...prev, isSample: !prev.isSample }))}
                      className={cn(
                        "w-full h-12 rounded-full border flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-500",
                        formData.isSample 
                          ? "bg-white/10 border-white/40 text-white" 
                          : "bg-white/[0.02] border-white/5 text-text-dim/40 hover:text-text-main disabled:opacity-10 disabled:cursor-not-allowed"
                      )}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Sample
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1 text-center sm:text-left block">Media Type</label>
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                  {(['image', 'video'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type }))}
                      className={cn(
                        "flex-1 h-12 rounded-xl flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-widest transition-all",
                        formData.type === type 
                          ? "bg-white text-bg-dark shadow-xl" 
                          : "text-text-dim hover:text-white"
                      )}
                    >
                      {type === 'image' ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-dim ml-1">Identification</label>
                <div className="relative group">
                  <Type className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim/20 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    required
                    type="text"
                    placeholder="Enter resonance title..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-12 bg-white/[0.02] border border-white/5 rounded-full pl-14 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/20 transition-all text-text-main placeholder:text-white/5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim">Asset Source URL(s)</label>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 group">
                    <LinkIcon className="absolute left-5 top-5 w-4 h-4 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                    <textarea
                      required
                      rows={3}
                      placeholder={formData.type === 'video' ? "Paste YouTube/Vimeo/Direct links..." : "Paste direct image links or multiple lines..."}
                      value={formData.url}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.includes('<iframe')) {
                          if (onNotify) onNotify("Embed codes are not supported. Use direct URL only.", "error");
                          return;
                        }
                        setFormData({ ...formData, url: val });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-text-main resize-none font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={(!formData.url && !formData.title) || isAnalyzing || (formData.url.includes('\n'))}
                    className={cn(
                      "h-14 sm:w-14 shrink-0 rounded-2xl border flex items-center justify-center gap-3 sm:gap-0 transition-all active:scale-95",
                      isAnalyzing ? "bg-brand-primary/10 border-brand-primary/50 text-brand-primary" : "bg-white/5 border-white/10 text-text-dim/40 hover:text-text-main disabled:opacity-30"
                    )}
                    title={formData.url.includes('\n') ? "AI Magic disabled for manual bulk (use Intelligence Sync below)" : "AI Meta-Data Generator"}
                  >
                    <Wand2 className={cn("w-5 h-5", isAnalyzing && "animate-spin")} />
                    <span className="sm:hidden font-bold text-xs uppercase">Run AI Magic</span>
                  </button>
                </div>
                {isBulkInput && (
                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isGallery: !prev.isGallery }))}
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all",
                        formData.isGallery ? "bg-amber-500 text-bg-dark border-amber-500 shadow-lg shadow-amber-500/20" : "bg-white/5 border-white/10 text-white/30 hover:text-text-main/60"
                      )}
                    >
                       <FolderPlus className={cn("w-3 h-3", formData.isGallery && "animate-pulse")} />
                       Gallery Mode (Multiple in One Post)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkMagic(!isBulkMagic)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all",
                        isBulkMagic ? "bg-brand-primary text-bg-dark border-brand-primary shadow-lg shadow-brand-primary/20" : "bg-white/5 border-white/10 text-white/30 hover:text-text-main/60"
                      )}
                    >
                       <Sparkles className={cn("w-3 h-3", isBulkMagic && "animate-pulse")} />
                       AI Variety Mode (Bulk)
                    </button>
                  </div>
                )}
                
                {/* Removed Pinterest External Portal Logic */}
                
                {formData.type === 'video' && (
                   <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Video Thumbnail URL (Optional)</label>
                      <div className="relative group">
                        <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type="url"
                          placeholder="Link to video preview image"
                          value={formData.thumbnailUrl}
                          onChange={e => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white placeholder:text-white/20"
                        />
                      </div>
                   </div>
                )}
              
              {formData.url && !formData.url.includes('\n') && (
                <div className="mt-3 p-4 bg-bg-dark/40 rounded-2xl border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim">Source Preview</p>
                    <span className="text-[10px] text-brand-primary font-bold uppercase">Dynamic Check</span>
                  </div>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/5">
                  {formData.type === 'video' ? (
                     <div className="relative w-full h-full">
                        {formData.thumbnailUrl ? (
                          <img 
                            src={formData.thumbnailUrl} 
                            alt="Thumbnail Preview" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-primary/5 text-brand-primary opacity-60">
                            <PlayCircle className="w-12 h-12 mb-2" />
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Video Source Ready</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-bg-dark/20 pointer-events-none">
                           <PlayCircle className="w-12 h-12 text-white/80 drop-shadow-2xl" />
                        </div>
                     </div>
                  ) : false ? (
                     <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-bg-dark/80 to-brand-primary/5 text-center">
                        {formData.thumbnailUrl ? (
                          <img 
                            src={formData.thumbnailUrl} 
                            alt="Audio Cover Preview" 
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                          />
                        ) : null}
                        <div className="relative z-10 flex flex-col items-center gap-3">
                          <Music className="w-12 h-12 text-brand-primary animate-pulse" />
                          <div>
                            <p className="text-xs font-bold text-text-main max-w-[200px] truncate">{formData.title || "Untitled Audioscape"}</p>
                            <p className="text-[10px] text-text-dim mt-1">Audio Track Source</p>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                            {getAudioPlatformLabel(formData.url)}
                          </span>
                        </div>
                     </div>
                  ) : (
                    <img 
                      src={formData.url} 
                      alt="Preview" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.parentElement?.querySelector('.error-ui')?.classList.remove('hidden');
                        target.classList.add('opacity-10');
                      }}
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.parentElement?.querySelector('.error-ui')?.classList.add('hidden');
                        target.classList.remove('opacity-10');
                      }}
                    />
                  )}
                    <div className="error-ui hidden absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-brand-primary/10 backdrop-blur-md border border-brand-primary/20 rounded-xl">
                      <Globe className="w-8 h-8 text-brand-primary mb-2 animate-pulse" />
                      <p className="text-[10px] font-extrabold text-brand-primary uppercase tracking-widest">Hosted Link Connected</p>
                      <p className="text-[9px] text-text-dim mt-1 leading-relaxed max-w-[200px] truncate">
                        {formData.url}
                      </p>
                      <span className="mt-2 text-[8px] font-extrabold text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                        External Web Source Verified
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Assigned Category</label>
              <div className="relative group">
                <select
                  required
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all appearance-none text-text-main font-bold"
                >
                  <option value="" className="bg-bg-dark">Select a category</option>
                  {categories.map((cat, idx) => (
                    <option key={`upload-cat-${cat.id || idx}-${idx}`} value={cat.id} className="bg-bg-dark">{cat.name}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-dim">
                  <Plus className="w-4 h-4 rotate-45" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Creator Context (Description)</label>
              <textarea
                placeholder="The creative story behind this moment..."
                rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all resize-none text-text-main h-[140px] placeholder:text-text-dim/30"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Discovery Metadata (Tags)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Type tag and press enter..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-text-main placeholder:text-text-dim/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={addTag}
                  className="h-14 px-6 md:w-14 sm:h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 sm:gap-0 hover:bg-white/10 transition-all text-white/40 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span className="sm:hidden font-bold text-xs uppercase">Add Tag</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-black/40 rounded-[24px] border border-white/5">
                {Array.from(new Set(formData.tags)).map((tag: string, i: number) => (
                  <span key={`upload-tag-${tag}-${i}`} className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold uppercase tracking-widest rounded-lg border border-brand-primary/20 hover:bg-brand-primary/20 transition-all group">
                    {tag}
                    <button onClick={() => removeTag(tag)} type="button" className="text-brand-primary/50 group-hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
                {formData.tags.length === 0 && <span className="text-white/10 text-[10px] font-extrabold uppercase tracking-[0.2em] italic py-3 px-2">No metadata assigned yet</span>}
              </div>
            </div>
          </div>
        </div>

        <button
          disabled={isUploading}
          className="w-full h-14 bg-brand-primary text-bg-dark font-display font-medium text-[15px] uppercase tracking-widest rounded-full hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-brand-primary/10 group overflow-hidden relative mt-4"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <span className="relative z-10 flex items-center gap-3">
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-bg-dark/20 border-t-bg-dark rounded-full animate-spin" />
                <span>Sanctifying...</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-5 h-5" /> Confirm & Post
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
