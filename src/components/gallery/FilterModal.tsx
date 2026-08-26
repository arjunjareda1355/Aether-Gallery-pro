import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RotateCcw, 
  Sparkles, 
  Shuffle, 
  Flame, 
  Heart, 
  Clock, 
  History, 
  Image as ImageIcon, 
  Film, 
  Layers, 
  Maximize2, 
  Square, 
  Smartphone, 
  Monitor, 
  Tag, 
  Check,
  Compass,
  SlidersHorizontal,
  Crown,
  Users
} from 'lucide-react';
import { cn, useBodyScrollLock } from '../../lib/utils';
import { Category, Image } from '../../types';
import { useTranslation } from 'react-i18next';
import { hapticSelection, hapticSuccess } from '../../lib/haptics';

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  activeCategory: string;
  onCategorySelect: (id: string) => void;
  sortOrder: 'random' | 'latest' | 'popular' | 'oldest' | 'trending';
  onSortSelect: (order: 'random' | 'latest' | 'popular' | 'oldest' | 'trending') => void;
  mediaType: 'all' | 'image' | 'video';
  onMediaTypeSelect: (type: 'all' | 'image' | 'video') => void;
  aspectRatioFilter: 'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide';
  onAspectRatioSelect: (ratio: 'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide') => void;
  minLikesFilter?: number;
  onMinLikesSelect?: (minLikes: number) => void;
  onShuffleFeed?: () => void;
  onSelectTag?: (tag: string) => void;
  availableImages?: Image[];
  isLoggedIn?: boolean;
  totalFilteredCount?: number;
}

export default function FilterModal({
  isOpen,
  onClose,
  categories,
  activeCategory,
  onCategorySelect,
  sortOrder,
  onSortSelect,
  mediaType,
  onMediaTypeSelect,
  aspectRatioFilter,
  onAspectRatioSelect,
  minLikesFilter = 0,
  onMinLikesSelect,
  onShuffleFeed,
  onSelectTag,
  availableImages = [],
  isLoggedIn = false,
  totalFilteredCount
}: FilterModalProps) {
  const { t } = useTranslation();
  useBodyScrollLock(isOpen);

  // Derive popular tags from live feed
  const popularTags = useMemo(() => {
    const tagCountMap: Record<string, number> = {};
    availableImages.forEach(img => {
      if (Array.isArray(img.tags)) {
        img.tags.forEach(t => {
          const clean = t.trim().toLowerCase();
          if (clean && clean.length > 1) {
            tagCountMap[clean] = (tagCountMap[clean] || 0) + 1;
          }
        });
      }
    });

    const sorted = Object.entries(tagCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(entry => entry[0]);

    if (sorted.length < 6) {
      return Array.from(new Set(['cyberpunk', 'cinematic', 'portrait', 'minimalism', 'nature', 'anime', 'abstract', 'wallpaper', 'future', 'dark']));
    }
    return Array.from(new Set(sorted));
  }, [availableImages]);

  // Compute active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeCategory !== 'all') count++;
    if (sortOrder !== 'random') count++;
    if (mediaType !== 'all') count++;
    if (aspectRatioFilter !== 'all') count++;
    if (minLikesFilter > 0) count++;
    return count;
  }, [activeCategory, sortOrder, mediaType, aspectRatioFilter, minLikesFilter]);

  const handleResetAll = () => {
    hapticSuccess();
    onCategorySelect('all');
    onSortSelect('random');
    onMediaTypeSelect('all');
    onAspectRatioSelect('all');
    if (onMinLikesSelect) onMinLikesSelect(0);
  };

  const sortOptions = [
    {
      id: 'random' as const,
      label: 'Random Discovery',
      sublabel: 'Shuffled exploration stream (Default)',
      icon: Shuffle,
      badge: 'Default',
      highlight: true
    },
    {
      id: 'trending' as const,
      label: t('common.trending') || 'Trending Now',
      sublabel: 'High recent engagement & momentum',
      icon: Flame
    },
    {
      id: 'popular' as const,
      label: t('common.popular') || 'Most Appreciated',
      sublabel: 'Highest total community appreciations',
      icon: Heart
    },
    {
      id: 'latest' as const,
      label: t('common.latest') || 'Latest Creations',
      sublabel: 'Newly arrived manifestations',
      icon: Clock
    },
    {
      id: 'oldest' as const,
      label: t('common.oldest') || 'Archival Heritage',
      sublabel: 'Origin sequence from day one',
      icon: History
    }
  ];

  const mediaOptions = [
    { id: 'all' as const, label: 'All Media', desc: 'Photos & Videos', icon: Layers },
    { id: 'image' as const, label: 'Still Art & Photos', desc: 'High-res imagery', icon: ImageIcon },
    { id: 'video' as const, label: 'Motion & Clips', desc: 'Cinematic loops', icon: Film }
  ];

  const ratioOptions = [
    { id: 'all' as const, label: 'All Ratios', desc: 'Any framing', icon: Maximize2, wireframe: 'w-7 h-5' },
    { id: 'portrait' as const, label: 'Portrait (9:16)', desc: 'Mobile / Reels', icon: Smartphone, wireframe: 'w-4 h-6' },
    { id: 'landscape' as const, label: 'Landscape (16:9)', desc: 'Desktop / Cinematic', icon: Monitor, wireframe: 'w-7 h-4' },
    { id: 'square' as const, label: 'Square (1:1)', desc: 'Balanced square', icon: Square, wireframe: 'w-5 h-5' },
    { id: 'ultrawide' as const, label: 'Ultrawide (21:9)', desc: 'Panoramic aspect', icon: Maximize2, wireframe: 'w-8 h-3.5' }
  ];

  const likesOptions = [
    { value: 0, label: 'Any Count' },
    { value: 5, label: '5+ Likes' },
    { value: 20, label: '20+ Likes' },
    { value: 50, label: '50+ Likes' },
    { value: 100, label: '100+ Likes' }
  ];

  const allCategoryOptions = useMemo(() => {
    const list: { id: string; name: string; isSpecial?: boolean; icon?: any }[] = [
      { id: 'all', name: 'All Realms', isSpecial: true, icon: Compass },
      { id: 'premium', name: 'Exclusive Premium', isSpecial: true, icon: Crown }
    ];
    if (isLoggedIn) {
      list.push({ id: 'following', name: 'Following Creators', isSpecial: true, icon: Users });
    }
    const seen = new Set(list.map(item => item.id));
    categories.forEach(cat => {
      if (cat && cat.id && !seen.has(cat.id)) {
        seen.add(cat.id);
        list.push({ id: cat.id, name: cat.name || cat.id });
      }
    });
    return list;
  }, [categories, isLoggedIn]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="absolute inset-0 bg-bg-dark/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-3xl max-h-[90vh] bg-card-dark/95 border border-white/10 rounded-[28px] md:rounded-[36px] shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden backdrop-blur-3xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.1em] text-text-main">
                    Filter & Discovery Studio
                  </h2>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-primary text-bg-dark text-[9px] font-black uppercase tracking-wider">
                      {activeFiltersCount} Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-dim/70 tracking-wide">
                  Configure real-time stream parameters and visual dimensions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-text-dim hover:text-text-main text-[10px] font-bold uppercase tracking-wider transition-all border border-white/5"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-text-dim hover:text-text-main flex items-center justify-center transition-all border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-6">
            {/* Section 1: Curation & Sort Order */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim/90">
                    Curation Mode & Order
                  </span>
                </div>
                {sortOrder === 'random' && (
                  <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest flex items-center gap-1">
                    <Shuffle className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                    Randomized Stream
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {sortOptions.map((opt, idx) => {
                  const Icon = opt.icon;
                  const isSelected = sortOrder === opt.id;

                  return (
                    <button
                      key={`sort-${opt.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        onSortSelect(opt.id);
                      }}
                      className={cn(
                        "relative flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all duration-200 border cursor-pointer group",
                        isSelected
                          ? "bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.15)] text-text-main"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 text-text-dim hover:text-text-main"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        isSelected 
                          ? "bg-brand-primary text-bg-dark font-bold" 
                          : "bg-white/[0.04] text-text-dim group-hover:text-brand-primary"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[11px] font-black uppercase tracking-wider", isSelected ? "text-brand-primary" : "text-text-main")}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.2 rounded-full bg-brand-primary/20 text-brand-primary text-[8px] font-bold uppercase">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-dim/60 line-clamp-1 mt-0.5">
                          {opt.sublabel}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-brand-primary text-bg-dark flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Media Format */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim/90">
                  Media Classification
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {mediaOptions.map((med, idx) => {
                  const Icon = med.icon;
                  const isSelected = mediaType === med.id;

                  return (
                    <button
                      key={`media-${med.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        onMediaTypeSelect(med.id);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3.5 rounded-2xl text-center transition-all duration-200 border cursor-pointer group",
                        isSelected
                          ? "bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.15)] text-text-main"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 text-text-dim hover:text-text-main"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-colors",
                        isSelected 
                          ? "bg-brand-primary text-bg-dark" 
                          : "bg-white/[0.04] text-text-dim group-hover:text-brand-primary"
                      )}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className={cn("text-[11px] font-bold uppercase tracking-wider", isSelected ? "text-brand-primary" : "text-text-main")}>
                        {med.label}
                      </span>
                      <span className="text-[9px] text-text-dim/60 mt-0.5 font-medium">
                        {med.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Aspect Ratio Framing */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Maximize2 className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim/90">
                  Aspect Ratio & Proportion
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {ratioOptions.map((rat, idx) => {
                  const isSelected = aspectRatioFilter === rat.id;

                  return (
                    <button
                      key={`ratio-${rat.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        onAspectRatioSelect(rat.id);
                      }}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-2xl text-center transition-all duration-200 border cursor-pointer group",
                        isSelected
                          ? "bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.15)] text-text-main"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 text-text-dim hover:text-text-main"
                      )}
                    >
                      {/* Visual Wireframe Aspect Ratio Representation */}
                      <div className="h-9 flex items-center justify-center mb-1.5">
                        <div className={cn(
                          "rounded-md border-2 transition-all flex items-center justify-center",
                          rat.wireframe,
                          isSelected 
                            ? "border-brand-primary bg-brand-primary/20 shadow-sm" 
                            : "border-white/20 bg-white/[0.02] group-hover:border-brand-primary/50"
                        )}>
                          <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-brand-primary" : "bg-white/20")} />
                        </div>
                      </div>

                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", isSelected ? "text-brand-primary" : "text-text-main")}>
                        {rat.label}
                      </span>
                      <span className="text-[8px] text-text-dim/50 mt-0.5">
                        {rat.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Realm / Categories */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim/90">
                    Category Realm
                  </span>
                </div>
                <span className="text-[10px] text-text-dim/50 uppercase font-mono">
                  {allCategoryOptions.length} Realms
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {allCategoryOptions.map((cat, idx) => {
                  const Icon = cat.icon;
                  const isSelected = activeCategory === cat.id;

                  return (
                    <button
                      key={`cat-modal-${cat.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        onCategorySelect(cat.id);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer",
                        isSelected
                          ? "bg-brand-primary text-bg-dark border-brand-primary shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)] font-black scale-105"
                          : "bg-white/[0.03] text-text-dim hover:text-text-main hover:bg-white/[0.07] border-white/5 hover:border-white/15"
                      )}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{cat.name}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Minimum Appreciation / Likes */}
            {onMinLikesSelect && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim/90">
                    Appreciation Filter (Likes)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {likesOptions.map((opt, idx) => {
                    const isSelected = minLikesFilter === opt.value;
                    return (
                      <button
                        key={`likes-opt-${opt.value}-${idx}`}
                        type="button"
                        onClick={() => {
                          hapticSelection();
                          onMinLikesSelect(opt.value);
                        }}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer",
                          isSelected
                            ? "bg-brand-primary/20 text-brand-primary border-brand-primary shadow-sm font-black"
                            : "bg-white/[0.02] text-text-dim hover:text-text-main hover:bg-white/[0.05] border-white/5"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 6: Trending Frequency Tags */}
            {popularTags.length > 0 && onSelectTag && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim/90">
                    Trending Frequency Tags
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {popularTags.map((tag, idx) => (
                    <button
                      key={`pop-tag-${tag}-${idx}`}
                      type="button"
                      onClick={() => {
                        hapticSelection();
                        onSelectTag(tag);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.02] hover:bg-brand-primary/10 text-text-dim hover:text-brand-primary text-[10px] font-medium tracking-wide transition-colors border border-white/5 hover:border-brand-primary/30"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer Actions */}
          <div className="px-6 py-4 border-t border-white/[0.07] bg-white/[0.02] flex items-center justify-between gap-3">
            {/* Quick Reshuffle Action */}
            {onShuffleFeed && (
              <button
                type="button"
                onClick={() => {
                  hapticSuccess();
                  onSortSelect('random');
                  onShuffleFeed();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-text-main text-[11px] font-bold uppercase tracking-wider border border-white/10 transition-all active:scale-95"
                title="Randomize and re-roll your entire feed now"
              >
                <Shuffle className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden xs:inline">Reshuffle Feed</span>
                <span className="xs:hidden">Shuffle</span>
              </button>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-7 py-2.5 bg-brand-primary text-bg-dark rounded-2xl font-black uppercase text-[11px] tracking-[0.15em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(var(--brand-primary-rgb),0.35)] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {typeof totalFilteredCount === 'number' 
                    ? `Show ${totalFilteredCount} Creations` 
                    : 'Apply & Explore'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
