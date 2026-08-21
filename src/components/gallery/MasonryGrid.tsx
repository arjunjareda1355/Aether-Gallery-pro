import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, User } from '../../types';
import ImageCard from './ImageCard';
import { cn } from '../../lib/utils';

interface MasonryGridProps {
  images: Image[];
  user: User | null;
  onImageClick: (image: Image) => void;
  onLike: (e: React.MouseEvent, image: Image) => void;
  onSave?: (e: React.MouseEvent, image: Image) => void;
  likedImageIds: Set<string>;
  savedImageIds: Set<string>;
  isFetchingMore?: boolean;
  isSelectMode?: boolean;
  selectedPostIds?: Set<string>;
  onToggleSelect?: (image: Image) => void;
  onStartSelectMode?: (image: Image) => void;
}

export default React.memo(function MasonryGrid({ 
  images, 
  user, 
  onImageClick, 
  onLike, 
  onSave, 
  likedImageIds,
  savedImageIds,
  isFetchingMore,
  isSelectMode = false,
  selectedPostIds = new Set(),
  onToggleSelect,
  onStartSelectMode
}: MasonryGridProps) {
  const [columns, setColumns] = useState(2);
  
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) setColumns(2);
      else if (width < 1024) setColumns(3);
      else if (width < 1280) setColumns(4);
      else if (width < 1536) setColumns(5);
      else if (width < 2000) setColumns(6);
      else setColumns(7);
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const uniqueImages = useMemo(() => {
    const seen = new Set<string>();
    return images.filter((img) => {
      // Extremely robust check for legitimate asset IDs
      if (!img || !img.id || img.id === 'undefined' || seen.has(img.id)) return false;
      seen.add(img.id);
      return true;
    });
  }, [images]);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.03,
        delayChildren: 0.05
      }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: 'spring' as const, 
        stiffness: 100, 
        damping: 25,
        mass: 0.5
      }
    }
  };

  return (
    <div className="max-w-[2400px] mx-auto w-full pb-32 box-border overflow-x-hidden min-h-screen">
      <motion.div 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="w-full max-w-full"
      >
        <MasonryColumns 
          items={uniqueImages} 
          columnCount={columns} 
          isLoadingMore={isFetchingMore}
          renderItem={(img, cIdx, iIdx) => (
            <motion.div 
              key={`mg-item-${img.id || 'asset'}-${cIdx}-${iIdx}`}
              variants={itemAnim} 
              className="w-full"
            >
              <ImageCard
                image={img}
                user={user}
                onClick={onImageClick}
                onLike={onLike}
                onSave={onSave}
                hasLiked={likedImageIds.has(img.id)}
                isSaved={savedImageIds.has(img.id)}
                index={cIdx * 1000 + iIdx}
                isSelectMode={isSelectMode}
                isSelected={selectedPostIds.has(img.id)}
                onToggleSelect={onToggleSelect}
                onStartSelectMode={onStartSelectMode}
              />
            </motion.div>
          )}
        />
      </motion.div>
    </div>
  );
});

// Custom Masonry Column Layout Header
interface MasonryColumnsProps {
  items: Image[];
  columnCount: number;
  renderItem: (item: Image, cIdx: number, iIdx: number) => React.ReactNode;
  isLoadingMore?: boolean;
}

function MasonryColumns({ items, columnCount, renderItem, isLoadingMore }: MasonryColumnsProps) {
  const columns = useMemo(() => {
    const cols: Image[][] = Array.from({ length: columnCount }, () => []);
    const heights = Array.from({ length: columnCount }, () => 0);
    
    items.forEach(item => {
      // Find shortest column
      const shortestIdx = heights.indexOf(Math.min(...heights));
      cols[shortestIdx].push(item);
      
      // Strict Aspect Ratio estimation for masonry flow
      const seed = item.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const randomValue = (seed % 100) / 100;
      
      let heightWeight = 1.0;
      
      const isYoutube = /youtube\.com|youtu\.be/i.test(item.url);
      const isYoutubeShort = isYoutube && item.url.toLowerCase().includes('/shorts/');
      const isInferredPortrait = item.aspectRatio === 'portrait' || 
                                 isYoutubeShort || 
                                 /portrait|vertical|reel|tiktok|9-16|9_16|9x16/i.test(item.url);
                                 
      if (item.type === 'video') {
         if (isInferredPortrait) {
           heightWeight = 1.77; // 9:16 is very tall
         } else {
           heightWeight = 0.56; // 16:9 is landscape
         }
      } else if (item.aspectRatio) {
        if (item.aspectRatio === 'portrait') heightWeight = 1.77; // Make all portrait images 9:16 for proper original flow
        else if (item.aspectRatio === 'landscape') heightWeight = 0.56;
        else if (item.aspectRatio === 'square') heightWeight = 1.0;
        else if (item.aspectRatio === 'ultrawide') heightWeight = 0.43;
      } else {
        // Pseudo-random but deterministic aspect ratios
        if (randomValue > 0.85) heightWeight = 1.77; // Tall portrait
        else if (randomValue > 0.6) heightWeight = 1.33; // Standard portrait
        else if (randomValue > 0.3) heightWeight = 1.0; // Square
        else heightWeight = 0.75; // Landscape
      }
      
      heights[shortestIdx] += heightWeight;
    });
    
    return cols;
  }, [items, columnCount]);

  return (
    <div className="flex gap-3 md:gap-5 w-full max-w-full box-border px-3 md:px-5">
      {columns.map((col, cIdx) => (
        <div key={`col-${cIdx}`} className="flex-1 min-w-0 flex flex-col gap-3 md:gap-5">
          {col.map((item, iIdx) => renderItem(item, cIdx, iIdx))}
          {/* Skeleton Loaders for this column when fetching more */}
          {isLoadingMore && (
            <div key={`col-skeleton-${cIdx}`} className="space-y-2 sm:space-y-3 md:space-y-4 pb-20">
              <div className="w-full aspect-[3/4] bg-white/[0.03] rounded-2xl animate-pulse" />
              <div className="w-full aspect-square bg-white/[0.03] rounded-2xl animate-pulse" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
