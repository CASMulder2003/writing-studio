import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  bookDimensions,
  bookFormat,
  mmToPx,
  type BookSize,
} from './bookFormat';
import { usePageScale } from './usePageScale';

export const PAGE_GAP = 28;
// CSS Shapes reserve the bottom/top margins between pages. The editable
// document stays intact: no split paragraphs, synthetic text or undo entries.
export function pageExclusionShape(
  pages: number,
  height: number,
  start: number,
) {
  const points = ['0 0'];
  let end = 0;
  for (let i = 1; i < pages; i++) {
    const bottom =
      i * height + (i - 1) * PAGE_GAP - mmToPx(bookFormat.bottom) - start;
    end = i * (height + PAGE_GAP) + mmToPx(bookFormat.top) - start;
    points.push(
      `0 ${bottom}px`,
      `100% ${bottom}px`,
      `100% ${end}px`,
      `0 ${end}px`,
    );
  }
  points.push('0 0');
  return { shapeOutside: `polygon(${points.join(',')})`, height: end };
}

export function WritingPages({
  editor,
  children,
  size,
  zoom,
  paged,
  chapterTitle,
  chapterLabel,
  onPages,
}: {
  editor: Editor;
  children: ReactNode;
  size: BookSize;
  zoom: string;
  paged: boolean;
  chapterTitle: string;
  chapterLabel: string;
  onPages: (pages: number) => void;
}) {
  const dimensions = bookDimensions(size);
  const width = mmToPx(dimensions.width),
    height = mmToPx(dimensions.height);
  const { container, scale } = usePageScale(width, zoom);
  const [pages, setPages] = useState(1);
  const [opening, setOpening] = useState(mmToPx(59));
  const heading = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const callback = useRef(onPages);
  callback.current = onPages;
  useLayoutEffect(() => {
    const node = heading.current;
    if (!node) return;
    const measure = () =>
      setOpening(mmToPx(43) + node.offsetHeight + mmToPx(9));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [chapterTitle, width]);
  useEffect(() => {
    let frame = 0;
    let disposed = false;
    const measure = () => {
      if (disposed || !flow.current || editor.isDestroyed) return;
      const last = editor.view.dom.lastElementChild;
      if (!last) return;
      const rect = last.getBoundingClientRect();
      const top = flow.current.getBoundingClientRect().top;
      const used = (rect.bottom - top) / scale;
      if (!Number.isFinite(used) || rect.height === 0) return;
      const count = Math.max(
        1,
        Math.ceil(
          (used + mmToPx(bookFormat.bottom) + PAGE_GAP) / (height + PAGE_GAP),
        ),
      );
      if (paged) {
        setPages(count);
        callback.current(count);
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    editor.on('update', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(editor.view.dom);
    editor.view.dom.addEventListener('load', schedule, true);
    document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      editor.off('update', schedule);
      editor.view.dom.removeEventListener('load', schedule, true);
    };
  }, [editor, paged, pages, opening, height, scale]);
  const totalHeight = pages * height + (pages - 1) * PAGE_GAP;
  return (
    <div ref={container} className="book-page-viewport writing-page-viewport">
      <div
        className={`writing-pages ${paged ? 'is-paged' : 'is-continuous'}`}
        style={
          {
            zoom: scale,
            width,
            '--book-height': `${height}px`,
            '--body-start': `${opening}px`,
            '--book-body-size': `${bookFormat.bodySize}pt`,
            '--book-leading': `${bookFormat.leading}pt`,
            '--book-inner': `${bookFormat.innerMargin}mm`,
            '--book-outer': `${bookFormat.outerMargin}mm`,
            '--book-bottom': `${bookFormat.bottom}mm`,
            '--book-indent': `${bookFormat.paragraphIndent}mm`,
          } as CSSProperties
        }
      >
        {paged && (
          <div className="writing-page-backgrounds" aria-hidden="true">
            {Array.from({ length: pages }, (_, i) => (
              <div
                key={i}
                className="writing-page-background"
                style={{ top: i * (height + PAGE_GAP), height }}
              >
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
        )}
        <div className="writing-chapter-opening" aria-hidden="true">
          <span>{chapterLabel || '\u00a0'}</span>
          <div ref={heading}>{chapterTitle || 'Untitled chapter'}</div>
        </div>
        <div
          ref={flow}
          className="book-writing-flow"
          style={{ minHeight: paged ? totalHeight : height }}
        >
          {paged && pages > 1 && (
            <div
              className="page-exclusions"
              aria-hidden="true"
              style={pageExclusionShape(pages, height, opening)}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
