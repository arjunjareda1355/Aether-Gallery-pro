import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shuffle, 
  SlidersHorizontal, 
  X,
  Layers,
  Image as ImageIcon,
  Film,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Category } from '../../types';
import { hapticSelection, hapticSuccess } from '../../lib/haptics';

interface CategoryMenuProps {
  categories: Category[];
  activeCategoryId: string;
  onCategorySelect: (id: string) => void;
  sortOrder: 'random' | 'latest' | 'popular' | 'oldest' | 'trending';
  onSortSelect: (order: 'random' | 'latest' | 'popular' | 'oldest' | 'trending') => void;
  mediaType: 'all' | 'image' | 'video';
  onMediaTypeSelect: (type: 'all' | 'image' | 'video') => void;
  aspectRatioFilter: 'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide';
  onAspectRatioSelect: (ratio: 'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide') => void;
  onOpenFilterModal?: () => void;
  onShuffleFeed?: () => void;
  isLoggedIn?: boolean;
}

export default function CategoryMenu({ 
  categories, 
  activeCategoryId, 
  onCategorySelect, 
  sortOrder, 
  onSortSelect,
  mediaType,
  onMediaTypeSelect,
  aspectRatioFilter,
  onAspectRatioSelect,
  onOpenFilterModal,
  onShuffleFeed,
  isLoggedIn
}: CategoryMenuProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const allOptions = useMemo(() => {
    const options = [
      { id: 'all', name: t('common.all') || 'All' },
      { id: 'premium', name: t('common.premium') || 'Premium' }
    ];

    if (isLoggedIn) {
      options.push({ id: 'following', name: t('common.following') || 'Following' });
    }

    const seen = new Set(options.map(o => o.id));
    categories.forEach(c => {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        options.push({ id: c.id, name: c.name || c.id });
      }
    });

    return options;
  }, [categories, isLoggedIn, t]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeCategoryId !== 'all') count++;
    if (sortOrder !== 'random') count++;
    if (mediaType !== 'all') count++;
    if (aspectRatioFilter !== 'all') count++;
    return count;
  }, [activeCategoryId, sortOrder, mediaType, aspectRatioFilter]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth / 2 
        : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleShuffle = () => {
    hapticSuccess();
    if (sortOrder !== 'random') {
      onSortSelect('random');
    }
    if (onShuffleFeed) {
      onShuffleFeed();
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5 py-1 select-none">
      {/* Primary Category Row + Fast Controls */}
      <div className="flex items-center gap-2">
        {/* Shuffle Feed Button - Prominent & Tactile */}
        <button
          type="button"
          onClick={handleShuffle}
          className={cn(
            "shrink-0 h-10 px-3.5 rounded-full flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer group active:scale-95",
            sortOrder === 'random'
              ? "bg-brand-primary/15 text-brand-primary border-brand-primary/40 shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.2)]"
              : "bg-white/[0.03] text-text-dim hover:text-text-main hover:bg-white/[0.08] border-white/10"
          )}
          title="Reshuffle & Randomize Feed Stream"
        >
          <Shuffle className="w-3.5 h-3.5 text-brand-primary group-hover:rotate-45 transition-transform duration-300" />
          <span className="hidden sm:inline">Shuffle</span>
        </button>

        {/* Categories Horizontal Carousel */}
        <div className="relative flex-1 min-w-0 group/scroll">
          {/* Scroll Buttons - Desktop */}
          <button 
            type="button"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 flex items-center justify-center bg-bg-dark/90 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover/scroll:opacity-100 transition-opacity hidden md:flex hover:bg-white/10"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button 
            type="button"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 flex items-center justify-center bg-bg-dark/90 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover/scroll:opacity-100 transition-opacity hidden md:flex hover:bg-white/10"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>

          <div 
            ref={scrollRef}
            className="flex items-center flex-nowrap gap-2 overflow-x-auto no-scrollbar scroll-smooth p-0.5 touch-pan-x whitespace-nowrap mask-edges"
          >
            {allOptions.map((cat, idx) => {
              const isSelected = activeCategoryId === cat.id;

              return (
                <button
                  key={`cat-chip-${cat.id || idx}-${idx}`}
                  type="button"
                  onClick={() => {
                    hapticSelection();
                    onCategorySelect(cat.id);
                  }}
                  className={cn(
                    "relative flex-shrink-0 min-w-max h-10 px-4.5 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-300 border cursor-pointer",
                    isSelected 
                      ? "bg-brand-primary text-bg-dark border-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] font-black scale-102" 
                      : "bg-white/[0.03] text-text-dim hover:text-text-main hover:bg-white/[0.08] hover:border-white/15 border-white/5"
                  )}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {cat.id === 'premium' && <Sparkles className="w-3 h-3 text-amber-300" />}
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Studio Launcher Button */}
        {onOpenFilterModal && (
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              onOpenFilterModal();
            }}
            className={cn(
              "shrink-0 h-10 px-3.5 rounded-full flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer active:scale-95",
              activeFiltersCount > 0
                ? "bg-brand-primary text-bg-dark border-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] font-black"
                : "bg-white/[0.03] text-text-dim hover:text-text-main hover:bg-white/[0.08] border-white/10"
            )}
            title="Open Deep Filter Studio"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-bg-dark text-brand-primary text-[9px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Active Filters Summary Strip (Appears when non-default filters are active) */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap text-[10px]">
          <span className="text-text-dim/50 uppercase font-mono tracking-widest text-[9px] shrink-0">
            Active:
          </span>

          {activeCategoryId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-primary/15 border border-brand-primary/30 text-brand-primary font-bold uppercase tracking-wider">
              Realm: {allOptions.find(c => c.id === activeCategoryId)?.name || activeCategoryId}
              <button 
                type="button" 
                onClick={() => onCategorySelect('all')}
                className="hover:text-white ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {sortOrder !== 'random' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-text-main font-bold uppercase tracking-wider">
              Sort: {sortOrder}
              <button 
                type="button" 
                onClick={() => onSortSelect('random')}
                className="hover:text-brand-primary ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {mediaType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-text-main font-bold uppercase tracking-wider">
              Format: {mediaType === 'image' ? 'Photos' : 'Videos'}
              <button 
                type="button" 
                onClick={() => onMediaTypeSelect('all')}
                className="hover:text-brand-primary ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {aspectRatioFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-text-main font-bold uppercase tracking-wider">
              Ratio: {aspectRatioFilter}
              <button 
                type="button" 
                onClick={() => onAspectRatioSelect('all')}
                className="hover:text-brand-primary ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              hapticSuccess();
              onCategorySelect('all');
              onSortSelect('random');
              onMediaTypeSelect('all');
              onAspectRatioSelect('all');
            }}
            className="text-text-dim/60 hover:text-text-main text-[9px] uppercase tracking-wider underline underline-offset-2 ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
