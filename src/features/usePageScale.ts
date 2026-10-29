import { useEffect, useRef, useState } from 'react';

export function usePageScale(width: number, zoom: string) {
  const container = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(width);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      if (node.clientWidth > 0) setAvailable(node.clientWidth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return {
    container,
    scale:
      zoom === 'fit'
        ? Math.max(0.25, Math.min(1.25, available / width))
        : Number(zoom) || 1,
  };
}
