import { useState } from 'react';
import { BookOpen, Plus, ArrowRight, ChevronLeft } from 'lucide-react';
import { bookWords, estimatedBookPages, type Book } from '../domain/book';
export function ProjectChooser({
  books,
  onOpen,
  onCreate,
  readOnly,
}: {
  books: Book[];
  onOpen: (id: string) => void;
  onCreate: (title: string, author: string) => void;
  readOnly: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  if (creating)
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onCreate(title.trim(), author.trim());
        }}
      >
        <button
          type="button"
          className="text-button"
          onClick={() => setCreating(false)}
        >
          <ChevronLeft size={15} />
          Existing projects
        </button>
        <label className="new-project-title">
          Working title
          <input
            autoFocus
            required
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title"
          />
        </label>
        <label>
          Author
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <div className="modal-footer">
          <button
            className="primary-button"
            disabled={readOnly || !title.trim()}
          >
            <Plus size={16} />
            Create project
          </button>
        </div>
      </form>
    );
  return (
    <div className="project-chooser">
      <div className="project-chooser-heading">
        <span className="eyebrow">EXISTING PROJECTS</span>
        <button
          className="secondary-button"
          disabled={readOnly}
          onClick={() => setCreating(true)}
        >
          <Plus size={15} />
          New project
        </button>
      </div>
      <div className="project-library-list">
        {[...books]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((book) => (
            <button
              key={book.id}
              className="project-library-item"
              onClick={() => onOpen(book.id)}
            >
              <span className="project-cover">
                <BookOpen size={22} />
              </span>
              <span>
                <strong>{book.title || 'Untitled project'}</strong>
                <small>
                  {book.chapters.length} chapters ·{' '}
                  {bookWords(book).toLocaleString()} words · ~
                  {estimatedBookPages(book)} pages
                </small>
                <small>
                  Edited {new Date(book.updatedAt).toLocaleDateString()}
                </small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
      </div>
    </div>
  );
}
