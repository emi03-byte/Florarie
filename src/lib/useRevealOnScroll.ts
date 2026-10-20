import { useEffect, useRef, useState } from 'react';

const INITIAL = 15;
const STEP = 8;

/**
 * Progressive list reveal: show `initial` items, then +`step` when the
 * sentinel near the end of the list enters the viewport.
 */
export function useRevealOnScroll(totalCount: number, resetKey?: string | number) {
  const [visibleCount, setVisibleCount] = useState(INITIAL);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(INITIAL);
  }, [resetKey, totalCount]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= totalCount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setVisibleCount((prev) => Math.min(prev + STEP, totalCount));
      },
      { root: null, rootMargin: '120px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, totalCount]);

  return {
    visibleCount: Math.min(visibleCount, totalCount),
    sentinelRef,
    hasMore: visibleCount < totalCount,
  };
}

export const REVEAL_INITIAL = INITIAL;
export const REVEAL_STEP = STEP;
