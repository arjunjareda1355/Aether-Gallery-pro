import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Crop, Sparkles, UserCircle, RefreshCw, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import ImageCropperModal from './ImageCropperModal';

interface ProfileAvatarEditorProps {
  currentPhotoURL?: string | null;
  displayName?: string | null;
  onAvatarChange: (newPhotoURL: string) => void;
}

type TabType = 'upload' | 'link' | 'presets';

const DICEBEAR_STYLES = [
  { id: 'avataaars', name: 'Avataaars' },
  { id: 'bottts', name: 'Robotics' },
  { id: 'lorelei', name: 'Lorelei' },
  { id: 'adventurer', name: 'Adventurer' },
  { id: 'fun-emoji', name: 'Emoji' },
  { id: 'pixel-art', name: 'Pixel Art' },
];

export default function ProfileAvatarEditor({
  currentPhotoURL,
  displayName,
  onAvatarChange
}: ProfileAvatarEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [linkInput, setLinkInput] = useState('');
  const [linkPreviewStatus, setLinkPreviewStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedPresetSeed, setSelectedPresetSeed] = useState(Date.now().toString(36));

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file selection
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, GIF, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCropperImageSrc(result);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle URL verification and application
  const handleVerifyLink = (url: string) => {
    if (!url.trim()) {
      setLinkPreviewStatus('idle');
      return;
    }
    setLinkPreviewStatus('loading');
    const testImg = new Image();
    testImg.onload = () => setLinkPreviewStatus('valid');
    testImg.onerror = () => setLinkPreviewStatus('invalid');
    testImg.src = url.trim();
  };

  const handleApplyLinkDirectly = () => {
    if (!linkInput.trim()) return;
    onAvatarChange(linkInput.trim());
  };

  const handleCropLinkImage = () => {
    if (!linkInput.trim()) return;
    setCropperImageSrc(linkInput.trim());
    setCropperOpen(true);
  };

  // Handle Preset selection
  const handleSelectPreset = (styleId: string) => {
    const seed = `${displayName || 'user'}_${selectedPresetSeed}_${styleId}`;
    const generatedUrl = `https://api.dicebear.com/7.x/${styleId}/svg?seed=${seed}`;
    onAvatarChange(generatedUrl);
  };

  const handleRerollPresets = () => {
    setSelectedPresetSeed(Math.random().toString(36).substring(2, 9));
  };

  // Crop Completed Callback
  const handleCropComplete = (croppedDataUrl: string) => {
    onAvatarChange(croppedDataUrl);
  };

  return (
    <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
      {/* Top Header & Active Preview */}
      <div className="flex flex-col sm:flex-row items-center gap-4 pb-3 border-b border-white/5">
        {/* Avatar Visualizer */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-black/40 border-2 border-brand-primary/40 p-0.5 shadow-xl relative ring-4 ring-brand-primary/5">
            <div className="w-full h-full rounded-[14px] overflow-hidden bg-white/5 flex items-center justify-center">
              {currentPhotoURL ? (
                <img
                  src={currentPhotoURL}
                  alt="Avatar preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle className="w-10 h-10 text-text-dim/40" />
              )}
            </div>
          </div>

          {currentPhotoURL && (
            <button
              type="button"
              onClick={() => {
                setCropperImageSrc(currentPhotoURL);
                setCropperOpen(true);
              }}
              title="Crop / Recenter Current Avatar"
              className="absolute -bottom-1 -right-1 p-1.5 bg-brand-primary text-bg-dark rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <Crop className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Info & Crop button */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-main">
              Profile Avatar
            </span>
            <span className="px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[8px] font-black uppercase tracking-wider">
              High Resolution
            </span>
          </div>
          <p className="text-[11px] text-text-dim/70 leading-relaxed font-light">
            Upload from device, host via direct link, or synthesize an avatar. Includes real-time crop, pan & rotate.
          </p>

          {currentPhotoURL && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setCropperImageSrc(currentPhotoURL);
                  setCropperOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand-primary/40 rounded-xl text-[9px] font-black uppercase tracking-wider text-brand-primary transition-all active:scale-95 cursor-pointer"
              >
                <Crop className="w-3 h-3" />
                <span>Crop / Reframe</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={cn(
            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'upload'
              ? "bg-brand-primary text-bg-dark shadow-sm"
              : "text-text-dim/60 hover:text-text-main"
          )}
        >
          <Upload className="w-3 h-3" />
          <span>Upload File</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('link')}
          className={cn(
            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'link'
              ? "bg-brand-primary text-bg-dark shadow-sm"
              : "text-text-dim/60 hover:text-text-main"
          )}
        >
          <LinkIcon className="w-3 h-3" />
          <span>Host by Link</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={cn(
            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'presets'
              ? "bg-brand-primary text-bg-dark shadow-sm"
              : "text-text-dim/60 hover:text-text-main"
          )}
        >
          <Sparkles className="w-3 h-3" />
          <span>AI Avatars</span>
        </button>
      </div>

      {/* Tab 1: Upload File */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group",
              isDraggingFile
                ? "border-brand-primary bg-brand-primary/10 scale-[0.99]"
                : "border-white/10 hover:border-brand-primary/40 bg-white/[0.01] hover:bg-white/[0.03]"
            )}
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-text-main">
              Click to choose image or drag & drop
            </p>
            <p className="text-[10px] text-text-dim/60 mt-1 font-mono">
              PNG, JPG, WEBP, GIF up to 25MB • Opens crop tool immediately
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Host by Link */}
      {activeTab === 'link' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">
              Direct Image Link (Hosted URL)
            </label>
            <div className="relative">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  handleVerifyLink(e.target.value);
                }}
                placeholder="https://i.imgur.com/... or https://i.postimg.cc/... or Cloudinary"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-xs outline-none focus:border-brand-primary font-mono text-text-main"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {linkPreviewStatus === 'loading' && (
                  <div className="w-3.5 h-3.5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                )}
                {linkPreviewStatus === 'valid' && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
                {linkPreviewStatus === 'invalid' && (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </div>
          </div>

          {/* Quick link action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={!linkInput.trim()}
              onClick={handleCropLinkImage}
              className="flex-1 py-2.5 px-3 bg-brand-primary text-bg-dark font-black text-[9px] uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop & Frame Link Image</span>
            </button>
            <button
              type="button"
              disabled={!linkInput.trim()}
              onClick={handleApplyLinkDirectly}
              className="py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-text-main font-black text-[9px] uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Apply Direct Link
            </button>
          </div>

          {/* Helper info */}
          <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center gap-2 text-[9px] text-text-dim/60">
            <ImageIcon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>
              Supports Postimages, Imgur, ImgBB, Cloudinary, Unsplash, Discord CDN, or any HTTPS direct image URL.
            </span>
          </div>
        </div>
      )}

      {/* Tab 3: Presets */}
      {activeTab === 'presets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">
              Synthesize Avatar Style
            </span>
            <button
              type="button"
              onClick={handleRerollPresets}
              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-brand-primary hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-roll Seeds</span>
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DICEBEAR_STYLES.map((style) => {
              const previewUrl = `https://api.dicebear.com/7.x/${style.id}/svg?seed=${displayName || 'user'}_${selectedPresetSeed}_${style.id}`;
              const isSelected = currentPhotoURL === previewUrl;

              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleSelectPreset(style.id)}
                  className={cn(
                    "p-2 rounded-2xl bg-white/[0.02] border transition-all flex flex-col items-center gap-1.5 group active:scale-95 cursor-pointer",
                    isSelected
                      ? "border-brand-primary ring-2 ring-brand-primary/20 bg-brand-primary/5"
                      : "border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
                  )}
                >
                  <img
                    src={previewUrl}
                    alt={style.name}
                    className="w-10 h-10 rounded-xl bg-white/5 object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[8px] font-black uppercase tracking-wider text-text-dim/70 truncate w-full text-center">
                    {style.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Cropper Modal Instance */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
