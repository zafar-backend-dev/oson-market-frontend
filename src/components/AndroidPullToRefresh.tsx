import { useEffect, useState } from 'react';
import { ArrowDown, LoaderCircle } from 'lucide-react';

const REFRESH_DISTANCE = 85;

function isAtPageTop(target: Element) {
  if ((document.scrollingElement?.scrollTop ?? 0) > 0) return false;

  for (let element: Element | null = target; element; element = element.parentElement) {
    if (element.scrollTop > 0) return false;
  }

  return true;
}

export function AndroidPullToRefresh() {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let start: { x: number; y: number; target: Element } | null = null;
    let distance = 0;
    let reloading = false;

    function reset() {
      start = null;
      distance = 0;
      setDistance(0);
    }

    function onStart(event: TouchEvent) {
      reset();
      const target = event.target;
      if (reloading || event.touches.length !== 1 || !(target instanceof Element)) return;
      if (target.closest('input, textarea, select, [contenteditable], [role="dialog"], .leaflet-container')) return;
      if (!isAtPageTop(target)) return;

      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY, target };
    }

    function onMove(event: TouchEvent) {
      if (!start) return;
      if (event.touches.length !== 1 || !isAtPageTop(start.target)) {
        reset();
        return;
      }

      const touch = event.touches[0];
      const x = Math.abs(touch.clientX - start.x);
      const y = touch.clientY - start.y;
      if (x > Math.max(10, y) || y < -10) {
        reset();
        return;
      }

      distance = Math.max(0, y);
      setDistance(distance);
    }

    function onEnd(event: TouchEvent) {
      if (start && event.touches.length === 0 && distance >= REFRESH_DISTANCE) {
        reloading = true;
        setRefreshing(true);
        window.location.reload();
      }
      reset();
    }

    const options = { passive: true, capture: true };
    window.addEventListener('touchstart', onStart, options);
    window.addEventListener('touchmove', onMove, options);
    window.addEventListener('touchend', onEnd, options);
    window.addEventListener('touchcancel', reset, options);
    return () => {
      window.removeEventListener('touchstart', onStart, options);
      window.removeEventListener('touchmove', onMove, options);
      window.removeEventListener('touchend', onEnd, options);
      window.removeEventListener('touchcancel', reset, options);
    };
  }, []);

  if (!refreshing && distance < 16) return null;

  return (
    <div
      className="android-pull-to-refresh"
      style={{ transform: `translate(-50%, ${refreshing ? 44 : Math.min(distance / 2, 54)}px)` }}
      aria-hidden="true"
    >
      {refreshing ? <LoaderCircle size={20} className="animate-spin" /> : (
        <ArrowDown size={20} style={{ transform: distance >= REFRESH_DISTANCE ? 'rotate(180deg)' : undefined }} />
      )}
    </div>
  );
}
