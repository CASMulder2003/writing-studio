import { useEffect, useRef } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { chapterWords, docHtml, hasContent, type Book } from '../domain/book';

export function Manuscript({
  book,
  jump,
  onEdit,
  onAdd,
  readOnly,
}: {
  book: Book;
  jump: { id: string; request: number };
  onEdit: (sceneId: string) => void;
  onAdd: () => void;
  readOnly: boolean;
}) {
  const chapters = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    chapters.current
      .get(jump.id)
      ?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [book.id, jump.id, jump.request]);
  return (
    <div
      className="view-scroll reading-scroll"
      aria-label="Complete manuscript"
    >
      <article className="reading-paper">
        <header>
          <span className="eyebrow">COMPLETE MANUSCRIPT</span>
          <h1>{book.title}</h1>
          {book.author && <p>{book.author}</p>}
          <p className="manuscript-overview-hint">
            All {book.chapters.length} chapters in order. Open a chapter to edit
            it.
          </p>
        </header>
        {book.chapters.map((chapter, index) => (
          <section
            key={chapter.id}
            className="reading-chapter"
            aria-label={`Chapter ${index + 1}: ${chapter.title}`}
            ref={(node) => {
              if (node) chapters.current.set(chapter.id, node);
              else chapters.current.delete(chapter.id);
            }}
          >
            <div className="manuscript-chapter-bar">
              <span className="chapter-kicker">CHAPTER {index + 1}</span>
              <button
                className="secondary-button"
                onClick={() => onEdit(chapter.scenes[0].id)}
              >
                Edit chapter
                <ArrowRight size={14} />
              </button>
            </div>
            <h2>{chapter.title}</h2>
            <p className="manuscript-chapter-meta">
              {chapter.status} · {chapterWords(chapter).toLocaleString()} words
            </p>
            {chapter.scenes.map((scene) => (
              <div key={scene.id} className="reading-scene">
                {hasContent(scene.content) ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: docHtml(scene.content) }}
                  />
                ) : (
                  <p className="hint">This chapter is empty.</p>
                )}
              </div>
            ))}
          </section>
        ))}
        <button
          className="text-button manuscript-add-chapter"
          disabled={readOnly}
          onClick={onAdd}
        >
          <Plus size={14} />
          Add chapter
        </button>
      </article>
    </div>
  );
}
