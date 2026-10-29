import { useEffect, useRef } from 'react';
import { FileText, X } from 'lucide-react';
import type { Chapter } from '../domain/book';

export function ChapterTabs({
  chapters,
  activeId,
  onOpen,
  onClose,
}: {
  chapters: { chapter: Chapter; number: number }[];
  activeId?: string;
  onOpen: (chapter: Chapter) => void;
  onClose: (id: string) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const revealSelected = () => {
      const selected = strip.current?.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
      // Only scroll the tab strip; never move the editor or the surrounding page.
      if (selected && strip.current) {
        const item = selected.parentElement!;
        const left = item.offsetLeft;
        if (left < strip.current.scrollLeft) strip.current.scrollLeft = left;
        else if (
          left + item.offsetWidth >
          strip.current.scrollLeft + strip.current.clientWidth
        )
          strip.current.scrollLeft =
            left + item.offsetWidth - strip.current.clientWidth;
      }
    };
    revealSelected();
    if (!strip.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(revealSelected);
    observer.observe(strip.current);
    return () => observer.disconnect();
  }, [activeId, chapters.length]);
  return (
    <div
      className="chapter-tabs"
      role="tablist"
      aria-label="Open chapters"
      ref={strip}
      onKeyDown={(event) => {
        if (
          !(event.target instanceof HTMLElement) ||
          event.target.getAttribute('role') !== 'tab'
        )
          return;
        const tabs = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          ),
        ];
        const index = tabs.indexOf(event.target as HTMLButtonElement);
        const next =
          event.key === 'ArrowRight'
            ? (index + 1) % tabs.length
            : event.key === 'ArrowLeft'
              ? (index - 1 + tabs.length) % tabs.length
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : -1;
        if (next < 0) return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      }}
    >
      {chapters.map(({ chapter, number }) => (
        <div
          key={chapter.id}
          className={`chapter-tab ${activeId === chapter.id ? 'active' : ''}`}
        >
          <button
            role="tab"
            aria-selected={activeId === chapter.id}
            title={`Chapter ${number}: ${chapter.title}`}
            onClick={() => onOpen(chapter)}
          >
            <FileText size={14} />
            <span>
              {number}. {chapter.title || 'Untitled chapter'}
            </span>
          </button>
          <button
            className="close-chapter-tab"
            aria-label={`Close chapter tab: ${chapter.title}`}
            title="Close tab (chapter stays saved)"
            onClick={(event) => {
              const previous =
                event.currentTarget.parentElement?.previousElementSibling?.querySelector<HTMLButtonElement>(
                  '[role="tab"]',
                );
              const next =
                event.currentTarget.parentElement?.nextElementSibling?.querySelector<HTMLButtonElement>(
                  '[role="tab"]',
                );
              onClose(chapter.id);
              (previous || next)?.focus();
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
