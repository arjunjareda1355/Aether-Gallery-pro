import { cn } from '../../lib/utils';
import { Category } from '../../types';
import { ChevronRight, SlidersHorizontal, Image as ImageIcon, Play } from 'lucide-react';

interface CategoryMenuProps {
  categories: Category[];
  activeCategoryId: string;
  onCategorySelect: (id: string) => void;
  sortOrder: 'latest' | 'popular' | 'oldest';
  onSortSelect: (order: 'latest' | 'popular' | 'oldest') => void;
  mediaType: 'all' | 'image' | 'video';
  onMediaTypeSelect: (type: 'all' | 'image' | 'video') => void;
}

export default function CategoryMenu({ 
  categories, 
  activeCategoryId, 
  onCategorySelect, 
  sortOrder, 
  onSortSelect,
  mediaType,
  onMediaTypeSelect
}: CategoryMenuProps) {
  const activeCategory = activeCategoryId === 'all' 
    ? { id: 'all', name: 'All' } 
    : activeCategoryId === 'premium' 
    ? { id: 'premium', name: 'Premium' } 
    : categories.find(c => c.id === activeCategoryId) || { id: 'all', name: 'All' };

  const allOptions = [
    { id: 'all', name: 'All' },
    { id: 'premium', name: 'Premium' },
    ...categories
  ];

  const sortOptions: ('latest' | 'popular' | 'oldest')[] = ['latest', 'popular', 'oldest'];

  const cycleCategory = () => {
    const currentIndex = allOptions.findIndex(o => o.id === activeCategoryId);
    const nextIndex = (currentIndex + 1) % allOptions.length;
    onCategorySelect(allOptions[nextIndex].id);
  };

  const cycleSort = () => {
    const currentIndex = sortOptions.indexOf(sortOrder);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    onSortSelect(sortOptions[nextIndex]);
  };

  const mediaOptions: ('all' | 'image' | 'video')[] = ['all', 'image', 'video'];
  
  const cycleMediaType = () => {
    const currentIndex = mediaOptions.indexOf(mediaType);
    const nextIndex = (currentIndex + 1) % mediaOptions.length;
    onMediaTypeSelect(mediaOptions[nextIndex]);
  };

  return (
    <div className="flex items-center gap-1.5 p-1 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl">
      {/* Category Cycler */}
      <button
        onClick={cycleCategory}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
          {activeCategory.name}
        </span>
        <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white transition-colors" />
      </button>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Sort Cycler */}
      <button
        onClick={cycleSort}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5"
      >
        <SlidersHorizontal className="w-3 h-3 text-white/50 group-hover:text-white transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 group-hover:text-white">
          {sortOrder}
        </span>
      </button>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Media Type Filter */}
      <button
        onClick={cycleMediaType}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 transition-all group border border-brand-primary/20"
      >
        {mediaType === 'video' ? (
          <Play className="w-3 h-3 text-brand-primary fill-brand-primary" />
        ) : (
          <ImageIcon className="w-3 h-3 text-brand-primary" />
        )}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">
          {mediaType === 'all' ? 'Mixed' : mediaType === 'image' ? 'Photos' : 'Videos'}
        </span>
      </button>
    </div>
  );
}
