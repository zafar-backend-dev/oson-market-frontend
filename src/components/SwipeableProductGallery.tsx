import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { resolveCatalogMediaUrl } from '../services/catalogApi';
import type { CatalogProductImage } from '../types/catalog';

interface SwipeableProductGalleryProps {
  images: CatalogProductImage[];
  alt: string;
  emptyLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  selectedImageId?: string | null;
  onSelectImageId?: (imageId: string) => void;
  onTapImage?: () => void;
  aspectClassName?: string;
  containerClassName?: string;
  imgClassName?: string;
  dotBarClassName?: string;
  autoAdvanceMs?: number;
  arrowsVisibility?: 'hover' | 'always' | 'none';
}

function SlideImage({
  url,
  alt,
  emptyLabel,
  imgClassName,
}: {
  url: string | null | undefined;
  alt: string;
  emptyLabel?: string;
  imgClassName: string;
}) {
  const resolvedUrl = resolveCatalogMediaUrl(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  if (resolvedUrl && !failed) {
    return (
      <img
        src={resolvedUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={`${imgClassName} select-none`}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400 select-none px-3">
      <ImageIcon className="w-8 h-8 text-slate-300 shrink-0" aria-hidden="true" />
      {emptyLabel && (
        <span className="text-[11px] sm:text-xs text-slate-400 text-center leading-tight line-clamp-2">
          {emptyLabel}
        </span>
      )}
    </div>
  );
}

export function SwipeableProductGallery({
  images,
  alt,
  emptyLabel,
  prevLabel = 'Previous image',
  nextLabel = 'Next image',
  selectedImageId,
  onSelectImageId,
  onTapImage,
  aspectClassName = 'aspect-[4/3]',
  containerClassName = '',
  imgClassName = 'w-full h-full object-contain p-2',
  dotBarClassName = 'bottom-2',
  arrowsVisibility = 'hover',
  autoAdvanceMs,
}: SwipeableProductGalleryProps) {
  const safeImages = useMemo(() => (Array.isArray(images) ? images : []), [images]);
  const [internalIndex, setInternalIndex] = useState(0);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    lockedAxis: 'x' | 'y' | null;
    swiped: boolean;
    lastSwipeAt: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    lockedAxis: null,
    swiped: false,
    lastSwipeAt: 0,
  });

  useEffect(() => {
    if (safeImages.length === 0) {
      setInternalIndex(0);
      return;
    }
    if (selectedImageId) {
      const idx = safeImages.findIndex((img) => img.id === selectedImageId);
      if (idx >= 0) {
        setInternalIndex(idx);
        return;
      }
    }
    setInternalIndex(0);
  }, [safeImages, selectedImageId]);

  const activeIndex = Math.min(
    Math.max(0, internalIndex),
    Math.max(0, safeImages.length - 1),
  );
  const hasMultiple = safeImages.length > 1;

  const commitIndex = useCallback(
    (nextIdx: number) => {
      if (safeImages.length === 0) return;
      const wrapped = ((nextIdx % safeImages.length) + safeImages.length) % safeImages.length;
      setInternalIndex(wrapped);
      const targetImage = safeImages[wrapped];
      if (targetImage && onSelectImageId) {
        onSelectImageId(targetImage.id);
      }
    },
    [onSelectImageId, safeImages],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!autoAdvanceMs || !hasMultiple || !viewport) return;

    let timer: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (!entry?.isIntersecting) return;
      timer = window.setInterval(() => {
        if (!document.hidden && gestureRef.current.pointerId === null) {
          setInternalIndex((current) => (current + 1) % safeImages.length);
        }
      }, autoAdvanceMs);
    });
    observer.observe(viewport);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [autoAdvanceMs, hasMultiple, safeImages.length]);

  const resetGesture = useCallback(() => {
    gestureRef.current.pointerId = null;
    gestureRef.current.lockedAxis = null;
    setIsDragging(false);
    setDragOffsetPx(0);
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-gallery-control="true"]')) return;

    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lockedAxis: null,
      swiped: false,
      lastSwipeAt: gestureRef.current.lastSwipeAt,
    };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.lockedAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        g.lockedAxis = 'x';
        g.swiped = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore capture failures
        }
      } else {
        g.lockedAxis = 'y';
        resetGesture();
        return;
      }
    }

    if (g.lockedAxis === 'x') {
      let visualOffset = dx;
      if ((activeIndex === 0 && dx > 0) || (activeIndex === safeImages.length - 1 && dx < 0)) {
        visualOffset = dx * 0.35;
      }
      setDragOffsetPx(visualOffset);
    }
  };

  const finishHorizontalGesture = (e: PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;

    if (g.lockedAxis === 'x') {
      const dx = e.clientX - g.startX;
      const width = viewportRef.current?.clientWidth || 300;
      const threshold = Math.min(48, Math.max(26, width * 0.16));

      if (dx <= -threshold && activeIndex < safeImages.length - 1) {
        commitIndex(activeIndex + 1);
      } else if (dx >= threshold && activeIndex > 0) {
        commitIndex(activeIndex - 1);
      }
      g.lastSwipeAt = Date.now();
    }

    resetGesture();
  };

  const handlePointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current.pointerId === e.pointerId) {
      resetGesture();
    }
  };

  const handleViewportClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-gallery-control="true"]')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (gestureRef.current.swiped || Date.now() - gestureRef.current.lastSwipeAt < 250) {
      e.preventDefault();
      e.stopPropagation();
      gestureRef.current.swiped = false;
      return;
    }

    onTapImage?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      commitIndex(activeIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      commitIndex(activeIndex + 1);
    }
  };

  const viewportWidth = viewportRef.current?.clientWidth || 1;
  const dragPercent = isDragging ? (dragOffsetPx / viewportWidth) * 100 : 0;

  const arrowVisibilityClass =
    arrowsVisibility === 'always'
      ? 'hidden md:inline-flex opacity-100'
      : 'hidden md:inline-flex opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100';

  return (
    <div
      ref={viewportRef}
      tabIndex={hasMultiple ? 0 : undefined}
      aria-roledescription={hasMultiple ? 'carousel' : undefined}
      aria-label={hasMultiple ? alt : undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishHorizontalGesture}
      onPointerCancel={handlePointerCancel}
      onClick={handleViewportClick}
      className={`group/gallery relative ${aspectClassName} w-full overflow-hidden select-none touch-pan-y ${
        onTapImage ? 'cursor-pointer' : ''
      } ${containerClassName}`}
    >
      {safeImages.length === 0 ? (
        <SlideImage url={null} alt={alt} emptyLabel={emptyLabel} imgClassName={imgClassName} />
      ) : safeImages.length === 1 ? (
        <SlideImage
          url={safeImages[0].imageUrl}
          alt={alt}
          emptyLabel={emptyLabel}
          imgClassName={imgClassName}
        />
      ) : (
        <>
          <div
            className="flex h-full w-full"
            style={{
              transform: `translate3d(${-activeIndex * 100 + dragPercent}%, 0, 0)`,
              transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {safeImages.map((img, idx) => (
              <div key={img.id || idx} className="w-full h-full shrink-0">
                <SlideImage
                  url={img.imageUrl}
                  alt={alt}
                  emptyLabel={emptyLabel}
                  imgClassName={imgClassName}
                />
              </div>
            ))}
          </div>

          {arrowsVisibility !== 'none' && (
            <>
              <button
                type="button"
                data-gallery-control="true"
                aria-label={prevLabel}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  commitIndex(activeIndex - 1);
                }}
                className={`${arrowVisibilityClass} absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-[#e6e4dd] text-slate-700 hover:text-slate-900 shadow-sm items-center justify-center transition-opacity cursor-pointer`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                data-gallery-control="true"
                aria-label={nextLabel}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  commitIndex(activeIndex + 1);
                }}
                className={`${arrowVisibilityClass} absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-[#e6e4dd] text-slate-700 hover:text-slate-900 shadow-sm items-center justify-center transition-opacity cursor-pointer`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Indicator Dots (hidden when <= 1 image) */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${dotBarClassName} z-10 inline-flex items-center gap-0.5 rounded-full bg-slate-900/35 px-1.5 py-0.5 backdrop-blur-[2px]`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {safeImages.map((img, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={img.id || idx}
                  type="button"
                  data-gallery-control="true"
                  aria-label={`${alt} (${idx + 1}/${safeImages.length})`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    commitIndex(idx);
                  }}
                  className="p-0.5 inline-flex items-center justify-center cursor-pointer"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      isActive ? 'w-3.5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
