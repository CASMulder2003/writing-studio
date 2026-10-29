import type { BookSize } from './bookFormat';

export function PageControls({
  size,
  onSize,
  zoom,
  onZoom,
}: {
  size: BookSize;
  onSize: (size: BookSize) => void;
  zoom: string;
  onZoom: (zoom: string) => void;
}) {
  return (
    <div className="page-controls">
      <label>
        <span>Page size</span>
        <select
          aria-label="Page size"
          value={size}
          onChange={(e) => onSize(e.target.value as BookSize)}
        >
          <option value="large">6 × 9 in</option>
          <option value="compact">5.5 × 8.5 in</option>
        </select>
      </label>
      <label>
        <span>View</span>
        <select
          aria-label="Page zoom"
          value={zoom}
          onChange={(e) => onZoom(e.target.value)}
        >
          <option value="fit">Fit width</option>
          <option value="1">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
        </select>
      </label>
    </div>
  );
}
