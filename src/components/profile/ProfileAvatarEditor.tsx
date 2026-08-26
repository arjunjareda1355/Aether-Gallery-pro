import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Crop, Sparkles, UserCircle, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import ImageCropperModal from './ImageCropperModal';

interface ProfileAvatarEditorProps {
  currentPhotoURL?: string | null;
  displayName?: string | null;
  onAvatarChange: (newPhotoURL: string) => void;
}

type TabType = 'upload' | 'link' | 'presets';

const DICEBEAR_STYLES = [
  { id: 'avataaars', name: 'Avatars' },
  { id: 'bottts', name: 'Robots' },
  { id: 'lorelei', name: 'Lorelei' },
  { id: 'adventurer', name: 'Adventurer' },
  { id: 'fun-emoji', name: 'Emoji' },
  { id: 'pixel-art', name: 'Pixel' },
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
    <div className="space-y-2.5 bg-white/[0.02] border border-white/5 rounded-2xl p-3 sm:p-3.5">
      {/* Minimized Top Row: Avatar & Mode Selector */}
      <div className="flex items-center gap-3">
        {/* Avatar Visualizer */}
        <div className="relative group shrink-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-brand-primary/30 p-0.5 shadow-md relative">
            <div className="w-full h-full rounded-[10px] overflow-hidden bg-white/5 flex items-center justify-center">
              {currentPhotoURL ? (
                <img
                  src={currentPhotoURL}
                  alt="Avatar preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle className="w-7 h-7 text-text-dim/40" />
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
              title="Crop / Recenter"
              className="absolute -bottom-1 -right-1 p-1 bg-brand-primary text-bg-dark rounded-lg shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Crop className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Minimized Tabs Bar */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-1 p-0.5 bg-white/[0.02] border border-white/5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap",
                activeTab === 'upload'
                  ? "bg-brand-primary text-bg-dark shadow-sm"
                  : "text-text-dim/60 hover:text-text-main"
              )}
            >
              <Upload className="w-2.5 h-2.5" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap",
                activeTab === 'link'
                  ? "bg-brand-primary text-bg-dark shadow-sm"
                  : "text-text-dim/60 hover:text-text-main"
              )}
            >
              <LinkIcon className="w-2.5 h-2.5" />
              <span>Link</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap",
                activeTab === 'presets'
                  ? "bg-brand-primary text-bg-dark shadow-sm"
                  : "text-text-dim/60 hover:text-text-main"
              )}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Minimized Tab 1: Upload File */}
      {activeTab === 'upload' && (
        <div>
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
              "border border-dashed rounded-xl p-3 flex items-center justify-center gap-2 text-center cursor-pointer transition-all duration-200 group",
              isDraggingFile
                ? "border-brand-primary bg-brand-primary/10"
                : "border-white/10 hover:border-brand-primary/30 bg-white/[0.01] hover:bg-white/[0.03]"
            )}
          >
            <Upload className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="text-[9.5px] font-bold text-text-dim group-hover:text-text-main">
              Choose photo or drag & drop (PNG, JPG, WEBP)
            </span>
          </div>
        </div>
      )}

      {/* Minimized Tab 2: Host by Link */}
      {activeTab === 'link' && (
        <div className="space-y-2">
          <div className="relative flex items-center">
            <input
              type="url"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                handleVerifyLink(e.target.value);
              }}
              placeholder="Paste direct image URL..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 pr-8 text-[10px] outline-none focus:border-brand-primary font-mono text-text-main"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {linkPreviewStatus === 'loading' && (
                <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              )}
              {linkPreviewStatus === 'valid' && (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {linkPreviewStatus === 'invalid' && (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!linkInput.trim()}
              onClick={handleCropLinkImage}
              className="flex-1 py-1.5 px-2.5 bg-brand-primary text-bg-dark font-black text-[8.5px] uppercase tracking-wider rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <Crop className="w-3 h-3" />
              <span>Crop & Set</span>
            </button>
            <button
              type="button"
              disabled={!linkInput.trim()}
              onClick={handleApplyLinkDirectly}
              className="py-1.5 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-text-main font-black text-[8.5px] uppercase tracking-wider rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Apply Direct
            </button>
          </div>
        </div>
      )}

      {/* Minimized Tab 3: AI Presets */}
      {activeTab === 'presets' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-widest text-text-dim/50">
              Select generated seed
            </span>
            <button
              type="button"
              onClick={handleRerollPresets}
              className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-brand-primary hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Re-roll</span>
            </button>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {DICEBEAR_STYLES.map((style, idx) => {
              const previewUrl = `https://api.dicebear.com/7.x/${style.id}/svg?seed=${displayName || 'user'}_${selectedPresetSeed}_${style.id}`;
              const isSelected = currentPhotoURL === previewUrl;

              return (
                <button
                  key={`style-${style.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelectPreset(style.id)}
                  title={style.name}
                  className={cn(
                    "p-1 rounded-xl bg-white/[0.02] border transition-all flex flex-col items-center gap-1 active:scale-95 cursor-pointer",
                    isSelected
                      ? "border-brand-primary ring-1 ring-brand-primary/30 bg-brand-primary/10"
                      : "border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  <img
                    src={previewUrl}
                    alt={style.name}
                    className="w-7 h-7 rounded-lg bg-white/5 object-cover"
                  />
                  <span className="text-[7px] font-bold text-text-dim/60 truncate w-full text-center">
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
