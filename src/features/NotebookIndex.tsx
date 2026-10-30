import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  Search,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import {
  chapterListTitle,
  chapterNumber,
  type Book,
  type Note,
} from '../domain/book';
import { EntryMenu } from './EntryMenu';

export function NotebookIndex({
  book,
  activeId,
  resetKey,
  readOnly,
  onOpen,
  onDelete,
  onMove,
}: {
  book: Book;
  activeId?: string;
  resetKey: number;
  readOnly: boolean;
  onOpen: (note: Note) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, chapterId: string | null, beforeId?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [attachment, setAttachment] = useState('all');
  const [status, setStatus] = useState('all');
  const [closed, setClosed] = useState<string[]>([]);
  const [dragging, setDragging] = useState('');
  const [dropTarget, setDropTarget] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const clear = () => {
    setQuery('');
    setAttachment('all');
    setStatus('all');
  };
  useEffect(() => {
    clear();
    setClosed([]);
  }, [resetKey]);
  useEffect(() => {
    const selected = list.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (selected && list.current) {
      const top = selected.offsetTop;
      if (
        top < list.current.scrollTop ||
        top + selected.offsetHeight >
          list.current.scrollTop + list.current.clientHeight
      )
        list.current.scrollTop = Math.max(0, top - 12);
    }
  }, [activeId, resetKey]);
  const groups = [
    { id: 'standalone', chapterId: null, title: 'Standalone' },
    ...book.chapters.map((c) => ({
      id: c.id,
      chapterId: c.id,
      title: chapterListTitle(c, chapterNumber(book.chapters, c.id)),
    })),
    { id: 'removed', chapterId: null, title: 'Removed chapters' },
  ];
  const groupId = (note: Note) =>
    note.chapterId === null
      ? 'standalone'
      : book.chapters.some((c) => c.id === note.chapterId)
        ? note.chapterId
        : 'removed';
  const matching = book.notes.filter(
    (note) =>
      (attachment === 'all' || groupId(note) === attachment) &&
      (status === 'all' || note.status === status) &&
      `${note.title}\n${note.body}\n${note.images.map((image) => image.name).join(' ')}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const filtered = Boolean(query || attachment !== 'all' || status !== 'all');
  const drop = (
    event: DragEvent,
    chapterId: string | null,
    beforeId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData('application/x-writing-studio-note');
    if (!readOnly && id) {
      onMove(id, chapterId, beforeId);
      setClosed((previous) =>
        previous.filter((group) => group !== (chapterId || 'standalone')),
      );
    }
    setDragging('');
    setDropTarget('');
  };
  return (
    <div className="notebook-index">
      <div className="notebook-filters">
        <div className="note-search">
          <Search size={14} />
          <input
            aria-label="Search notes"
            placeholder="Search notes…"
            value={query}
            data-local-escape={query ? 'true' : undefined}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault();
                e.stopPropagation();
                setQuery('');
              }
            }}
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Clear note search"
              onClick={() => setQuery('')}
            >
              <X size={13} />
            </button>
          )}
        </div>
        <select
          aria-label="Filter notes by chapter"
          value={attachment}
          onChange={(e) => setAttachment(e.target.value)}
        >
          <option value="all">All notes</option>
          {groups
            .filter(
              (g) =>
                g.id !== 'removed' ||
                book.notes.some((n) => groupId(n) === 'removed'),
            )
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
        </select>
        <div className="note-filter-row">
          <select
            aria-label="Filter notes by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {['Idea', 'Planned', 'In progress', 'Resolved'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span>
            {matching.length} of {book.notes.length}
          </span>
          {filtered && (
            <button className="text-button" onClick={clear}>
              Reset
            </button>
          )}
        </div>
      </div>
      <div className="notebook-note-list" ref={list} aria-label="Notes">
        {groups.map((group) => {
          const notes = matching.filter((n) => groupId(n) === group.id);
          if (!notes.length && attachment !== group.id) return null;
          return (
            <section
              key={group.id}
              className={
                'note-group ' + (dropTarget === group.id ? 'drop-target' : '')
              }
            >
              <button
                className="note-group-heading"
                aria-label={`${group.title}, ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
                aria-expanded={!closed.includes(group.id)}
                onClick={() =>
                  setClosed((previous) =>
                    previous.includes(group.id)
                      ? previous.filter((id) => id !== group.id)
                      : [...previous, group.id],
                  )
                }
                onDragOver={(e) => {
                  if (
                    !readOnly &&
                    e.dataTransfer.types.includes(
                      'application/x-writing-studio-note',
                    ) &&
                    group.id !== 'removed'
                  ) {
                    e.preventDefault();
                    setDropTarget(group.id);
                  }
                }}
                onDrop={(e) => {
                  if (group.id !== 'removed') drop(e, group.chapterId);
                }}
              >
                {closed.includes(group.id) ? (
                  <ChevronRight size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
                <span>{group.title}</span>
                <small>{notes.length}</small>
              </button>
              {!closed.includes(group.id) &&
                notes.map((note, i) => (
                  <div
                    key={note.id}
                    className={`notebook-list-row ${activeId === note.id ? 'active' : ''} ${dragging === note.id ? 'dragging' : ''} ${dropTarget === note.id ? 'drop-target' : ''}`}
                  >
                    <button
                      className="note-open"
                      aria-label={`Open note: ${note.title || 'Untitled note'}`}
                      draggable={!readOnly}
                      aria-current={activeId === note.id ? 'page' : undefined}
                      onClick={() => onOpen(note)}
                      onDragOver={(e) => {
                        if (
                          !readOnly &&
                          e.dataTransfer.types.includes(
                            'application/x-writing-studio-note',
                          )
                        ) {
                          e.preventDefault();
                          setDropTarget(note.id);
                        }
                      }}
                      onDrop={(e) => drop(e, note.chapterId, note.id)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/x-writing-studio-note',
                          note.id,
                        );
                        e.dataTransfer.effectAllowed = 'move';
                        setDragging(note.id);
                      }}
                      onDragEnd={() => {
                        setDragging('');
                        setDropTarget('');
                      }}
                    >
                      <GripVertical className="note-grip" size={13} />
                      <span className="note-index-copy">
                        <strong>{note.title || 'Untitled note'}</strong>
                        <span className="note-preview">
                          {note.body.trim() ||
                            (note.images.length ? 'Image note' : 'Empty note')}
                        </span>
                        <small>
                          {note.status}
                          {note.images.length > 0 && (
                            <span>
                              <ImageIcon size={11} />
                              {note.images.length}
                            </span>
                          )}
                        </small>
                      </span>
                    </button>
                    <EntryMenu
                      label={note.title || 'Note'}
                      disabled={readOnly}
                      onDelete={() => onDelete(note.id)}
                      onUp={
                        i > 0
                          ? () =>
                              onMove(note.id, note.chapterId, notes[i - 1].id)
                          : undefined
                      }
                      onDown={
                        i < notes.length - 1
                          ? () =>
                              onMove(notes[i + 1].id, note.chapterId, note.id)
                          : undefined
                      }
                    />
                  </div>
                ))}
            </section>
          );
        })}
        {!matching.length && (
          <p className="note-list-empty">
            {book.notes.length
              ? 'No notes match these filters.'
              : 'Your notes will appear here.'}
          </p>
        )}
      </div>
      <p className="note-order-hint">
        Drag to reorder. Drop on a group to move a note.
      </p>
    </div>
  );
}
