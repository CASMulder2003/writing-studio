import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Feather,
  Plus,
  Search,
  PanelRight,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Users,
  NotebookPen,
  Settings2,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  X,
  Check,
  CloudOff,
  FileText,
  History,
  Bookmark,
  GripVertical,
  RotateCcw,
  ArrowRight,
  CircleHelp,
  ImagePlus,
  Pencil,
} from 'lucide-react';
import { useLibrary } from '../storage/useLibrary';
import {
  backup,
  bookWords,
  chapterWords,
  estimatedChapterPages,
  characterNameParts,
  updateCharacterName,
  download,
  fileName,
  id,
  importCopy,
  manuscriptHtml,
  manuscriptText,
  mentions,
  newBook,
  newChapter,
  parseBackup,
  plainText,
  reorder,
  statuses,
  words,
  type Book,
  type Character,
  type Chapter,
  type DocNode,
  type Scene,
  type Status,
  type Note,
  type NoteImage,
} from '../domain/book';
import { Writer } from '../features/Writer';
import { DrawingPad } from '../features/DrawingPad';
import { ProjectChooser } from '../features/ProjectChooser';
import { Manuscript } from '../features/Manuscript';
import { ChapterTabs } from '../features/ChapterTabs';
import { useChapterTabs } from '../features/useChapterTabs';
import { readImage } from '../shared/images';

type View = 'write' | 'outline' | 'characters' | 'notes' | 'read';
type ModalName =
  | null
  | 'newBook'
  | 'newChapter'
  | 'export'
  | 'settings'
  | 'trash'
  | 'search'
  | 'moveScene'
  | 'help'
  | 'drawing'
  | 'library';
const fmt = (n: number) => n.toLocaleString();
const shortDate = (n: number) =>
  new Date(n).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    element?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      element?.close();
      if (returnFocus.current?.isConnected)
        returnFocus.current.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Feather;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon size={30} strokeWidth={1.3} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export default function App() {
  const library = useLibrary();
  const [activeBook, setActiveBook] = useState(() => {
    try {
      return localStorage.getItem('writing-studio-active') || '';
    } catch {
      return '';
    }
  });
  const [openBookIds, setOpenBookIds] = useState<string[] | null>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('writing-studio-open-books') || 'null',
      );
      return Array.isArray(saved) && saved.every((id) => typeof id === 'string')
        ? saved
        : null;
    } catch {
      return null;
    }
  });
  const visibleBooks =
    openBookIds === null
      ? library.books.slice(0, 1)
      : openBookIds
          .map((id) => library.books.find((b) => b.id === id))
          .filter((b): b is Book => Boolean(b));
  const book = visibleBooks.find((b) => b.id === activeBook) || visibleBooks[0];
  const chapterTabs = useChapterTabs(book);
  const [activeScene, setActiveScene] = useState('');
  const chapter =
    book?.chapters.find((c) => c.scenes.some((s) => s.id === activeScene)) ||
    book?.chapters[0];
  const scene =
    chapter?.scenes.find((s) => s.id === activeScene) || chapter?.scenes[0];
  const [view, setView] = useState<View>('outline');
  const [readOrigin, setReadOrigin] = useState<'outline' | 'write'>('outline');
  const sidebarList = useRef<HTMLDivElement>(null);
  const outlineScroll = useRef<HTMLDivElement>(null);
  const outlinePositions = useRef<Record<string, number>>({});
  const [manuscriptJump, setManuscriptJump] = useState({ id: '', request: 0 });
  const editorScroll = useRef<HTMLDivElement>(null);
  const [inspector, setInspector] = useState(() => window.innerWidth > 1100);
  const [inspectorTab, setInspectorTab] = useState<
    'scene' | 'character' | 'history'
  >('scene');
  const [characterId, setCharacterId] = useState('');
  const [noteId, setNoteId] = useState('');
  const [focus, setFocus] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const navigationToggle = useRef<HTMLButtonElement>(null);
  const contextToggle = useRef<HTMLButtonElement>(null);
  const readingToggle = useRef<HTMLButtonElement>(null);
  const outlineLink = useRef<HTMLButtonElement>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [dragging, setDragging] = useState('');
  const [contextNoteId, setContextNoteId] = useState('');
  const [attachmentNoteId, setAttachmentNoteId] = useState('');
  const [selectedChapters, setSelectedChapters] = useState(new Set<string>());
  const [pdfSize, setPdfSize] = useState<'compact' | 'large'>('large');
  const [layoutCounts, setLayoutCounts] = useState<{
    chapters: Chapter[];
    size: 'compact' | 'large';
    counts: Record<string, number>;
  }>();
  const [writingCount, setWritingCount] = useState<{
    scene: string;
    size: string;
    count: number;
  }>();
  const paginationCache = useRef(
    new WeakMap<Chapter, Partial<Record<'compact' | 'large', number>>>(),
  );
  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { createBookPreview } = await import('../features/bookPdf');
        const counts: Record<string, number> = {};
        for (const chapter of book.chapters) {
          if (cancelled) return;
          const cached = paginationCache.current.get(chapter) || {};
          if (cached[pdfSize] === undefined) {
            const preview = await createBookPreview(
              { ...book, chapters: [chapter] },
              new Set([chapter.id]),
              pdfSize,
            );
            cached[pdfSize] = preview.pages.length - 2;
            paginationCache.current.set(chapter, cached);
            // Yield between chapters so a long book never blocks navigation.
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          counts[chapter.id] = cached[pdfSize]!;
        }
        if (!cancelled)
          setLayoutCounts({ chapters: book.chapters, size: pdfSize, counts });
      } catch {
        /* Keep the estimate; Read book and Export report any font/image error. */
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [book?.chapters, pdfSize]);
  useEffect(() => {
    try {
      setPdfSize(
        localStorage.getItem('writing-studio-size-' + book?.id) === 'compact'
          ? 'compact'
          : 'large',
      );
    } catch {
      setPdfSize('large');
    }
  }, [book?.id]);
  const changePageSize = (size: 'compact' | 'large') => {
    setPdfSize(size);
    try {
      localStorage.setItem('writing-studio-size-' + book?.id, size);
    } catch {
      /* Optional view preference. */
    }
  };
  const knownPages = (target: Chapter) =>
    layoutCounts?.size === pdfSize && layoutCounts.chapters.includes(target)
      ? layoutCounts.counts[target.id]
      : undefined;
  const chapterPageLabel = (target: Chapter) =>
    knownPages(target) !== undefined
      ? `${knownPages(target)} pages`
      : `~${estimatedChapterPages(target)} pages`;
  const allPagesKnown =
    book && book.chapters.every((c) => knownPages(c) !== undefined);
  const bodyPageCount =
    book?.chapters.reduce(
      (sum, c) =>
        sum + (knownPages(c) ?? Math.max(1, estimatedChapterPages(c))),
      0,
    ) || 0;
  const [pdfBusy, setPdfBusy] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bookRef = useRef<Book | undefined>(book);
  bookRef.current = book;
  useEffect(() => {
    if (view === 'write' && editorScroll.current)
      editorScroll.current.scrollTop = 0;
  }, [scene?.id, view]);
  useEffect(() => {
    if (view === 'outline' && outlineScroll.current && book)
      outlineScroll.current.scrollTop = outlinePositions.current[book.id] || 0;
  }, [view, book?.id]);
  useEffect(() => {
    if (view !== 'write' && view !== 'read') return;
    const list = sidebarList.current;
    const item = list?.querySelector<HTMLElement>('.chapter-item.active');
    if (!list || !item) return;
    const revealSelected = () => {
      const top = item.offsetTop;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (top + item.offsetHeight > list.scrollTop + list.clientHeight)
        list.scrollTop = top + item.offsetHeight - list.clientHeight;
    };
    revealSelected();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(revealSelected);
    observer.observe(list);
    return () => observer.disconnect();
  }, [chapter?.id, view, book?.id]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (book)
      try {
        localStorage.setItem('writing-studio-active', book.id);
      } catch {
        /* Optional navigation preference. */
      }
  }, [book?.id]);
  useEffect(() => {
    if (openBookIds !== null)
      try {
        localStorage.setItem(
          'writing-studio-open-books',
          JSON.stringify(openBookIds),
        );
      } catch {
        /* Optional workspace preference. */
      }
  }, [openBookIds]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal('search');
      }
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
      // Native dialogs handle their own cancellation, leaving lower layers open.
      if (modal) return;
      if (focus) {
        e.preventDefault();
        e.stopPropagation();
        setFocus(false);
      } else if (mobileNav) {
        e.preventDefault();
        e.stopPropagation();
        setMobileNav(false);
        navigationToggle.current?.focus({ preventScroll: true });
      } else if (view === 'read') {
        e.preventDefault();
        e.stopPropagation();
        setView(readOrigin);
        readingToggle.current?.focus({ preventScroll: true });
      } else if (view === 'write' && inspector) {
        e.preventDefault();
        e.stopPropagation();
        if (
          document.activeElement instanceof Element &&
          document.activeElement.closest('.inspector')
        )
          contextToggle.current?.focus({ preventScroll: true });
        setInspector(false);
      }
    };
    // Handle workspace dismissal before the rich-text editor's Escape binding.
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [focus, modal, mobileNav, view, inspector, readOrigin]);
  const mutate = (fn: (b: Book) => Book) => {
    if (bookRef.current && !library.readOnly) {
      const updated = fn(bookRef.current);
      bookRef.current = updated;
      library.update(updated);
    }
  };
  const patchChapter = (patch: Partial<Chapter>, chapterId = chapter?.id) =>
    mutate((b) => ({
      ...b,
      chapters: b.chapters.map((c) =>
        c.id === chapterId ? { ...c, ...patch } : c,
      ),
    }));
  const patchScene = (patch: Partial<Scene>) => {
    if (!scene) return;
    const sid = scene.id;
    mutate((b) => ({
      ...b,
      chapters: b.chapters.map((c) => ({
        ...c,
        scenes: c.scenes.map((s) =>
          s.id === sid ? { ...s, ...patch, updatedAt: Date.now() } : s,
        ),
      })),
    }));
  };
  const chooseScene = (sid: string) => {
    const targetBook = bookRef.current;
    const target = targetBook?.chapters.find((c) =>
      c.scenes.some((s) => s.id === sid),
    );
    if (targetBook && target) chapterTabs.open(targetBook.id, target.id);
    setActiveScene(sid);
    setView('write');
    setMobileNav(false);
  };
  const showOutline = () => {
    setView('outline');
    setMobileNav(false);
  };
  const closeChapterTab = (chapterId: string) => {
    const next = chapterTabs.close(chapterId);
    if (chapterId === chapter?.id && view === 'write') {
      const nextChapter = book?.chapters.find((c) => c.id === next);
      if (nextChapter) setActiveScene(nextChapter.scenes[0].id);
      else {
        showOutline();
        outlineLink.current?.focus();
      }
    }
  };
  const chooseChapter = (target: Chapter) => {
    if (view === 'read') {
      setActiveScene(target.scenes[0].id);
      setManuscriptJump((previous) => ({
        id: target.id,
        request: previous.request + 1,
      }));
      setMobileNav(false);
    } else chooseScene(target.scenes[0].id);
  };
  const open = (name: ModalName) => {
    setFormTitle('');
    setFormAuthor('');
    setFormError('');
    if (name === 'export')
      setSelectedChapters(
        new Set(bookRef.current?.chapters.map((c) => c.id) || []),
      );
    setModal(name);
  };
  const openProject = (projectId: string) => {
    setOpenBookIds([projectId]);
    setActiveBook(projectId);
    setActiveScene('');
    setCharacterId('');
    setNoteId('');
    setView('outline');
    setMobileNav(false);
    setFocus(false);
    setModal(null);
  };
  const createProject = (title: string, author: string) => {
    const next = newBook(title, author);
    library.update(next);
    openProject(next.id);
  };
  const closeProject = () => {
    setOpenBookIds([]);
    setActiveBook('');
    setActiveScene('');
    setView('outline');
    setModal(null);
    setMobileNav(false);
    setFocus(false);
  };
  const openCharacter = (cid: string) => {
    setCharacterId(cid);
    setInspector(true);
    setInspectorTab('character');
  };
  const moveChapter = (cid: string, index: number) =>
    mutate((b) => ({ ...b, chapters: reorder(b.chapters, cid, index) }));
  const makeCharacter = () => {
    const c: Character = {
      id: id(),
      name: '',
      firstName: '',
      middleNames: '',
      lastName: '',
      aliases: [],
      role: '',
      description: '',
      notes: '',
      color: '#6a786a',
    };
    mutate((b) => ({ ...b, characters: [...b.characters, c] }));
    setCharacterId(c.id);
    setView('characters');
  };
  const makeNote = (chapterId: string | null = null) => {
    const n: Note = {
      id: id(),
      title: 'Untitled note',
      body: '',
      chapterId,
      status: 'Idea',
      images: [],
      updatedAt: Date.now(),
    };
    mutate((b) => ({ ...b, notes: [...b.notes, n] }));
    setNoteId(n.id);
    if (chapterId) setContextNoteId(n.id);
    else setView('notes');
  };
  const patchNote = (nid: string, patch: Partial<Note>) =>
    mutate((b) => ({
      ...b,
      notes: b.notes.map((n) =>
        n.id === nid ? { ...n, ...patch, updatedAt: Date.now() } : n,
      ),
    }));
  const attachImage = (nid: string, image: NoteImage) =>
    mutate((b) => ({
      ...b,
      notes: b.notes.map((n) =>
        n.id === nid
          ? {
              ...n,
              images: [...(n.images || []), image],
              updatedAt: Date.now(),
            }
          : n,
      ),
    }));
  const snapshot = () => {
    if (!scene) return;
    mutate((b) => ({
      ...b,
      snapshots: [
        {
          id: id(),
          sceneId: scene.id,
          title: chapter?.title || 'Chapter',
          content: structuredClone(scene.content),
          createdAt: Date.now(),
        },
        ...b.snapshots,
      ].slice(0, 1000),
    }));
    setToast('A version of this chapter has been saved.');
  };
  const restoreSnapshot = (snapshotId: string) => {
    const old = book?.snapshots.find((s) => s.id === snapshotId);
    if (!old || !scene) return;
    mutate((b) => ({
      ...b,
      snapshots: [
        {
          id: id(),
          sceneId: scene.id,
          title: 'Before restore · ' + chapter?.title,
          content: structuredClone(scene.content),
          createdAt: Date.now(),
        },
        ...b.snapshots,
      ].slice(0, 1000),
      chapters: b.chapters.map((c) => ({
        ...c,
        scenes: c.scenes.map((s) =>
          s.id === old.sceneId
            ? {
                ...s,
                content: structuredClone(old.content),
                updatedAt: Date.now(),
              }
            : s,
        ),
      })),
    }));
    setEditorVersion((n) => n + 1);
    setToast('Version restored. Your previous draft is also saved.');
  };
  const removeChapter = (cid: string) => {
    if (!book || book.chapters.length === 1) {
      setToast('Keep at least one chapter in your book.');
      return;
    }
    mutate((b) => ({
      ...b,
      trash: [
        {
          chapter: b.chapters.find((c) => c.id === cid)!,
          deletedAt: Date.now(),
        },
        ...b.trash,
      ],
      chapters: b.chapters.filter((c) => c.id !== cid),
    }));
    setToast('Chapter moved to Recently removed.');
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 80 * 1024 * 1024)
        throw new Error('Choose a backup smaller than 80 MB.');
      const incoming = importCopy(parseBackup(JSON.parse(await file.text())));
      library.update(incoming);
      openProject(incoming.id);
      setToast('Backup imported as a separate book.');
    } catch (e) {
      setFormError(
        e instanceof Error && e.message.length < 200
          ? e.message
          : 'This is not a valid Writing Studio backup. Your existing books were not changed.',
      );
    }
    if (inputRef.current) inputRef.current.value = '';
  };
  if (!library.ready)
    return (
      <div className="loading">
        <Feather size={30} />
        <p>Loading Writing Studio…</p>
      </div>
    );
  if (!book && library.books.length)
    return (
      <div className="library-home">
        <header className="app-header">
          <div className="brand">
            <span className="brand-icon">
              <Feather size={20} />
            </span>
            <span>Writing Studio</span>
          </div>
        </header>
        <main>
          <span className="eyebrow">YOUR LIBRARY</span>
          <h1>Open a project</h1>
          <p>Choose a saved project or create a new one.</p>
          <ProjectChooser
            books={library.books}
            onOpen={openProject}
            onCreate={createProject}
            readOnly={library.readOnly}
          />
        </main>
      </div>
    );
  if (!book || !chapter || !scene)
    return (
      <div className="loading">
        <CloudOff size={30} />
        <h1>Writing Studio could not open</h1>
        <p>{library.error}</p>
        <button className="primary-button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  const total = bookWords(book),
    count = chapterWords(chapter),
    readOnly = library.readOnly;
  const character =
    book.characters.find((c) => c.id === characterId) || book.characters[0];
  const note = book.notes.find((n) => n.id === noteId) || book.notes[0];
  const chapterIndex = book.chapters.findIndex((c) => c.id === chapter.id);
  const chapterNotes = book.notes.filter((n) => n.chapterId === chapter.id);
  const contextNote = chapterNotes.find((n) => n.id === contextNoteId);
  const selectedBook = {
    ...book,
    chapters: book.chapters.filter((c) => selectedChapters.has(c.id)),
  };
  const allScenes = book.chapters.flatMap((c) =>
    c.scenes.map((s) => ({ chapter: c, scene: s })),
  );
  const matchesFor = (content: DocNode, characterId: string) =>
    mentions(plainText(content), book.characters).filter(
      (match) => match.characterId === characterId,
    );
  const characterScenes = character
    ? allScenes.filter((x) => matchesFor(x.scene.content, character.id).length)
    : [];
  const navItems: { id: View; label: string; icon: typeof BookOpen }[] = [
    { id: 'outline', label: 'Outline', icon: LayoutGrid },
    { id: 'characters', label: 'Characters', icon: Users },
    { id: 'notes', label: 'Notebook', icon: NotebookPen },
  ];
  const patchCharacter = (patch: Partial<Character>) => {
    if (character)
      mutate((b) => ({
        ...b,
        characters: b.characters.map((c) =>
          c.id === character.id ? { ...c, ...patch } : c,
        ),
      }));
  };
  const nameParts = character ? characterNameParts(character) : null;
  const patchName = (patch: Parameters<typeof updateCharacterName>[1]) => {
    if (character)
      mutate((b) => ({
        ...b,
        characters: b.characters.map((c) =>
          c.id === character.id ? updateCharacterName(c, patch) : c,
        ),
      }));
  };
  const characterFields = character ? (
    <div className="character-fields" key={character.id}>
      <div className="character-identity">
        <span className="avatar mini">
          {character.name.slice(0, 1).toUpperCase() || '?'}
        </span>
        <strong>{character.name || 'New character'}</strong>
      </div>
      <div className="character-name-fields">
        <label>
          First name
          <input
            aria-label="First name"
            autoFocus={!character.name}
            maxLength={80}
            value={nameParts!.firstName}
            disabled={readOnly}
            onChange={(e) => patchName({ firstName: e.target.value })}
          />
        </label>
        <label>
          Last name
          <input
            aria-label="Last name"
            maxLength={80}
            value={nameParts!.lastName}
            disabled={readOnly}
            onChange={(e) => patchName({ lastName: e.target.value })}
          />
        </label>
        <label className="middle-names">
          <span>
            Middle names <span className="optional-label">(optional)</span>
          </span>
          <input
            aria-label="Middle names (optional)"
            maxLength={80}
            value={nameParts!.middleNames}
            disabled={readOnly}
            onChange={(e) => patchName({ middleNames: e.target.value })}
          />
        </label>
      </div>
      <p className="hint character-name-hint">
        First names link automatically when unique. Add nicknames below.
      </p>
      <label>
        Role
        <input
          value={character.role}
          disabled={readOnly}
          placeholder="Their place in the story"
          onChange={(e) => patchCharacter({ role: e.target.value })}
        />
      </label>
      <label>
        Aliases & nicknames
        <input
          defaultValue={character.aliases.join(', ')}
          disabled={readOnly}
          placeholder="Separate names with commas"
          onBlur={(e) =>
            patchCharacter({
              aliases: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <label>
        Who they are
        <textarea
          rows={5}
          value={character.description}
          disabled={readOnly}
          placeholder="Background, appearance, motivations…"
          onChange={(e) => patchCharacter({ description: e.target.value })}
        />
      </label>
      <label>
        Working notes
        <textarea
          rows={4}
          value={character.notes}
          disabled={readOnly}
          placeholder="Contradictions, secrets, possibilities…"
          onChange={(e) => patchCharacter({ notes: e.target.value })}
        />
      </label>
      <div className="section-caption">
        APPEARS IN <span>{characterScenes.length}</span>
      </div>
      {characterScenes.length ? (
        characterScenes.map((x) => (
          <button
            key={x.scene.id}
            className="reference-link"
            onClick={() => {
              chooseScene(x.scene.id);
              setInspectorTab('character');
              setInspector(true);
            }}
          >
            <FileText size={14} />
            <span>
              {x.chapter.title}
              <small>
                {matchesFor(x.scene.content, character.id).length} mentions
              </small>
            </span>
            <ArrowRight size={14} />
          </button>
        ))
      ) : (
        <p className="hint">
          Write their name or an alias in a chapter to connect it here.
        </p>
      )}
    </div>
  ) : null;
  return (
    <div
      className={`studio ${focus ? 'focus-mode' : ''} ${inspector ? 'with-inspector' : ''} ${mobileNav ? 'mobile-nav-open' : ''}`}
    >
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <Feather size={20} />
          </span>
          <span>Writing Studio</span>
        </div>
        <button
          className="project-switcher"
          aria-label="Switch project"
          aria-haspopup="dialog"
          title={`Switch project: ${book.title}`}
          onClick={() => open('library')}
        >
          <BookOpen size={16} />
          <span>{book.title || 'Untitled project'}</span>
          <ChevronDown size={14} />
        </button>
        <ChapterTabs
          chapters={chapterTabs.ids.map((id) => ({
            chapter: book.chapters.find((c) => c.id === id)!,
            number: book.chapters.findIndex((c) => c.id === id) + 1,
          }))}
          activeId={view === 'write' ? chapter.id : undefined}
          onOpen={(target) => chooseScene(target.scenes[0].id)}
          onClose={closeChapterTab}
        />
        <div className="header-actions">
          <span
            className={`save-status ${library.error ? 'save-error' : ''}`}
            aria-live="polite"
          >
            {library.error ? (
              <CloudOff size={14} />
            ) : library.pending ? (
              <span className="saving-dot" />
            ) : (
              <Check size={14} />
            )}
            <span>
              {library.error
                ? 'Not saved'
                : library.pending
                  ? 'Saving…'
                  : readOnly
                    ? 'Read only'
                    : 'Saved on this device'}
            </span>
          </span>
          <button
            className="icon-button"
            aria-label="Search book"
            title="Search · Ctrl K"
            onClick={() => open('search')}
          >
            <Search size={18} />
          </button>
          <button
            className="secondary-button export-header"
            onClick={() => open('export')}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </header>
      {readOnly && (
        <div className="notice">
          This workspace is open in another tab. Close that tab and reload here
          to edit safely.
        </div>
      )}
      {library.error && (
        <div className="error-banner" role="alert">
          <span>{library.error}</span>
          <button onClick={library.retry}>Retry saving</button>
          <button onClick={() => open('export')}>Export backup</button>
        </div>
      )}
      <div className="app-body">
        {mobileNav && (
          <button
            className="sidebar-scrim"
            aria-label="Close navigation"
            onClick={() => {
              setMobileNav(false);
              navigationToggle.current?.focus();
            }}
          />
        )}
        <aside className="sidebar">
          <nav className="main-nav" aria-label="Workspace">
            {navItems.map((n) => (
              <button
                key={n.id}
                className={
                  view === n.id ||
                  (n.id === 'outline' && (view === 'write' || view === 'read'))
                    ? 'selected'
                    : ''
                }
                onClick={() => {
                  setView(n.id);
                  setMobileNav(false);
                }}
              >
                <n.icon size={18} />
                {n.label}
                {n.id === 'characters' && book.characters.length > 0 && (
                  <span className="nav-count">{book.characters.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-section">
            <span>
              {view === 'characters'
                ? 'CHARACTER CARDS'
                : view === 'notes'
                  ? 'YOUR NOTES'
                  : 'CHAPTERS'}
            </span>
            <button
              className="icon-button"
              aria-label={
                view === 'characters'
                  ? 'Add character'
                  : view === 'notes'
                    ? 'Add note'
                    : 'Add chapter'
              }
              disabled={readOnly}
              onClick={() =>
                view === 'characters'
                  ? makeCharacter()
                  : view === 'notes'
                    ? makeNote()
                    : open('newChapter')
              }
            >
              <Plus size={16} />
            </button>
          </div>
          <div
            className="sidebar-list"
            ref={sidebarList}
            aria-label={
              view === 'characters'
                ? 'Character list'
                : view === 'notes'
                  ? 'Note list'
                  : 'Chapter list'
            }
          >
            {view === 'characters'
              ? book.characters.map((c) => (
                  <button
                    key={c.id}
                    className={`simple-list-item ${character?.id === c.id ? 'active' : ''}`}
                    onClick={() => setCharacterId(c.id)}
                  >
                    <span className="avatar mini">{c.name.slice(0, 1)}</span>
                    <span>
                      {c.name || 'Unnamed character'}
                      <small>{c.role || 'Character'}</small>
                    </span>
                  </button>
                ))
              : view === 'notes'
                ? book.notes.map((n) => (
                    <button
                      key={n.id}
                      className={`simple-list-item ${note?.id === n.id ? 'active' : ''}`}
                      onClick={() => setNoteId(n.id)}
                    >
                      <FileText size={16} />
                      <span>{n.title || 'Untitled note'}</span>
                    </button>
                  ))
                : book.chapters.map((c, i) => (
                    <div
                      key={c.id}
                      className={`chapter-item ${chapter.id === c.id && (view === 'write' || view === 'read') ? 'active' : ''} ${dragging === c.id ? 'dragging' : ''}`}
                      draggable={!readOnly}
                      onDragStart={(e) => {
                        setDragging(c.id);
                        e.dataTransfer.setData('text/plain', c.id);
                      }}
                      onDragEnd={() => setDragging('')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        moveChapter(e.dataTransfer.getData('text/plain'), i);
                        setDragging('');
                      }}
                    >
                      <div className="chapter-row">
                        <span className="chapter-drag">
                          <GripVertical size={12} />
                        </span>
                        <button
                          className="chapter-select"
                          aria-current={
                            chapter.id === c.id &&
                            (view === 'write' || view === 'read')
                              ? 'page'
                              : undefined
                          }
                          onClick={() => chooseChapter(c)}
                        >
                          <span className="chapter-number">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="chapter-name">
                            {c.title || 'Untitled chapter'}
                            <small>{fmt(chapterWords(c))} words</small>
                          </span>
                          <span
                            className={'status-dot ' + c.status.toLowerCase()}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
          </div>
          <div className="sidebar-bottom">
            <div
              className="book-statistics"
              title="Body pages in the selected book size, excluding the title page and its blank reverse. Recalculated after edits; a tilde marks an estimate."
            >
              <div>
                <strong>{bodyPageCount}</strong>
                <span>{allPagesKnown ? 'body pages' : 'estimated pages'}</span>
              </div>
              <div>
                <strong>{fmt(total)}</strong>
                <span>words</span>
              </div>
              <p>
                {book.chapters.filter((c) => c.status === 'Complete').length}{' '}
                complete <span>·</span>{' '}
                {book.chapters.filter((c) => c.status !== 'Complete').length} in
                progress
              </p>
            </div>
            <div className="sidebar-utilities">
              <button onClick={() => open('trash')}>
                <Trash2 size={14} />
                Recently removed
                {book.trash.length > 0 && ` (${book.trash.length})`}
              </button>
              <button
                className="icon-button"
                aria-label="Book details"
                title="Book details"
                onClick={() => open('settings')}
              >
                <Settings2 size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Writing Studio help"
                onClick={() => open('help')}
              >
                <CircleHelp size={16} />
              </button>
            </div>
          </div>
        </aside>
        <main className="workspace">
          <div className="workspace-bar">
            <nav className="workspace-crumb" aria-label="Breadcrumb">
              <button
                ref={navigationToggle}
                className="icon-button nav-toggle"
                aria-label="Toggle navigation"
                aria-expanded={mobileNav}
                onClick={() => setMobileNav(!mobileNav)}
              >
                <BookOpen size={18} />
              </button>
              <button
                ref={outlineLink}
                className="breadcrumb-link"
                onClick={showOutline}
                aria-current={view === 'outline' ? 'page' : undefined}
              >
                Outline
              </button>
              {view !== 'outline' && (
                <ChevronRight size={13} aria-hidden="true" />
              )}
              {view === 'write' ? (
                <select
                  className="breadcrumb-chapters"
                  aria-label="Go to chapter"
                  value={chapter.id}
                  onChange={(event) => {
                    const target = book.chapters.find(
                      (c) => c.id === event.target.value,
                    );
                    if (target) chooseChapter(target);
                  }}
                >
                  {book.chapters.map((c, index) => (
                    <option key={c.id} value={c.id}>
                      {index + 1}. {c.title || 'Untitled chapter'}
                    </option>
                  ))}
                </select>
              ) : (
                view !== 'outline' && (
                  <span aria-current="page">
                    {view === 'read'
                      ? 'Whole book'
                      : view === 'characters'
                        ? 'Characters'
                        : 'Notebook'}
                  </span>
                )
              )}
            </nav>
            <div className="workspace-actions">
              {(view === 'write' || view === 'read') && (
                <div
                  className="chapter-stepper"
                  aria-label="Chapter navigation"
                >
                  <button
                    className="icon-button"
                    aria-label="Previous chapter"
                    title="Previous chapter"
                    disabled={chapterIndex === 0}
                    onClick={() =>
                      chooseChapter(book.chapters[chapterIndex - 1])
                    }
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Next chapter"
                    title="Next chapter"
                    disabled={chapterIndex === book.chapters.length - 1}
                    onClick={() =>
                      chooseChapter(book.chapters[chapterIndex + 1])
                    }
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}
              {(view === 'write' || view === 'read' || view === 'outline') && (
                <button
                  ref={readingToggle}
                  className="text-button reading-toggle"
                  aria-label={
                    view === 'read'
                      ? readOrigin === 'outline'
                        ? 'Back to outline'
                        : 'Back to chapter'
                      : 'Read book'
                  }
                  title={
                    view === 'read'
                      ? readOrigin === 'outline'
                        ? 'Back to outline'
                        : 'Back to chapter'
                      : 'Read book'
                  }
                  onClick={() => {
                    if (view !== 'read') {
                      setReadOrigin(view === 'write' ? 'write' : 'outline');
                      setManuscriptJump((previous) => ({
                        id: view === 'write' ? chapter.id : '',
                        request: previous.request + 1,
                      }));
                      setView('read');
                    } else setView(readOrigin);
                  }}
                >
                  <BookOpen size={15} />
                  <span>
                    {view === 'read'
                      ? readOrigin === 'outline'
                        ? 'Back to outline'
                        : 'Back to chapter'
                      : 'Read book'}
                  </span>
                </button>
              )}
              <button
                className="icon-button"
                title={focus ? 'Exit focus mode' : 'Focus mode'}
                aria-label={focus ? 'Exit focus mode' : 'Focus mode'}
                onClick={() => setFocus(!focus)}
              >
                {focus ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              {view === 'write' && (
                <button
                  ref={contextToggle}
                  className="icon-button"
                  title="Toggle context panel"
                  aria-label="Toggle context panel"
                  aria-pressed={inspector}
                  onClick={() => setInspector(!inspector)}
                >
                  <PanelRight size={18} />
                </button>
              )}
            </div>
          </div>
          {view === 'write' && (
            <>
              <div className="editor-scroll" ref={editorScroll}>
                <div className="chapter-heading">
                  <div className="chapter-kicker">
                    CHAPTER {String(chapterIndex + 1).padStart(2, '0')}
                    <span />
                    <select
                      aria-label="Chapter status"
                      value={chapter.status}
                      disabled={readOnly}
                      onChange={(e) =>
                        patchChapter({ status: e.target.value as Status })
                      }
                    >
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="chapter-title-input"
                    aria-label="Chapter title"
                    placeholder="Untitled chapter"
                    value={chapter.title}
                    disabled={readOnly}
                    onChange={(e) => patchChapter({ title: e.target.value })}
                  />
                </div>
                <div className="paper">
                  <Writer
                    key={scene.id + '-' + editorVersion}
                    scene={scene}
                    size={pdfSize}
                    onSize={changePageSize}
                    chapterTitle={chapter.title}
                    chapterNumber={chapterIndex + 1}
                    onPages={(count) =>
                      setWritingCount((previous) =>
                        previous?.scene === scene.id &&
                        previous?.size === pdfSize &&
                        previous?.count === count
                          ? previous
                          : { scene: scene.id, size: pdfSize, count },
                      )
                    }
                    characters={book.characters}
                    readOnly={readOnly}
                    onChange={(content: DocNode) => patchScene({ content })}
                    onCharacter={openCharacter}
                  />
                </div>
                <div className="page-end">
                  <span className="page-end-line" />
                  <Feather size={15} />
                  <span className="page-end-line" />
                </div>
              </div>
              <footer className="editor-footer">
                <span>
                  <strong>{fmt(count)}</strong> chapter words{' '}
                  <span className="footer-separator">·</span>{' '}
                  <span title="Writing pages are approximate. Read book shows the exact PDF layout.">
                    {knownPages(chapter) !== undefined
                      ? chapterPageLabel(chapter)
                      : `~${writingCount?.scene === scene.id && writingCount.size === pdfSize ? writingCount.count : estimatedChapterPages(chapter)} pages`}
                  </span>
                </span>
                <span>
                  Chapter {chapterIndex + 1} of {book.chapters.length}
                </span>
              </footer>
            </>
          )}
          {view === 'outline' && (
            <div
              className="view-scroll"
              key={book.id}
              ref={outlineScroll}
              onScroll={(event) => {
                outlinePositions.current[book.id] =
                  event.currentTarget.scrollTop;
              }}
            >
              <div className="view-heading">
                <div>
                  <h1>Outline</h1>
                </div>
                <button
                  className="primary-button"
                  disabled={readOnly}
                  onClick={() => open('newChapter')}
                >
                  <Plus size={16} />
                  Add chapter
                </button>
              </div>
              <div className="outline-summary">
                <span>{book.chapters.length} chapters</span>
                <span>
                  {allPagesKnown ? '' : '~'}
                  {bodyPageCount} body pages
                </span>
                <span>{fmt(total)} words</span>
                <span>
                  {book.chapters.filter((c) => c.status === 'Complete').length}{' '}
                  complete
                </span>
                <span>
                  {book.chapters.filter((c) => c.status === 'Drafting').length}{' '}
                  drafting
                </span>
              </div>
              <div className="outline-grid">
                {book.chapters.map((c, i) => (
                  <article
                    key={c.id}
                    className="outline-card"
                    draggable={!readOnly}
                    onDragStart={(e) =>
                      e.dataTransfer.setData('text/plain', c.id)
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      moveChapter(e.dataTransfer.getData('text/plain'), i);
                    }}
                  >
                    <div className="outline-card-top">
                      <span>CHAPTER {String(i + 1).padStart(2, '0')}</span>
                      <GripVertical size={16} />
                    </div>
                    <button
                      className="outline-title"
                      onClick={() => chooseScene(c.scenes[0].id)}
                    >
                      {c.title || 'Untitled chapter'}
                      <ArrowRight size={16} />
                    </button>
                    <textarea
                      aria-label={'Synopsis for ' + c.title}
                      value={c.synopsis}
                      disabled={readOnly}
                      placeholder="Chapter summary…"
                      onChange={(e) =>
                        patchChapter({ synopsis: e.target.value }, c.id)
                      }
                    />
                    <div className="outline-meta">
                      <select
                        aria-label={'Status for ' + c.title}
                        value={c.status}
                        disabled={readOnly}
                        onChange={(e) =>
                          patchChapter(
                            { status: e.target.value as Status },
                            c.id,
                          )
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <span>
                        {fmt(chapterWords(c))} words · {chapterPageLabel(c)}
                      </span>
                    </div>
                    <div className="outline-controls">
                      <button
                        className="text-button"
                        onClick={() => chooseScene(c.scenes[0].id)}
                      >
                        Open chapter
                      </button>
                      <div>
                        <button
                          className="icon-button"
                          aria-label={'Move ' + c.title + ' up'}
                          disabled={i === 0 || readOnly}
                          onClick={() => moveChapter(c.id, i - 1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={'Move ' + c.title + ' down'}
                          disabled={i === book.chapters.length - 1 || readOnly}
                          onClick={() => moveChapter(c.id, i + 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={'Remove ' + c.title}
                          disabled={book.chapters.length === 1 || readOnly}
                          onClick={() => removeChapter(c.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
          {view === 'characters' && (
            <div className="view-scroll">
              <div className="view-heading">
                <div>
                  <h1>Characters</h1>
                  <p>Character profiles, aliases, and manuscript references.</p>
                </div>
                <button
                  className="primary-button"
                  disabled={readOnly}
                  onClick={makeCharacter}
                >
                  <Plus size={16} />
                  Add character
                </button>
              </div>
              {character ? (
                <div className="character-layout">
                  <div className="character-cards">
                    {book.characters.map((c) => (
                      <button
                        key={c.id}
                        className={`character-card ${character.id === c.id ? 'selected' : ''}`}
                        onClick={() => setCharacterId(c.id)}
                      >
                        <span className="avatar mini">
                          {c.name.slice(0, 1) || '?'}
                        </span>
                        <span className="character-card-copy">
                          <strong>{c.name || 'New character'}</strong>
                          <small>{c.role || 'Add a role'}</small>
                          {c.description && <p>{c.description}</p>}
                        </span>
                      </button>
                    ))}
                  </div>
                  <section className="character-detail">
                    {characterFields}
                  </section>
                </div>
              ) : (
                <Empty
                  icon={Users}
                  title="No characters yet"
                  body="Create a character card with their name, aliases, and notes. Their mentions will be highlighted as you write."
                  action={
                    <button
                      className="secondary-button"
                      disabled={readOnly}
                      onClick={makeCharacter}
                    >
                      <Plus size={16} />
                      Add character
                    </button>
                  }
                />
              )}
            </div>
          )}
          {view === 'notes' && (
            <div className="view-scroll">
              <div className="view-heading">
                <div>
                  <h1>Notebook</h1>
                  <p>Standalone notes and notes linked to chapters.</p>
                </div>
                <button
                  className="primary-button"
                  disabled={readOnly}
                  onClick={() => makeNote()}
                >
                  <Plus size={16} />
                  New note
                </button>
              </div>
              {note ? (
                <article className="note-editor" key={note.id}>
                  <input
                    aria-label="Note title"
                    className="note-title"
                    value={note.title}
                    disabled={readOnly}
                    onChange={(e) =>
                      patchNote(note.id, { title: e.target.value })
                    }
                  />
                  <div className="note-metadata">
                    <label>
                      Attached to
                      <select
                        aria-label="Attach note to chapter"
                        value={note.chapterId || ''}
                        disabled={readOnly}
                        onChange={(e) =>
                          patchNote(note.id, {
                            chapterId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Standalone note</option>
                        {note.chapterId &&
                          !book.chapters.some(
                            (c) => c.id === note.chapterId,
                          ) && (
                            <option value={note.chapterId}>
                              Removed chapter
                            </option>
                          )}
                        {book.chapters.map((c, i) => (
                          <option key={c.id} value={c.id}>
                            {i + 1}. {c.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Status
                      <select
                        aria-label="Note status"
                        value={note.status || 'Idea'}
                        disabled={readOnly}
                        onChange={(e) =>
                          patchNote(note.id, {
                            status: e.target.value as Note['status'],
                          })
                        }
                      >
                        {['Idea', 'Planned', 'In progress', 'Resolved'].map(
                          (status) => (
                            <option key={status}>{status}</option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <textarea
                    aria-label="Note content"
                    value={note.body}
                    disabled={readOnly}
                    placeholder="Write a note…"
                    onChange={(e) =>
                      patchNote(note.id, { body: e.target.value })
                    }
                  />
                  <div className="attachment-tools">
                    <button
                      className="secondary-button"
                      disabled={readOnly}
                      onClick={() => {
                        setAttachmentNoteId(note.id);
                        imageInputRef.current?.click();
                      }}
                    >
                      <ImagePlus size={16} />
                      Add image
                    </button>
                    <button
                      className="secondary-button"
                      disabled={readOnly}
                      onClick={() => {
                        setAttachmentNoteId(note.id);
                        open('drawing');
                      }}
                    >
                      <Pencil size={15} />
                      Draw
                    </button>
                  </div>
                  <div className="note-images">
                    {(note.images || []).map((image) => (
                      <figure key={image.id}>
                        <img src={image.dataUrl} alt={image.name} />
                        <figcaption>
                          <input
                            aria-label="Image caption"
                            value={image.name}
                            disabled={readOnly}
                            onChange={(e) =>
                              patchNote(note.id, {
                                images: note.images.map((item) =>
                                  item.id === image.id
                                    ? { ...item, name: e.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <p className="hint">
                    Last edited {shortDate(note.updatedAt)}
                  </p>
                </article>
              ) : (
                <Empty
                  icon={NotebookPen}
                  title="No notes yet"
                  body="Add a note for the project, or attach it to a chapter."
                  action={
                    <button
                      className="secondary-button"
                      disabled={readOnly}
                      onClick={() => makeNote()}
                    >
                      <Plus size={16} />
                      Write a note
                    </button>
                  }
                />
              )}
            </div>
          )}
          {view === 'read' && (
            <Manuscript
              key={book.id}
              book={book}
              jump={manuscriptJump}
              onEdit={chooseScene}
              size={pdfSize}
              onSize={changePageSize}
              onPageCounts={(counts, size) =>
                setLayoutCounts({ chapters: book.chapters, size, counts })
              }
            />
          )}
        </main>
        {view === 'write' && inspector && (
          <aside className="inspector">
            <div
              className="inspector-tabs"
              role="tablist"
              aria-label="Writing context"
            >
              <button
                role="tab"
                aria-selected={inspectorTab === 'scene'}
                onClick={() => setInspectorTab('scene')}
              >
                Chapter
              </button>
              <button
                role="tab"
                aria-selected={inspectorTab === 'character'}
                onClick={() => setInspectorTab('character')}
              >
                Characters
              </button>
              <button
                role="tab"
                aria-selected={inspectorTab === 'history'}
                onClick={() => setInspectorTab('history')}
                aria-label="Versions"
              >
                <History size={16} />
              </button>
            </div>
            <div className="inspector-content">
              {inspectorTab === 'scene' && (
                <>
                  <div className="inspector-heading">
                    <span className="eyebrow">CURRENT CHAPTER</span>
                    <h2>{chapter.title || 'Untitled chapter'}</h2>
                  </div>
                  <label>
                    Chapter summary
                    <textarea
                      rows={4}
                      value={chapter.synopsis}
                      disabled={readOnly}
                      placeholder="A short summary of this chapter…"
                      onChange={(e) =>
                        patchChapter({ synopsis: e.target.value })
                      }
                    />
                  </label>
                  <div className="section-caption">
                    CHAPTER NOTES
                    <button
                      className="icon-button"
                      aria-label="Add chapter note"
                      disabled={readOnly}
                      onClick={() => makeNote(chapter.id)}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  {chapterNotes.map((n) => (
                    <button
                      key={n.id}
                      className={`linked-note ${contextNote?.id === n.id ? 'active' : ''}`}
                      onClick={() =>
                        setContextNoteId(contextNoteId === n.id ? '' : n.id)
                      }
                    >
                      <NotebookPen size={14} />
                      <span>
                        {n.title}
                        <small>{n.status}</small>
                      </span>
                      <ChevronRight size={13} />
                    </button>
                  ))}
                  {!chapterNotes.length && (
                    <p className="hint">
                      Attach a note here or from the Notebook.
                    </p>
                  )}
                  {contextNote && (
                    <div className="context-note">
                      <label>
                        Note title
                        <input
                          value={contextNote.title}
                          disabled={readOnly}
                          onChange={(e) =>
                            patchNote(contextNote.id, { title: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={contextNote.status}
                          disabled={readOnly}
                          onChange={(e) =>
                            patchNote(contextNote.id, {
                              status: e.target.value as Note['status'],
                            })
                          }
                        >
                          {['Idea', 'Planned', 'In progress', 'Resolved'].map(
                            (status) => (
                              <option key={status}>{status}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <textarea
                        aria-label="Chapter note text"
                        rows={8}
                        value={contextNote.body}
                        disabled={readOnly}
                        onChange={(e) =>
                          patchNote(contextNote.id, { body: e.target.value })
                        }
                      />
                      {contextNote.images?.map((image) => (
                        <img
                          key={image.id}
                          src={image.dataUrl}
                          alt={image.name}
                        />
                      ))}
                      <button
                        className="text-button"
                        onClick={() => {
                          setNoteId(contextNote.id);
                          setView('notes');
                        }}
                      >
                        Open in Notebook
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                  <div className="section-caption">IN THIS CHAPTER</div>
                  {book.characters
                    .filter((c) => matchesFor(scene.content, c.id).length)
                    .map((c) => (
                      <button
                        key={c.id}
                        className="reference-link"
                        onClick={() => openCharacter(c.id)}
                      >
                        <span className="avatar tiny">{c.name[0]}</span>
                        {c.name}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  {!book.characters.some(
                    (c) => matchesFor(scene.content, c.id).length,
                  ) && (
                    <p className="hint">
                      Character mentions appear here as you write.
                    </p>
                  )}
                </>
              )}
              {inspectorTab === 'character' && (
                <>
                  {book.characters.length > 0 ? (
                    <>
                      <label className="character-picker">
                        Character
                        <select
                          value={character?.id || ''}
                          onChange={(e) => setCharacterId(e.target.value)}
                        >
                          {book.characters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {characterFields}
                    </>
                  ) : (
                    <div className="small-empty">
                      <Users size={26} />
                      <h3>Character cards</h3>
                      <p>
                        Create a card, then click their highlighted name in the
                        manuscript.
                      </p>
                      <button
                        className="secondary-button"
                        disabled={readOnly}
                        onClick={makeCharacter}
                      >
                        <Plus size={14} />
                        Add character
                      </button>
                    </div>
                  )}
                </>
              )}
              {inspectorTab === 'history' && (
                <>
                  <div className="inspector-heading">
                    <span className="eyebrow">VERSION HISTORY</span>
                    <h2>Chapter versions</h2>
                    <p className="hint">
                      Save a version before making substantial changes.
                    </p>
                  </div>
                  <button
                    className="secondary-button wide"
                    disabled={readOnly}
                    onClick={snapshot}
                  >
                    <Bookmark size={15} />
                    Save current version
                  </button>
                  <div className="version-list">
                    {book.snapshots
                      .filter((s) => s.sceneId === scene.id)
                      .map((s) => (
                        <article key={s.id}>
                          <strong>{shortDate(s.createdAt)}</strong>
                          <span>
                            {s.title} · {fmt(words(s.content))} words
                          </span>
                          <p>
                            {plainText(s.content).slice(0, 130) ||
                              'Empty chapter'}
                          </p>
                          <button
                            className="text-button"
                            disabled={readOnly}
                            onClick={() => restoreSnapshot(s.id)}
                          >
                            <RotateCcw size={13} />
                            Restore this version
                          </button>
                        </article>
                      ))}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setToast('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            attachImage(attachmentNoteId, await readImage(file));
            setToast('Image attached.');
          } catch (error) {
            setToast(
              error instanceof Error
                ? error.message
                : 'The image could not be opened.',
            );
          }
          if (imageInputRef.current) imageInputRef.current.value = '';
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {modal && (
        <Modal
          title={
            (
              {
                newBook: 'New book',
                newChapter: 'Add a chapter',
                export: 'Export project',
                settings: 'Book details',
                trash: 'Recently removed',
                search: 'Search book',
                moveScene: 'Move chapter',
                help: 'Writing Studio help',
                drawing: 'Add a drawing',
                library: 'Open a project',
              } as Record<string, string>
            )[modal]
          }
          close={() => setModal(null)}
        >
          {modal === 'library' && (
            <ProjectChooser
              books={library.books}
              onOpen={openProject}
              onCreate={createProject}
              readOnly={readOnly}
              activeProjectId={book.id}
              onClose={closeProject}
            />
          )}
          {['newBook', 'newChapter'].includes(modal) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formTitle.trim()) return;
                if (modal === 'newBook') {
                  const b = newBook(formTitle.trim(), formAuthor.trim());
                  library.update(b);
                  openProject(b.id);
                } else if (modal === 'newChapter') {
                  const c = newChapter(formTitle.trim());
                  mutate((b) => ({ ...b, chapters: [...b.chapters, c] }));
                  chooseScene(c.scenes[0].id);
                }
                setModal(null);
              }}
            >
              <label>
                {modal === 'newBook' ? 'Working title' : 'Title'}
                <input
                  autoFocus
                  data-autofocus="true"
                  required
                  maxLength={300}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      modal === 'newChapter' &&
                      e.key === 'Tab' &&
                      !e.shiftKey &&
                      !formTitle.trim()
                    ) {
                      e.preventDefault();
                      setFormTitle('Chapter ' + (book.chapters.length + 1));
                    }
                  }}
                  placeholder={
                    modal === 'newBook'
                      ? 'Book title'
                      : 'Chapter ' + (book.chapters.length + 1)
                  }
                />
              </label>
              {modal === 'newChapter' && (
                <p className="hint chapter-title-suggestion">
                  Press <kbd>Tab</kbd> to use “Chapter{' '}
                  {book.chapters.length + 1}”, or enter your own title.
                </p>
              )}
              {modal === 'newBook' && (
                <label>
                  Author
                  <input
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="Your name"
                  />
                </label>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!formTitle.trim() || readOnly}
                >
                  <Plus size={16} />
                  Create {modal === 'newBook' ? 'book' : 'chapter'}
                </button>
              </div>
            </form>
          )}
          {modal === 'settings' && (
            <>
              <label>
                Book title
                <input
                  value={book.title}
                  disabled={readOnly}
                  onChange={(e) =>
                    mutate((b) => ({ ...b, title: e.target.value }))
                  }
                />
              </label>
              <label>
                Author
                <input
                  value={book.author}
                  disabled={readOnly}
                  onChange={(e) =>
                    mutate((b) => ({ ...b, author: e.target.value }))
                  }
                />
              </label>
              <label>
                One-line description
                <input
                  value={book.subtitle}
                  disabled={readOnly}
                  placeholder="What is this book about?"
                  onChange={(e) =>
                    mutate((b) => ({ ...b, subtitle: e.target.value }))
                  }
                />
              </label>
              <p className="hint">Changes save automatically.</p>
              <div className="modal-footer">
                <button
                  className="primary-button"
                  onClick={() => setModal(null)}
                >
                  Done
                </button>
              </div>
            </>
          )}
          {modal === 'export' && (
            <>
              <p className="modal-intro">
                Choose chapters for a formatted manuscript, or back up the
                complete project with its notes, images, and versions.
              </p>
              <section className="export-selection">
                <div className="section-caption">
                  CHAPTERS TO INCLUDE
                  <div>
                    <button
                      className="text-button"
                      onClick={() =>
                        setSelectedChapters(
                          new Set(book.chapters.map((c) => c.id)),
                        )
                      }
                    >
                      All
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setSelectedChapters(new Set())}
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="chapter-checkboxes">
                  {book.chapters.map((c, i) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={selectedChapters.has(c.id)}
                        onChange={(e) =>
                          setSelectedChapters((previous) => {
                            const next = new Set(previous);
                            e.target.checked
                              ? next.add(c.id)
                              : next.delete(c.id);
                            return next;
                          })
                        }
                      />
                      <span>
                        {i + 1}. {c.title}
                      </span>
                      <small>{fmt(chapterWords(c))} words</small>
                    </label>
                  ))}
                </div>
                <label>
                  Book page size
                  <select
                    value={pdfSize}
                    onChange={(e) =>
                      changePageSize(e.target.value as 'compact' | 'large')
                    }
                  >
                    <option value="compact">
                      Compact novel · 5.5 × 8.5 inches
                    </option>
                    <option value="large">
                      Trade paperback · 6 × 9 inches
                    </option>
                  </select>
                </label>
                <p className="hint">
                  Crimson Text · 10.5 pt · 14 pt line spacing · justified
                  paragraphs. Includes a title page, blank title-page reverse,
                  chapter openings, and page numbers. Chapters retain their
                  original numbers. Planning notes are excluded.
                </p>
              </section>
              <div className="export-options">
                <button
                  disabled={pdfBusy || selectedChapters.size === 0}
                  onClick={async () => {
                    setPdfBusy(true);
                    setFormError('');
                    try {
                      const { downloadBookPdf } =
                        await import('../features/bookPdf');
                      const pages = await downloadBookPdf(
                        book,
                        selectedChapters,
                        pdfSize,
                      );
                      setToast(
                        `PDF exported · ${pages} pages including the title page.`,
                      );
                    } catch (error) {
                      setFormError(
                        error instanceof Error
                          ? error.message
                          : 'The PDF could not be created.',
                      );
                    } finally {
                      setPdfBusy(false);
                    }
                  }}
                >
                  <BookOpen size={22} />
                  <span>
                    <strong>
                      {pdfBusy ? 'Preparing PDF…' : 'Download book PDF'}
                    </strong>
                    <small>
                      {selectedChapters.size} chapters · book formatting
                    </small>
                  </span>
                  <Download size={17} />
                </button>
                <button
                  onClick={() => {
                    download(
                      fileName(book.title) + '.writing-studio.json',
                      JSON.stringify(backup(book), null, 2),
                      'application/json',
                    );
                    setToast(
                      'Book backup exported. Keep a copy somewhere safe.',
                    );
                  }}
                >
                  <Download size={22} />
                  <span>
                    <strong>Back up this book</strong>
                    <small>A complete, restorable Writing Studio file</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button
                  disabled={selectedChapters.size === 0}
                  onClick={() =>
                    download(
                      fileName(book.title) + '.html',
                      manuscriptHtml(selectedBook),
                      'text/html',
                    )
                  }
                >
                  <BookOpen size={22} />
                  <span>
                    <strong>Export HTML</strong>
                    <small>Selected chapters with formatting and images</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button
                  disabled={selectedChapters.size === 0}
                  onClick={() =>
                    download(
                      fileName(book.title) + '.txt',
                      manuscriptText(selectedBook),
                      'text/plain',
                    )
                  }
                >
                  <FileText size={22} />
                  <span>
                    <strong>Export plain text</strong>
                    <small>Selected chapters in reading order</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button
                  disabled={readOnly}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={22} />
                  <span>
                    <strong>Import a backup</strong>
                    <small>
                      Creates a separate book, preserving your existing writing
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              </div>
              {formError && (
                <p className="inline-error" role="alert">
                  {formError}
                </p>
              )}
              <p className="hint">
                When you move from localhost to the public site, export here and
                import there. Each address has its own browser storage.
              </p>
            </>
          )}
          {modal === 'trash' && (
            <>
              {book.trash.length ? (
                book.trash.map((item) => (
                  <div key={item.chapter.id} className="trash-row">
                    <div>
                      <strong>{item.chapter.title}</strong>
                      <small>
                        {shortDate(item.deletedAt)} ·{' '}
                        {fmt(chapterWords(item.chapter))} words
                      </small>
                    </div>
                    <button
                      className="secondary-button"
                      disabled={readOnly}
                      onClick={() => {
                        mutate((b) => ({
                          ...b,
                          chapters: [...b.chapters, item.chapter],
                          trash: b.trash.filter(
                            (t) => t.chapter.id !== item.chapter.id,
                          ),
                        }));
                        setToast('Chapter restored at the end of your book.');
                      }}
                    >
                      <RotateCcw size={14} />
                      Restore
                    </button>
                  </div>
                ))
              ) : (
                <p className="modal-intro">
                  Removed chapters will stay here, ready to restore with their
                  writing and notes.
                </p>
              )}
            </>
          )}
          {modal === 'search' && (
            <>
              <div className="search-field">
                <Search size={18} />
                <input
                  autoFocus
                  data-autofocus="true"
                  aria-label="Search manuscript and notes"
                  placeholder="Search chapters, writing, characters, notes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {search.trim().length < 2 ? (
                <p className="hint">
                  Enter at least two characters. Shortcut: Ctrl / ⌘ K.
                </p>
              ) : (
                <div className="search-results">
                  {allScenes
                    .filter((x) =>
                      (
                        x.chapter.title +
                        ' ' +
                        x.scene.title +
                        ' ' +
                        plainText(x.scene.content)
                      )
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((x) => (
                      <button
                        key={x.scene.id}
                        onClick={() => {
                          chooseScene(x.scene.id);
                          setModal(null);
                        }}
                      >
                        <FileText size={17} />
                        <span>
                          <strong>{x.chapter.title}</strong>
                          <small>
                            {plainText(x.scene.content).slice(
                              Math.max(
                                0,
                                plainText(x.scene.content)
                                  .toLowerCase()
                                  .indexOf(search.toLowerCase()) - 40,
                              ),
                              Math.max(
                                0,
                                plainText(x.scene.content)
                                  .toLowerCase()
                                  .indexOf(search.toLowerCase()) - 40,
                              ) + 180,
                            ) || 'Empty chapter'}
                          </small>
                        </span>
                      </button>
                    ))}
                  {book.characters
                    .filter((c) =>
                      (
                        c.name +
                        ' ' +
                        c.aliases.join(' ') +
                        ' ' +
                        c.description +
                        ' ' +
                        c.notes
                      )
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCharacterId(c.id);
                          setView('characters');
                          setModal(null);
                        }}
                      >
                        <Users size={17} />
                        <span>
                          <strong>{c.name}</strong>
                          <small>Character · {c.role}</small>
                        </span>
                      </button>
                    ))}
                  {book.notes
                    .filter((n) =>
                      (n.title + ' ' + n.body)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setNoteId(n.id);
                          setView('notes');
                          setModal(null);
                        }}
                      >
                        <NotebookPen size={17} />
                        <span>
                          <strong>{n.title}</strong>
                          <small>{n.body.slice(0, 150)}</small>
                        </span>
                      </button>
                    ))}
                  <p className="hint">End of results.</p>
                </div>
              )}
            </>
          )}
          {modal === 'drawing' && (
            <DrawingPad
              onSave={(image) => {
                attachImage(attachmentNoteId, image);
                setModal(null);
              }}
            />
          )}
          {modal === 'help' && (
            <div className="help-copy">
              <p>
                <strong>Chapters.</strong> Open a chapter from Outline or the
                left sidebar. Each chapter opens in a tab; closing its tab keeps
                the chapter saved. Click Outline in the breadcrumb to return to
                the chapter summaries. Use the chapter picker or arrows to
                switch chapters, and Read book for the complete draft. Reorder
                chapters by dragging or using the arrows in Outline.
              </p>
              <p>
                <strong>Characters.</strong> Add a character and their aliases.
                Full names and unique first names are highlighted in the editor;
                click one to open the card. Shared aliases are left unlinked to
                avoid guessing.
              </p>
              <p>
                <strong>Version history.</strong> Save a chapter version from
                the clock tab before making a big change. Removed chapters
                remain in Recently removed.
              </p>
              <p>
                <strong>Local storage.</strong> Automatic saving uses this
                browser’s storage. Export backups regularly, and use a backup to
                move between localhost and GitHub Pages. This version does not
                sync between devices or load without the website/server.
              </p>
              <p>
                <strong>Keyboard shortcuts.</strong> Use the expand button to
                hide the panels. Escape closes the active dialog or panel,
                leaves focus mode, or returns from Read book to the previous
                view. Ctrl / ⌘ K searches your book.
              </p>
              <p>
                <strong>Projects.</strong> Use the project name at the top to
                switch projects, create one, or close the current project. Each
                project keeps its own open chapter tabs.
              </p>
              <button
                className="secondary-button"
                onClick={() => {
                  void navigator.storage
                    ?.persist?.()
                    .then((granted) =>
                      setToast(
                        granted
                          ? 'Persistent storage is enabled. Keep making backups too.'
                          : 'Your browser manages storage automatically. Keep regular backups.',
                      ),
                    )
                    .catch(() =>
                      setToast(
                        'Storage preference could not be changed. Keep regular backups.',
                      ),
                    );
                }}
              >
                Request persistent browser storage
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
