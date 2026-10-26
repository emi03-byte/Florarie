import { useEffect } from 'react';

/** Nested dialogs share one lock; unlock only when the last one closes. */
let lockCount = 0;
let touchStartY = 0;

function getScrollParent(node: EventTarget | null): HTMLElement | null {
  let el = node instanceof Element ? node : null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el instanceof HTMLElement) {
      const { overflowY } = getComputedStyle(el);
      if (
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY ?? 0;
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 1) return;
  const y = e.touches[0]?.clientY ?? 0;
  const deltaY = y - touchStartY;
  const scrollParent = getScrollParent(e.target);

  if (!scrollParent) {
    e.preventDefault();
    return;
  }

  const { scrollTop, scrollHeight, clientHeight } = scrollParent;
  const atTop = scrollTop <= 0;
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

  // At edge → block so iOS doesn't chain-scroll the page behind.
  if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
    e.preventDefault();
  }
}

function onWheel(e: WheelEvent) {
  const scrollParent = getScrollParent(e.target);
  if (!scrollParent) {
    e.preventDefault();
    return;
  }
  const { scrollTop, scrollHeight, clientHeight } = scrollParent;
  const atTop = scrollTop <= 0;
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
  if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
    e.preventDefault();
  }
}

/**
 * While a modal/sheet is open: no background scroll.
 * Finger/wheel only moves content inside a scrollable area of the overlay;
 * if nothing can scroll, the gesture does nothing.
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;

    lockCount += 1;
    if (lockCount === 1) {
      const html = document.documentElement;
      const body = document.body;
      html.dataset.seraScrollLock = '1';
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      document.addEventListener('touchstart', onTouchStart, {
        passive: true,
        capture: true,
      });
      document.addEventListener('touchmove', onTouchMove, {
        passive: false,
        capture: true,
      });
      document.addEventListener('wheel', onWheel, {
        passive: false,
        capture: true,
      });
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        const html = document.documentElement;
        const body = document.body;
        delete html.dataset.seraScrollLock;
        html.style.overflow = '';
        body.style.overflow = '';
        document.removeEventListener('touchstart', onTouchStart, true);
        document.removeEventListener('touchmove', onTouchMove, true);
        document.removeEventListener('wheel', onWheel, true);
      }
    };
  }, [active]);
}
