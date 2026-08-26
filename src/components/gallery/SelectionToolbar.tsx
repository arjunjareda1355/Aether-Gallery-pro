import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Trash2, 
  Share2, 
  Download, 
  Folder, 
  Lock, 
  Unlock, 
  Edit3, 
  Tag, 
  Link as LinkIcon, 
  Sparkles,
  Layers,
  AlertTriangle,
  ChevronUp
} from 'lucide-react';
import { Image, Category, User } from '../../types';
import { cn } from '../../lib/utils';

interface SelectionToolbarProps {
  selectedPostIds: Set<string>;
  totalVisiblePosts: number;
  allVisibleImages: Image[];
  categories: Category[];
  user: User | null;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onExitSelectMode: () => void;
  onBulkChangeCategory: (category: string) => Promise<void>;
  onBulkChangeVisibility: (isPremium: boolean) => Promise<void>;
  onBulkChangeTitle: (newTitle: string) => Promise<void>;
  onBulkAddTags: (tags: string[]) => Promise<void>;
  onBulkUpdateUrl: (id: string, url: string) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onBulkDownload: () => Promise<void>;
  onBulkShare: () => Promise<void>;
}

type ActiveActionModal = 'category' | 'access' | 'edit' | 'tags' | 'delete' | null;

export default function SelectionToolbar({
  selectedPostIds,
  totalVisiblePosts,
  allVisibleImages,
  categories,
  user,
  onToggleSelectAll,
  onClearSelection,
  onExitSelectMode,
  onBulkChangeCategory,
  onBulkChangeVisibility,
  onBulkChangeTitle,
  onBulkAddTags,
  onBulkUpdateUrl,
  onBulkDelete,
  onBulkDownload,
  onBulkShare,
}: SelectionToolbarProps) {
  const [activeModal, setActiveModal] = useState<ActiveActionModal>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newTagsInput, setNewTagsInput] = useState<string>('');
  const [singleUrlInput, setSingleUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const selectedCount = selectedPostIds.size;
  const isAllSelected = selectedCount > 0 && selectedCount === totalVisiblePosts;

  const selectedImages = allVisibleImages.filter(img => selectedPostIds.has(img.id));
  const singleImage = selectedCount === 1 ? selectedImages[0] : null;

  useEffect(() => {
    if (singleImage) {
      setSingleUrlInput(singleImage.url || '');
      setNewTitle(singleImage.title || '');
      setNewTagsInput(singleImage.tags?.join(', ') || '');
    }
  }, [singleImage?.id]);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        if (activeModal) {
          setActiveModal(null);
        } else {
          onExitSelectMode();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onToggleSelectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, onExitSelectMode, onToggleSelectAll]);

  const handleApplyCategory = async () => {
    if (!selectedCategory) return;
    setIsProcessing(true);
    try {
      await onBulkChangeCategory(selectedCategory);
      setActiveModal(null);
      setSelectedCategory('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyTitle = async () => {
    if (!newTitle.trim()) return;
    setIsProcessing(true);
    try {
      await onBulkChangeTitle(newTitle.trim());
      setActiveModal(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyTags = async () => {
    const parsedTags = newTagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    if (parsedTags.length === 0) return;

    setIsProcessing(true);
    try {
      await onBulkAddTags(parsedTags);
      setActiveModal(null);
      setNewTagsInput('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySingleUrl = async () => {
    if (!singleImage || !singleUrlInput.trim() || singleUrlInput.trim() === singleImage.url) return;
    setIsProcessing(true);
    try {
      await onBulkUpdateUrl(singleImage.id, singleUrlInput.trim());
      setActiveModal(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete();
      setActiveModal(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Island Command Bar */}
      <motion.div
        key="selection-floating-bar"
        initial={{ opacity: 0, y: 40, x: "-50%", scale: 0.95 }}
        animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
        exit={{ opacity: 0, y: 40, x: "-50%", scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-6 left-1/2 z-[100] max-w-[96vw] w-auto select-none"
      >
        <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/20 px-3.5 py-2.5 md:px-5 md:py-3 rounded-2xl md:rounded-full shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.05)] text-white">
          
          {/* Selected Count & Toggle All */}
          <div className="flex items-center gap-2 pr-2 md:pr-3 border-r border-white/15">
            <button
              onClick={onToggleSelectAll}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
                isAllSelected 
                  ? "bg-brand-primary text-bg-dark shadow-[0_0_16px_rgba(var(--color-brand-primary-rgb),0.5)] scale-[1.02]" 
                  : "bg-white/10 hover:bg-white/15 text-white"
              )}
              title={isAllSelected ? "Deselect all visible items" : "Select all visible items (Ctrl+A)"}
            >
              <div className={cn(
                "w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-all",
                isAllSelected ? "bg-bg-dark border-bg-dark text-brand-primary" : "border-white/50 bg-black/40"
              )}>
                {isAllSelected && <Check className="w-3 h-3 stroke-[3.5]" />}
              </div>
              <span className="font-mono text-sm">{selectedCount}</span>
              <span className="hidden sm:inline text-xs font-medium text-white/70">
                / {totalVisiblePosts}
              </span>
            </button>
            
            {selectedCount > 0 && (
              <button
                onClick={onClearSelection}
                className="text-[11px] text-white/50 hover:text-white transition-colors uppercase tracking-wider font-bold px-2 py-1 rounded-md hover:bg-white/10"
                title="Clear selection"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Action Buttons (Enabled when > 0 items selected) */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Category Change */}
            <button
              onClick={() => setActiveModal('category')}
              disabled={selectedCount === 0}
              className={cn(
                "flex items-center gap-2 px-3 md:px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer",
                selectedCount > 0
                  ? "bg-white/8 hover:bg-white/20 text-white border border-white/15 active:scale-95 hover:border-brand-primary/40 shadow-sm"
                  : "opacity-40 cursor-not-allowed text-white/40"
              )}
              title="Change Category"
            >
              <Folder className="w-4.5 h-4.5 text-brand-primary" />
              <span className="hidden md:inline">Category</span>
            </button>

            {/* Access Toggle */}
            <button
              onClick={() => setActiveModal('access')}
              disabled={selectedCount === 0}
              className={cn(
                "flex items-center gap-2 px-3 md:px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer",
                selectedCount > 0
                  ? "bg-white/8 hover:bg-white/20 text-white border border-white/15 active:scale-95 hover:border-amber-400/40 shadow-sm"
                  : "opacity-40 cursor-not-allowed text-white/40"
              )}
              title="Change Access (Public / Premium)"
            >
              <Lock className="w-4.5 h-4.5 text-amber-400" />
              <span className="hidden md:inline">Access</span>
            </button>

            {/* Edit Details */}
            <button
              onClick={() => setActiveModal('edit')}
              disabled={selectedCount === 0}
              className={cn(
                "flex items-center gap-2 px-3 md:px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer",
                selectedCount > 0
                  ? "bg-white/8 hover:bg-white/20 text-white border border-white/15 active:scale-95 hover:border-cyan-400/40 shadow-sm"
                  : "opacity-40 cursor-not-allowed text-white/40"
              )}
              title="Edit Title & Tags"
            >
              <Edit3 className="w-4.5 h-4.5 text-cyan-400" />
              <span className="hidden md:inline">Edit</span>
            </button>

            {/* Share */}
            <button
              onClick={onBulkShare}
              disabled={selectedCount === 0}
              className={cn(
                "p-2 md:px-3.5 md:py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
                selectedCount > 0
                  ? "bg-white/8 hover:bg-white/20 text-white border border-white/15 active:scale-95 hover:border-blue-400/40 shadow-sm"
                  : "opacity-40 cursor-not-allowed text-white/40"
              )}
              title="Share Selected Items"
            >
              <Share2 className="w-4.5 h-4.5 text-blue-400" />
              <span className="hidden lg:inline">Share</span>
            </button>

            {/* Download */}
            <button
              onClick={onBulkDownload}
              disabled={selectedCount === 0}
              className={cn(
                "p-2 md:px-3.5 md:py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
                selectedCount > 0
                  ? "bg-white/8 hover:bg-white/20 text-white border border-white/15 active:scale-95 hover:border-emerald-400/40 shadow-sm"
                  : "opacity-40 cursor-not-allowed text-white/40"
              )}
              title="Download Selected Media"
            >
              <Download className="w-4.5 h-4.5 text-emerald-400" />
              <span className="hidden lg:inline">Download</span>
            </button>

            {/* Expunge / Delete (Admin / Owner) */}
            {user?.isAdmin && (
              <button
                onClick={() => setActiveModal('delete')}
                disabled={selectedCount === 0}
                className={cn(
                  "p-2 md:px-3.5 md:py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
                  selectedCount > 0
                    ? "bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 active:scale-95 shadow-sm"
                    : "opacity-40 cursor-not-allowed text-red-500/30"
                )}
                title="Delete Selected Items"
              >
                <Trash2 className="w-4.5 h-4.5 text-red-400" />
                <span className="hidden md:inline">Delete</span>
              </button>
            )}
          </div>

          {/* Exit / Done button */}
          <div className="pl-2 md:pl-3 border-l border-white/15">
            <button
              onClick={onExitSelectMode}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer border border-white/10"
              title="Exit Selection Mode (Esc)"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span className="text-xs uppercase tracking-wider">Done</span>
            </button>
          </div>

        </div>
      </motion.div>

      {/* Professional Popover Modals for Selection Mode Actions */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setActiveModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-bg-dark border border-white/15 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] z-10 text-white space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    {activeModal === 'category' && <Folder className="w-4 h-4" />}
                    {activeModal === 'access' && <Lock className="w-4 h-4" />}
                    {activeModal === 'edit' && <Edit3 className="w-4 h-4" />}
                    {activeModal === 'delete' && <Trash2 className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm uppercase tracking-tight">
                      {activeModal === 'category' && 'Transmute Category'}
                      {activeModal === 'access' && 'Update Asset Access'}
                      {activeModal === 'edit' && 'Batch Edit Metadata'}
                      {activeModal === 'delete' && 'Expunge Selected Manifestations'}
                    </h3>
                    <p className="text-[10px] text-white/50 font-mono mt-0.5">
                      Applying to {selectedCount} selected {selectedCount === 1 ? 'post' : 'posts'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !isProcessing && setActiveModal(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: Category */}
              {activeModal === 'category' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 block">
                    Choose Destination Category
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                    {categories.map((cat, idx) => (
                      <button
                        key={`cat-select-${cat.id || idx}-${idx}`}
                        type="button"
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between",
                          selectedCategory === cat.slug
                            ? "bg-brand-primary text-bg-dark border-brand-primary font-bold shadow-md"
                            : "bg-white/[0.03] border-white/10 hover:bg-white/10 text-white/90"
                        )}
                      >
                        <span className="truncate">{cat.name}</span>
                        {selectedCategory === cat.slug && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCategory}
                      disabled={!selectedCategory || isProcessing}
                      className="px-5 py-2 bg-brand-primary text-bg-dark font-black rounded-xl text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                    >
                      {isProcessing ? 'Applying...' : 'Apply Category'}
                    </button>
                  </div>
                </div>
              )}

              {/* Body: Access (Public vs Premium) */}
              {activeModal === 'access' && (
                <div className="space-y-4">
                  <p className="text-xs text-white/70 leading-relaxed">
                    Adjust access permissions for the selected items across the Sanctuary continuum.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await onBulkChangeVisibility(false);
                          setActiveModal(null);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-green-500/40 hover:bg-green-500/5 transition-all flex flex-col items-center gap-2 text-center group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                        <Unlock className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold">Make Public</span>
                      <span className="text-[9px] text-white/40">Free to view for all initiates</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await onBulkChangeVisibility(true);
                          setActiveModal(null);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all flex flex-col items-center gap-2 text-center group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-brand-primary">Make Premium</span>
                      <span className="text-[9px] text-white/40">Requires Sanctuary membership</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Body: Edit Details */}
              {activeModal === 'edit' && (
                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 block">
                      {selectedCount === 1 ? 'Asset Title' : 'Apply Title Prefix/Name'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Enter title..."
                        className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={handleApplyTitle}
                        disabled={!newTitle.trim() || isProcessing}
                        className="px-3.5 py-2 bg-brand-primary text-bg-dark rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  {/* Add Tags */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 block">
                      Add Tags (comma-separated)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagsInput}
                        onChange={(e) => setNewTagsInput(e.target.value)}
                        placeholder="e.g. 4k, cinematic, aesthetic"
                        className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={handleApplyTags}
                        disabled={!newTagsInput.trim() || isProcessing}
                        className="px-3.5 py-2 bg-brand-primary text-bg-dark rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Single URL edit */}
                  {singleImage && (
                    <div className="space-y-1.5 border-t border-white/10 pt-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                        Direct Media Hosting URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={singleUrlInput}
                          onChange={(e) => setSingleUrlInput(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={handleApplySingleUrl}
                          disabled={!singleUrlInput.trim() || singleUrlInput === singleImage.url || isProcessing}
                          className="px-3.5 py-2 bg-cyan-400 text-bg-dark rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Body: Delete Confirmation */}
              {activeModal === 'delete' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Permanent Expulsion Warning</p>
                      <p className="mt-1 text-[11px] text-red-300/80 leading-relaxed">
                        Are you sure you want to permanently delete <strong>{selectedCount}</strong> {selectedCount === 1 ? 'manifestation' : 'manifestations'}? This action cannot be reversed.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isProcessing}
                      className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isProcessing ? 'Expunging...' : `Expunge ${selectedCount} Items`}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
