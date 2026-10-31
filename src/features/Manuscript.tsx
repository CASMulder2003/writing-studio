import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { chapterNumber, chapterOpening, type Book } from '../domain/book';
import type { BookPage, BookPreview } from './bookPdf';
import { bookDimensions, mmToPx, ptToMm, type BookSize } from './bookFormat';
import { usePageScale } from './usePageScale';
import { EditablePageTitle } from './EditablePageTitle';

function PreviewPage({
  page,
  width,
  height,
  eager,
}: {
  page: BookPage;
  width: number;
  height: number;
  eager: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { rootMargin: '1200px' },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      role="group"
      aria-label={
        page.number
          ? `Book page ${page.number}`
          : page.elements.length
            ? 'Title page'
            : 'Blank title-page reverse'
      }
    >
      <p className="sr-only">
        {page.elements
          .filter((e) => e.kind === 'text')
          .map((e) => e.text)
          .join(' ')}
      </p>
      <svg
        ref={ref}
        className="book-page"
        viewBox={`0 0 ${width} ${height}`}
        width={mmToPx(width)}
        height={mmToPx(height)}
        aria-hidden="true"
      >
        {(eager || visible) &&
          page.elements.map((element, i) => {
            if (element.kind === 'image')
              return (
                <image
                  key={i}
                  href={element.src}
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                />
              );
            if (element.kind === 'line')
              return (
                <line
                  key={i}
                  x1={element.x}
                  y1={element.y}
                  x2={element.x2}
                  y2={element.y2}
                  stroke="#141414"
                  strokeWidth={element.width}
                />
              );
            return (
              <text
                key={i}
                x={element.x}
                y={element.y}
                fontSize={ptToMm(element.size)}
                fill={element.color}
                fontWeight={element.style.includes('bold') ? 700 : 400}
                fontStyle={
                  element.style.includes('italic') ? 'italic' : 'normal'
                }
                textAnchor={element.align === 'center' ? 'middle' : 'start'}
                xmlSpace="preserve"
              >
                {element.text}
              </text>
            );
          })}
      </svg>
    </div>
  );
}

export function Manuscript({
  book,
  jump,
  onEdit,
  onRename,
  readOnly,
  size,
  onPageCounts,
}: {
  book: Book;
  jump: { id: string; request: number };
  onEdit: (sceneId: string) => void;
  onRename: (chapterId: string, title: string) => void;
  readOnly: boolean;
  size: BookSize;
  onPageCounts: (counts: Record<string, number>, size: BookSize) => void;
}) {
  const [preview, setPreview] = useState<BookPreview>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [updating, setUpdating] = useState(false);
  const { width } = bookDimensions(size);
  const { container, scale } = usePageScale(mmToPx(width), 'fit');
  const chapters = useRef(new Map<string, HTMLElement>());
  const scroller = useRef<HTMLDivElement>(null);
  const lastJump = useRef('');
  const renameAnchor = useRef<{ id: string; top: number } | null>(null);
  const onCounts = useRef(onPageCounts);
  onCounts.current = onPageCounts;
  useEffect(() => {
    let cancelled = false;
    setUpdating(true);
    setError('');
    import('./bookPdf')
      .then(({ createBookPreview }) =>
        createBookPreview(book, new Set(book.chapters.map((c) => c.id)), size),
      )
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
        setUpdating(false);
        const counts: Record<string, number> = {};
        for (const page of result.pages)
          if (page.chapterId)
            counts[page.chapterId] = (counts[page.chapterId] || 0) + 1;
        onCounts.current(counts, size);
      })
      .catch((error) => {
        if (!cancelled) {
          setUpdating(false);
          setError(
            error instanceof Error
              ? error.message
              : 'The book preview could not be prepared.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [book, size, retry]);
  useLayoutEffect(() => {
    const target = chapters.current.get(jump.id);
    const scroll = scroller.current;
    if (!preview || !scroll) return;
    const request = `${jump.id}:${jump.request}`;
    if (target && lastJump.current !== request) {
      lastJump.current = request;
      renameAnchor.current = null;
      scroll.scrollTop +=
        target.getBoundingClientRect().top -
        scroll.getBoundingClientRect().top -
        12;
    } else if (renameAnchor.current) {
      const anchor = renameAnchor.current;
      const section = chapters.current.get(anchor.id);
      if (section)
        scroll.scrollTop += section.getBoundingClientRect().top - anchor.top;
      renameAnchor.current = null;
    }
  }, [preview, jump.id, jump.request]);
  return (
    <div className="book-reader">
      <div className="book-view-toolbar">
        <span>
          {preview
            ? updating
              ? 'Updating book…'
              : `${preview.pages.length} pages · including 2 front pages`
            : 'Preparing book…'}
        </span>
        <span>6 × 9 in · standard PDF layout</span>
      </div>
      <div
        ref={scroller}
        className="view-scroll book-reading-scroll"
        aria-label="Complete manuscript"
      >
        {error && (
          <div role="alert" className="inline-error">
            {error}{' '}
            <button
              className="text-button"
              onClick={() => setRetry((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        )}
        <div ref={container} className="book-page-viewport">
          {preview && (
            <div
              className="book-page-stack"
              style={{ zoom: scale, width: mmToPx(preview.width) }}
            >
              {preview.pages.map((page, i) => {
                const chapter = book.chapters.find(
                  (c) => c.id === page.chapterId,
                );
                const opening =
                  chapter && preview.pages[i - 1]?.chapterId !== chapter.id;
                return (
                  <section
                    key={i}
                    className="book-sheet"
                    ref={(node) => {
                      if (opening && node)
                        chapters.current.set(chapter.id, node);
                    }}
                  >
                    {opening && (
                      <div className="book-chapter-action">
                        <span>{chapter.title}</span>
                        <button
                          className="text-button"
                          onClick={() => onEdit(chapter.scenes[0].id)}
                        >
                          Edit {chapter.kind} <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                    <div className="book-page-content">
                      <PreviewPage
                        eager={
                          i < 3 || Boolean(opening && chapter.id === jump.id)
                        }
                        page={page}
                        width={preview.width}
                        height={preview.height}
                      />
                      {chapter && page.titleRegion && !readOnly && (
                        <div
                          className="book-page-title-overlay"
                          style={{
                            left: mmToPx(page.titleRegion.x),
                            top: mmToPx(page.titleRegion.y),
                            width: mmToPx(page.titleRegion.width),
                            minHeight: mmToPx(page.titleRegion.height),
                          }}
                        >
                          <EditablePageTitle
                            value={chapter.title}
                            displayTitle={
                              chapterOpening(
                                chapter,
                                chapterNumber(book.chapters, chapter.id),
                              ).title
                            }
                            overlay
                            onSave={(title) => {
                              const section = chapters.current.get(chapter.id);
                              if (section)
                                renameAnchor.current = {
                                  id: chapter.id,
                                  top: section.getBoundingClientRect().top,
                                };
                              onRename(chapter.id, title);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
