import { useEffect, useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { chapterListTitle, type Chapter } from '../domain/book';
import { EntryMenu } from './EntryMenu';

export function ChapterTabs({
  chapters,
  activeId,
  onOpen,
  onClose,
  onCloseOthers,
  onCloseAll,
  onMove,
}: {
  chapters: { chapter: Chapter; number: number | null }[];
  activeId?: string;
  onOpen: (chapter: Chapter) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  onMove: (id: string, targetId: string) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState('');
  const [dropTarget, setDropTarget] = useState('');
  const tabOrder = chapters.map(({ chapter }) => chapter.id).join(':');
  const close = (id: string) => {
    const tabs = [
      ...(strip.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ||
        []),
    ];
    const index = chapters.findIndex((item) => item.chapter.id === id);
    const shouldFocus = tabs[index]?.parentElement?.contains(
      document.activeElement,
    );
    onClose(id);
    if (shouldFocus)
      (tabs[index - 1] || tabs[index + 1])?.focus({ preventScroll: true });
  };
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
  }, [activeId, tabOrder]);
  return (
    <div
      className="chapter-tabs"
      role="tablist"
      aria-label="Open chapters"
      ref={strip}
      onDragOver={(event) => {
        if (
          !event.dataTransfer.types.includes('application/x-writing-studio-tab')
        )
          return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left + 36)
          event.currentTarget.scrollLeft -= 18;
        if (event.clientX > bounds.right - 36)
          event.currentTarget.scrollLeft += 18;
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDropTarget('');
      }}
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
      {chapters.map(({ chapter, number }, index) => (
        <div
          key={chapter.id}
          className={`chapter-tab ${activeId === chapter.id ? 'active' : ''} ${dragging === chapter.id ? 'dragging' : ''} ${dropTarget === chapter.id ? 'tab-drop-target' : ''}`}
          onAuxClick={(event) => {
            if (event.button === 1) {
              event.preventDefault();
              close(chapter.id);
            }
          }}
          onMouseDown={(event) => {
            if (event.button === 1) event.preventDefault();
          }}
          onDragOver={(event) => {
            if (
              event.dataTransfer.types.includes(
                'application/x-writing-studio-tab',
              )
            ) {
              event.preventDefault();
              setDropTarget(chapter.id);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData(
              'application/x-writing-studio-tab',
            );
            if (id) onMove(id, chapter.id);
            setDragging('');
            setDropTarget('');
          }}
        >
          <button
            role="tab"
            aria-selected={activeId === chapter.id}
            title={`${chapterListTitle(chapter, number)} · Drag to reorder tab`}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                'application/x-writing-studio-tab',
                chapter.id,
              );
              event.dataTransfer.effectAllowed = 'move';
              setDragging(chapter.id);
            }}
            onDragEnd={() => {
              setDragging('');
              setDropTarget('');
            }}
            onClick={() => onOpen(chapter)}
          >
            <FileText size={14} />
            <span>{chapterListTitle(chapter, number)}</span>
          </button>
          <button
            className="close-chapter-tab"
            aria-label={`Close chapter tab: ${chapter.title}`}
            title="Close tab (chapter stays saved)"
            onClick={() => close(chapter.id)}
          >
            <X size={13} />
          </button>
          <EntryMenu
            label={chapterListTitle(chapter, number)}
            contextOnly
            contextSelector=".chapter-tab"
            actions={[
              { label: 'Close tab', onSelect: () => close(chapter.id) },
              {
                label: 'Close other tabs',
                disabled: chapters.length < 2,
                onSelect: () => onCloseOthers(chapter.id),
              },
              { label: 'Close all tabs', onSelect: onCloseAll },
              ...(index > 0
                ? [
                    {
                      label: 'Move tab left',
                      onSelect: () =>
                        onMove(chapter.id, chapters[index - 1].chapter.id),
                    },
                  ]
                : []),
              ...(index < chapters.length - 1
                ? [
                    {
                      label: 'Move tab right',
                      onSelect: () =>
                        onMove(chapter.id, chapters[index + 1].chapter.id),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ))}
    </div>
  );
}
