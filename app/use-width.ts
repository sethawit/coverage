'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tracks an element's rendered width so an SVG can draw at 1:1 scale.
 * A fixed viewBox stretched to the container scales its text too, which made axis labels huge on wide screens.
 */
export function useWidth<T extends Element>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
