import { useLayoutEffect, useRef } from 'react';

// Keep navigation preferences separate from the manuscript and its autosave.
export function useWritingPosition(key: string, active: boolean) {
  const container = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, number>());
  const restoring = useRef(false);
  useLayoutEffect(() => {
    const node = container.current;
    if (!active || !node) return;
    const top = positions.current.get(key) || 0;
    restoring.current = true;
    const restore = () => {
      node.scrollTop = top;
    };
    // Pagination and fonts can settle after the editor mounts. Restore against
    // the final page height, but stop immediately when the writer interacts.
    const observer = new ResizeObserver(restore);
    const paper = node.querySelector('.paper');
    if (paper) observer.observe(paper);
    observer.observe(node);
    const resume = () => {
      restoring.current = false;
      observer.disconnect();
    };
    const events = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const;
    events.forEach((event) =>
      node.addEventListener(event, resume, { passive: true }),
    );
    restore();
    return () => {
      observer.disconnect();
      events.forEach((event) => node.removeEventListener(event, resume));
    };
  }, [key, active]);
  return {
    container,
    onScroll: () => {
      if (!restoring.current && container.current)
        positions.current.set(key, container.current.scrollTop);
    },
  };
}
