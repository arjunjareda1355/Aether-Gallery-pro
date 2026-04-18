import { Plus, X, Upload as UploadIcon, Sparkles, Link as LinkIcon, Type, Tag, Image as ImageIcon, Video, PlayCircle, Wand2, Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Category } from '../../types';
import { cn } from '../../lib/utils';
import { analyzeAsset } from '../../services/geminiService';

interface UploadFormProps {
  categories: Category[];
  onUpload: (data: any) => Promise<void>;
}

export default function UploadForm({ categories, onUpload }: UploadFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    thumbnailUrl: '',
    type: 'image' as 'image' | 'video',
    category: '',
    tags: [] as string[],
    isPremium: false,
    isSample: false
  });

  // Auto-detect video type and thumbnails from URL
  useEffect(() => {
    // Auto-normalize Google Drive links to direct content links
    if (formData.url.includes('drive.google.com') && !formData.url.includes('uc?export=view')) {
      const driveMatch = formData.url.match(/(?:\/file\/d\/|id=)([\w-]+)/);
      if (driveMatch) {
         const fileId = driveMatch[1];
         setFormData(prev => ({ ...prev, url: `https://drive.google.com/uc?export=view&id=${fileId}` }));
         return; // Let the next cycle handle the normalized URL
      }
    }

    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(formData.url) || 
                   formData.url.includes('youtube.com') || 
                   formData.url.includes('youtu.be') || 
                   formData.url.includes('vimeo.com');
    
    if (isVideo && formData.type === 'image') {
      setFormData(prev => ({ ...prev, type: 'video' }));
    }

    // Auto-fetch YouTube Thumbnail
    const ytMatch = formData.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch && !formData.thumbnailUrl) {
      setFormData(prev => ({ 
        ...prev, 
        thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg` 
      }));
    }
  }, [formData.url]);
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url.trim() || !formData.title || !formData.category) return;

    const urls = formData.url.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    setIsUploading(true);
    let successCount = 0;
    
    try {
      for (const url of urls) {
        // Simple auto-detection for the current URL in loop
        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || 
                       url.includes('youtube.com') || 
                       url.includes('youtu.be') || 
                       url.includes('vimeo.com');
        
        let thumb = formData.thumbnailUrl;
        if (!thumb && url.includes('youtube.com')) {
          const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
          if (ytMatch) thumb = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
        }

        await onUpload({
          ...formData,
          url,
          thumbnailUrl: thumb,
          type: isVideo ? 'video' : 'image',
          likes: 0,
          timestamp: new Date()
        });
        successCount++;
      }
      setFormData({ 
        title: '', 
        description: '', 
        url: '', 
        category: '', 
        tags: [], 
        thumbnailUrl: '', 
        type: 'image',
        isPremium: false,
        isSample: false
      });
      alert(`${successCount} asset(s) added successfully!`);
    } catch (error) {
      console.error(error);
      alert(`Upload partially failed. Success: ${successCount}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!formData.url) return;
    setIsAnalyzing(true);
    try {
      // 1. Try Platform-Specific Metadata first (YouTube/Vimeo)
      let platformMetadata = { title: '', description: '' };
      
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
      }

      // 2. Try Gemini analysis (Useful for images and direct files)
      // For YouTube/Vimeo, we use Gemini for AI-generated tags even if we got the title from platform
      if (formData.type === 'image' || platformMetadata.title) {
        // If it's an image, we do full Gemini analysis
        // If it's a video and we got metadata, we might still want AI tags (though fetching video blob for AI isn't implemented here)
        // For now, only call Gemini analyzeAsset if it's an image
        if (formData.type === 'image') {
          const result = await analyzeAsset(formData.url);
          if (result) {
            setFormData(prev => ({
              ...prev,
              title: prev.title || result.title,
              description: prev.description || result.description,
              tags: Array.from(new Set([...prev.tags, ...result.tags]))
            }));
            return;
          }
        }
      }

      // If we got platform metadata but didn't go through the image Gemini path
      if (platformMetadata.title) {
        setFormData(prev => ({
          ...prev,
          title: prev.title || platformMetadata.title,
          description: prev.description || platformMetadata.description
        }));
      }
    } catch (error) {
      console.error("Analysis failed:", error);
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
    <div className="bg-card-dark border border-border-dark p-6 md:p-10 rounded-[32px] md:rounded-[40px] space-y-8 shadow-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
          <ImageIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">New Asset Creation</h2>
          <p className="text-text-dim text-[10px] font-extrabold uppercase tracking-widest mt-0.5">External cloud source integration</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Premium Status</label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isPremium: !prev.isPremium, isSample: !prev.isPremium ? prev.isSample : false }))}
                    className={cn(
                      "w-full h-14 rounded-2xl border flex items-center justify-center gap-3 text-xs font-bold uppercase transition-all",
                      formData.isPremium 
                        ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10" 
                        : "bg-white/5 border-white/10 text-text-dim hover:text-white"
                    )}
                  >
                    <Sparkles className="w-4 h-4" />
                    Premium
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Public Sample</label>
                  <button
                    type="button"
                    disabled={!formData.isPremium}
                    onClick={() => setFormData(prev => ({ ...prev, isSample: !prev.isSample }))}
                    className={cn(
                      "w-full h-14 rounded-2xl border flex items-center justify-center gap-3 text-xs font-bold uppercase transition-all",
                      formData.isSample 
                        ? "bg-green-500/10 border-green-500 text-green-500" 
                        : "bg-white/5 border-white/10 text-text-dim hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    )}
                  >
                    <EyeOff className="w-4 h-4" />
                    Sample
                  </button>
                </div>
              </div>

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
                      {type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Asset Title</label>
                <div className="relative group">
                  <Type className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                  <input
                    required
                    type="text"
                    placeholder="Enter moments title..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim ml-1">Asset Source URL(s)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 group">
                    <LinkIcon className="absolute left-5 top-5 w-4 h-4 text-text-dim group-focus-within:text-brand-primary transition-colors" />
                    <textarea
                      required
                      rows={3}
                      placeholder={formData.type === 'video' ? "Paste YouTube/Vimeo links..." : "Paste direct image links..."}
                      value={formData.url}
                      onChange={e => setFormData({ ...formData, url: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white resize-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={!formData.url || isAnalyzing || formData.url.includes('\n')}
                    className={cn(
                      "h-14 sm:w-14 shrink-0 rounded-2xl border flex items-center justify-center gap-3 sm:gap-0 transition-all active:scale-95",
                      isAnalyzing ? "bg-brand-primary/10 border-brand-primary/50 text-brand-primary" : "bg-white/5 border-white/10 text-white/40 hover:text-white disabled:opacity-30"
                    )}
                    title={formData.url.includes('\n') ? "AI Magic disabled for bulk" : "AI Meta-Data Generator"}
                  >
                    <Wand2 className={cn("w-5 h-5", isAnalyzing && "animate-spin")} />
                    <span className="sm:hidden font-bold text-xs uppercase">Run AI Magic</span>
                  </button>
                </div>
                
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
                <div className="mt-3 p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                           <PlayCircle className="w-12 h-12 text-white/80 drop-shadow-2xl" />
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
                    <div className="error-ui hidden absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-500/5">
                      <X className="w-8 h-8 text-red-500/40 mb-2" />
                      <p className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest">Visibility Error</p>
                      <p className="text-[9px] text-text-dim mt-2 leading-relaxed max-w-[200px]">
                        URL might be restricted or broken. Use a direct image address.
                      </p>
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
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all appearance-none text-white font-bold"
                >
                  <option value="" className="bg-bg-dark">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name} className="bg-bg-dark">{cat.name}</option>
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
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all resize-none text-white h-[140px]"
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
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-white"
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
                {formData.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold uppercase tracking-widest rounded-lg border border-brand-primary/20 hover:bg-brand-primary/20 transition-all group">
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
          className="w-full h-16 md:h-18 bg-white text-bg-dark font-display font-black text-lg uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-2xl shadow-white/5"
        >
          {isUploading ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-bg-dark/20 border-t-bg-dark rounded-full animate-spin" />
              <span>Sanctifying Assets...</span>
            </div>
          ) : (
            <>
              <UploadIcon className="w-6 h-6" /> Confirm & Post Asset
            </>
          )}
        </button>
      </form>
    </div>
  );
}
