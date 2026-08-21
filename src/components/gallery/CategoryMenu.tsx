import { useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Category } from '../../types';

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
  isLoggedIn
}: CategoryMenuProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const allOptions = useMemo(() => {
    const options = [
      { id: 'all', name: t('common.all') },
      { id: 'premium', name: t('common.premium') }
    ];

    if (isLoggedIn) {
      options.push({ id: 'following', name: t('common.following') });
    }

    options.push(...categories.filter(c => c.id !== 'all' && c.id !== 'premium' && c.id !== 'following'));

    return options.filter((cat, idx, self) => 
      idx === self.findIndex(opt => opt.id === cat.id)
    );
  }, [categories, isLoggedIn, t]);

  const sortOptions: {id: 'random' | 'latest' | 'popular' | 'oldest' | 'trending', name: string}[] = [
    { id: 'random', name: t('common.random') || 'Random' },
    { id: 'latest', name: t('common.latest') },
    { id: 'trending', name: t('common.trending') },
    { id: 'popular', name: t('common.popular') },
    { id: 'oldest', name: t('common.oldest') }
  ];

  const mediaOptions: {id: 'all' | 'image' | 'video', name: string}[] = [
    { id: 'all', name: t('common.mixed') },
    { id: 'image', name: t('common.photos') },
    { id: 'video', name: t('common.videos') }
  ];

  const ratioOptions: {id: 'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide', name: string}[] = [
    { id: 'all', name: t('ratios.all') },
    { id: 'portrait', name: t('ratios.portrait') },
    { id: 'landscape', name: t('ratios.landscape') },
    { id: 'square', name: t('ratios.square') },
    { id: 'ultrawide', name: t('ratios.ultrawide') }
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth / 2 
        : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 py-2">
      {/* Category Horizontal Scroll */}
      <div className="relative group px-1 mb-1">
        {/* Scroll Buttons - Desktop only */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-bg-dark/80 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-bg-dark/80 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>

        <div 
          ref={scrollRef}
          className="flex items-center flex-nowrap gap-3 overflow-x-auto no-scrollbar scroll-smooth p-1 touch-pan-x whitespace-nowrap"
        >
          {allOptions.map((cat, idx) => (
            <button
              key={`cat-main-${cat.id || idx}-${idx}`}
              onClick={() => onCategorySelect(cat.id)}
              className={cn(
                "relative flex-shrink-0 min-w-max h-10 px-5 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-300 border cursor-pointer",
                activeCategoryId === cat.id 
                  ? "bg-brand-primary text-bg-dark border-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.25)] font-bold" 
                  : "bg-white/[0.03] text-text-dim hover:text-text-main hover:bg-white/[0.08] hover:border-white/15 border-white/5"
              )}
            >
              <span className="relative z-10">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Options Line - Clean, High Contrast & Easy to Use */}
      <div className="flex items-center flex-nowrap gap-3 px-2 overflow-x-auto no-scrollbar py-2 touch-pan-x whitespace-nowrap">
        {/* Order */}
        <div className="flex bg-white/[0.02] border border-white/10 rounded-full p-1 min-w-max">
          {sortOptions.map((opt) => (
            <button
              key={`sort-opt-${opt.id}`}
              onClick={() => onSortSelect(opt.id)}
              className={cn(
                "h-8 px-4 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                sortOrder === opt.id 
                  ? "bg-white/15 text-text-main shadow-md font-bold" 
                  : "text-text-dim/70 hover:text-text-main hover:bg-white/5"
              )}
            >
              {opt.name}
            </button>
          ))}
        </div>

        {/* Media Type */}
        <div className="flex bg-white/[0.02] border border-white/10 rounded-full p-1 min-w-max">
          {mediaOptions.map((opt) => (
            <button
              key={`media-opt-${opt.id}`}
              onClick={() => onMediaTypeSelect(opt.id)}
              className={cn(
                "h-8 px-4 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                mediaType === opt.id 
                  ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/30 shadow-md font-bold" 
                  : "text-text-dim/70 hover:text-brand-primary hover:bg-white/5"
              )}
            >
              {opt.name}
            </button>
          ))}
        </div>

        {/* Geometry */}
        <div className="flex bg-white/[0.02] border border-white/10 rounded-full p-1 min-w-max">
          {ratioOptions.map((opt) => (
            <button
              key={`ratio-opt-${opt.id}`}
              onClick={() => onAspectRatioSelect(opt.id)}
              className={cn(
                "h-8 px-4 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                aspectRatioFilter === opt.id 
                  ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/30 shadow-md font-bold" 
                  : "text-text-dim/70 hover:text-brand-primary hover:bg-white/5"
              )}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
