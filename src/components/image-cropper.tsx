'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ImageCropperProps {
  src: string;
  size: number;
  onCropChange: (cropData: { x: number; y: number; scale: number }) => void;
  className?: string;
}

export function ImageCropper({ src, size, onCropChange, className = "" }: ImageCropperProps) {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const { naturalWidth, naturalHeight } = img;
    setImageSize({ width: naturalWidth, height: naturalHeight });
    
    // Calculate initial scale to fill the circle
    const minScale = Math.max(size / naturalWidth, size / naturalHeight);
    setScale(minScale);
    setPosition({ x: 0, y: 0 });
    
    onCropChange({ x: 0, y: 0, scale: minScale });
  }, [size, onCropChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent scrolling during drag
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDragStart({
      x: e.clientX - rect.left - position.x,
      y: e.clientY - rect.top - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragStart.x;
    const newY = e.clientY - rect.top - dragStart.y;
    
    // Calculate bounds to keep image covering the circle
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    
    const maxX = Math.max(0, (scaledWidth - size) / 2);
    const maxY = Math.max(0, (scaledHeight - size) / 2);
    
    const boundedX = Math.max(-maxX, Math.min(maxX, newX));
    const boundedY = Math.max(-maxY, Math.min(maxY, newY));
    
    setPosition({ x: boundedX, y: boundedY });
    onCropChange({ x: boundedX, y: boundedY, scale });
  }, [dragStart, imageSize, scale, size, onCropChange]);

  const handleMouseUp = useCallback(() => {
    setDragStart(null);
    
    // Re-enable scrolling
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent scrolling during drag
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDragStart({
      x: touch.clientX - rect.left - position.x,
      y: touch.clientY - rect.top - position.y
    });
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStart || !containerRef.current) return;
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const newX = touch.clientX - rect.left - dragStart.x;
    const newY = touch.clientY - rect.top - dragStart.y;
    
    // Calculate bounds
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    
    const maxX = Math.max(0, (scaledWidth - size) / 2);
    const maxY = Math.max(0, (scaledHeight - size) / 2);
    
    const boundedX = Math.max(-maxX, Math.min(maxX, newX));
    const boundedY = Math.max(-maxY, Math.min(maxY, newY));
    
    setPosition({ x: boundedX, y: boundedY });
    onCropChange({ x: boundedX, y: boundedY, scale });
  }, [dragStart, imageSize, scale, size, onCropChange]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (imageSize.width === 0 || imageSize.height === 0) return;
    
    const factor = direction === 'in' ? 1.2 : 0.8;
    
    // Calculate minimum scale to ensure image covers the circle
    const minScale = Math.max(size / imageSize.width, size / imageSize.height);
    const maxScale = 4;
    
    const newScale = Math.max(minScale, Math.min(maxScale, scale * factor));
    
    if (newScale === scale) return; // No change needed
    
    console.log('Zoom:', direction, 'Current scale:', scale, 'New scale:', newScale, 'Min scale:', minScale);
    
    // Calculate the center point of the circle (where we want to zoom toward)
    const circleCenterX = size / 2;
    const circleCenterY = size / 2;
    
    // Current image position relative to circle center
    const currentImageCenterX = position.x + (imageSize.width * scale) / 2;
    const currentImageCenterY = position.y + (imageSize.height * scale) / 2;
    
    // Calculate offset from circle center to current focal point
    const offsetX = currentImageCenterX - circleCenterX;
    const offsetY = currentImageCenterY - circleCenterY;
    
    // Scale the offset by the zoom factor to maintain zoom center
    const scaleFactor = newScale / scale;
    const newOffsetX = offsetX * scaleFactor;
    const newOffsetY = offsetY * scaleFactor;
    
    // Calculate new position to maintain the zoom center
    const newImageCenterX = circleCenterX + newOffsetX;
    const newImageCenterY = circleCenterY + newOffsetY;
    
    const newPositionX = newImageCenterX - (imageSize.width * newScale) / 2;
    const newPositionY = newImageCenterY - (imageSize.height * newScale) / 2;
    
    // Apply bounds to keep image covering the circle
    const scaledWidth = imageSize.width * newScale;
    const scaledHeight = imageSize.height * newScale;
    
    const maxX = Math.max(0, (scaledWidth - size) / 2);
    const maxY = Math.max(0, (scaledHeight - size) / 2);
    
    const boundedX = Math.max(-maxX, Math.min(maxX, newPositionX));
    const boundedY = Math.max(-maxY, Math.min(maxY, newPositionY));
    
    setScale(newScale);
    setPosition({ x: boundedX, y: boundedY });
    onCropChange({ x: boundedX, y: boundedY, scale: newScale });
  }, [scale, size, imageSize, position, onCropChange]);

  const resetCrop = useCallback(() => {
    const minScale = Math.max(size / imageSize.width, size / imageSize.height);
    setScale(minScale);
    setPosition({ x: 0, y: 0 });
    onCropChange({ x: 0, y: 0, scale: minScale });
  }, [size, imageSize, onCropChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Cropping Interface */}
      <div className="flex flex-col items-center space-y-4">
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-full border-4 border-primary shadow-lg cursor-move"
          style={{ width: size, height: size }}
          onMouseDown={handleMouseDown}
          onMouseMove={dragStart ? handleMouseMove : undefined}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={dragStart ? handleTouchMove : undefined}
          onTouchEnd={handleMouseUp}
        >
          <img
            src={src}
            alt="Crop preview"
            className="absolute select-none pointer-events-none"
            style={{
              width: imageSize.width * scale,
              height: imageSize.height * scale,
              left: position.x + (size - imageSize.width * scale) / 2,
              top: position.y + (size - imageSize.height * scale) / 2,
            }}
            onLoad={handleImageLoad}
            draggable={false}
          />
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          Drag to reposition • Use zoom buttons to resize
        </p>
      </div>

      {/* Zoom Controls */}
      <div className="flex justify-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleZoom('out')}
          disabled={imageSize.width === 0 || scale <= Math.max(size / imageSize.width, size / imageSize.height)}
        >
          Zoom Out
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetCrop}
        >
          Reset
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleZoom('in')}
          disabled={scale >= 4}
        >
          Zoom In
        </Button>
      </div>
    </div>
  );
}