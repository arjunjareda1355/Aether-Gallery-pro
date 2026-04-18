import React from 'react';
import Masonry from 'react-masonry-css';
import { motion } from 'motion/react';
import { Image, User } from '../../types';
import ImageCard from './ImageCard';

interface MasonryGridProps {
  images: Image[];
  user: User | null;
  onImageClick: (image: Image) => void;
  onLike: (e: React.MouseEvent, image: Image) => void;
  onSave?: (e: React.MouseEvent, image: Image) => void;
  likedImageIds: Set<string>;
}

const breakpointColumnsObj = {
  default: 5,
  1600: 4,
  1200: 3,
  768: 2,
  480: 1
};

export default function MasonryGrid({ images, user, onImageClick, onLike, onSave, likedImageIds }: MasonryGridProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
    >
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid px-4 md:px-10 mt-2"
        columnClassName="masonry-grid_column"
      >
        {images.map((image) => (
          <motion.div key={image.id} variants={item}>
            <ImageCard
              image={image}
              user={user}
              onClick={onImageClick}
              onLike={onLike}
              onSave={onSave}
              hasLiked={likedImageIds.has(image.id)}
            />
          </motion.div>
        ))}
      </Masonry>
    </motion.div>
  );
}
