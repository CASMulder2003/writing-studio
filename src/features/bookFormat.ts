export type BookSize = 'compact' | 'large';
export const defaultBookSize: BookSize = 'large';
export const bookFormat = {
  bodySize: 10.5,
  leading: 14,
  innerMargin: 20,
  outerMargin: 16,
  top: 24,
  bottom: 22,
  paragraphIndent: 5,
};
export const ptToMm = (pt: number) => (pt * 25.4) / 72;
export const mmToPx = (mm: number) => (mm * 96) / 25.4;
export function bookDimensions(size: BookSize) {
  return size === 'compact'
    ? { width: 139.7, height: 215.9 }
    : { width: 152.4, height: 228.6 };
}
