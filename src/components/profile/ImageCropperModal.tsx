import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCcw, Check, Move, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  title?: string;
  outputSize?: number;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  title = 'Crop & Frame Avatar',
  outputSize = 512
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [maskType, setMaskType] = useState<'circle' | 'squircle'>('circle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Reset when opening a new image
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setImageError(null);
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
    setImageError(null);
  };

  const handleImageError = () => {
    setImageError('Unable to load image for cropping. You can still apply the link directly.');
    setImageLoaded(false);
  };

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch drag handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom(prev => Math.min(Math.max(0.6, prev + delta), 4.0));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Render crop to high quality Canvas and export DataURL
  const handleApplyCrop = async () => {
    if (!imgRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context could not be created');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Dimensions of the preview viewport (assumed 280x280 box inside modal)
      const viewportSize = 280;
      const scaleFactor = outputSize / viewportSize;

      // Center the canvas origin
      ctx.translate(outputSize / 2, outputSize / 2);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Scale context based on crop zoom and resolution multiplier
      const drawZoom = zoom * scaleFactor;

      // Base fitted dimensions of the image in the 280px container
      const { width: imgWidth, height: imgHeight } = naturalSize;
      let baseWidth = viewportSize;
      let baseHeight = viewportSize;

      if (imgWidth && imgHeight) {
        const aspect = imgWidth / imgHeight;
        if (aspect >= 1) {
          baseHeight = viewportSize;
          baseWidth = viewportSize * aspect;
        } else {
          baseWidth = viewportSize;
          baseHeight = viewportSize / aspect;
        }
      }

      const drawWidth = baseWidth * drawZoom;
      const drawHeight = baseHeight * drawZoom;

      // Draw offset
      const drawX = position.x * scaleFactor - drawWidth / 2;
      const drawY = position.y * scaleFactor - drawHeight / 2;

      // Cross-origin safe image drawing
      const imageToDraw = new Image();
      imageToDraw.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        imageToDraw.onload = () => {
          try {
            ctx.drawImage(imageToDraw, drawX, drawY, drawWidth, drawHeight);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        imageToDraw.onerror = () => {
          // If crossOrigin blocks external canvas export, fallback to direct imgRef
          try {
            ctx.drawImage(imgRef.current!, drawX, drawY, drawWidth, drawHeight);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        imageToDraw.src = imageSrc;
      });

      // Try webp first, fallback to jpeg/png
      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/webp', 0.92);
      } catch {
        dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      }

      onCropComplete(dataUrl);
      onClose();
    } catch (err: any) {
      console.warn('Canvas export tainted or failed:', err);
      // Fallback: If external image CORS prevents canvas export, pass original source
      onCropComplete(imageSrc);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-card-dark border border-white/10 rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text-main">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-dim hover:text-text-main rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Workspace Area */}
          <div className="p-4 sm:p-6 flex flex-col items-center gap-4 select-none">
            {imageError ? (
              <div className="w-full h-64 sm:h-72 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center p-4 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-xs text-text-dim max-w-xs">{imageError}</p>
                <button
                  type="button"
                  onClick={() => {
                    onCropComplete(imageSrc);
                    onClose();
                  }}
                  className="px-4 py-2 bg-brand-primary text-bg-dark font-black text-[9px] uppercase tracking-wider rounded-xl hover:brightness-110 cursor-pointer"
                >
                  Use Direct Link Without Cropping
                </button>
              </div>
            ) : (
              <div
                ref={containerRef}
                onWheel={handleWheel}
                className="relative w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] bg-black/60 rounded-3xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Crop Viewport Mask */}
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                  {/* Outer dim mask */}
                  <div
                    className={cn(
                      "w-[220px] h-[220px] sm:w-[240px] sm:h-[240px] border-2 border-brand-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] transition-all duration-300 pointer-events-none",
                      maskType === 'circle' ? 'rounded-full' : 'rounded-[32px]'
                    )}
                  />

                  {/* Grid Lines Overlay for Rule of Thirds */}
                  <div
                    className={cn(
                      "absolute w-[220px] h-[220px] sm:w-[240px] sm:h-[240px] border border-white/20 pointer-events-none opacity-40 transition-all",
                      maskType === 'circle' ? 'rounded-full' : 'rounded-[32px]'
                    )}
                  >
                    <div className="absolute inset-x-0 top-1/3 border-b border-white/20" />
                    <div className="absolute inset-x-0 top-2/3 border-b border-white/20" />
                    <div className="absolute inset-y-0 left-1/3 border-r border-white/20" />
                    <div className="absolute inset-y-0 left-2/3 border-r border-white/20" />
                  </div>
                </div>

                {/* Move helper badge */}
                <div className="absolute top-2 left-2 z-30 pointer-events-none bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-text-dim">
                  <Move className="w-2.5 h-2.5 text-brand-primary" />
                  <span>Drag & Frame</span>
                </div>

                {/* Image element being manipulated */}
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                  className="pointer-events-none flex items-center justify-center shrink-0"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop preview"
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    className="max-w-none select-none pointer-events-none min-w-[200px] min-h-[200px] object-cover"
                    style={{
                      maxHeight: naturalSize.height && naturalSize.width ? undefined : '280px'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Viewport Mask & Presets Selector */}
            <div className="w-full flex items-center justify-between gap-2 px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-dim/60">
                Frame Outline
              </span>
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMaskType('circle')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    maskType === 'circle'
                      ? "bg-brand-primary text-bg-dark shadow-sm"
                      : "text-text-dim hover:text-text-main"
                  )}
                >
                  Circle
                </button>
                <button
                  type="button"
                  onClick={() => setMaskType('squircle')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    maskType === 'squircle'
                      ? "bg-brand-primary text-bg-dark shadow-sm"
                      : "text-text-dim hover:text-text-main"
                  )}
                >
                  Squircle
                </button>
              </div>
            </div>

            {/* Zoom Slider Controls */}
            <div className="w-full space-y-1.5 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-text-dim/70">
                <div className="flex items-center gap-1.5">
                  <ZoomIn className="w-3 h-3 text-brand-primary" />
                  <span>Zoom Scale</span>
                </div>
                <span className="font-mono text-text-main">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.6, prev - 0.15))}
                  className="p-1 text-text-dim hover:text-text-main bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.6"
                  max="3.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-brand-primary h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(3.5, prev + 0.15))}
                  className="p-1 text-text-dim hover:text-text-main bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Secondary Tools: Rotate & Reset */}
            <div className="w-full grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="py-2 px-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-text-main flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCw className="w-3 h-3 text-brand-primary" />
                <span>Rotate 90°</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-2 px-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-text-dim hover:text-text-main flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCcw className="w-3 h-3" />
                <span>Reset Frame</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-white/5 bg-white/[0.01] flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-text-dim hover:text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing || !imageLoaded}
              onClick={handleApplyCrop}
              className="flex-[2] py-3 bg-brand-primary text-bg-dark font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply & Crop Avatar</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
