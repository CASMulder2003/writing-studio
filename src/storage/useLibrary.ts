import { useCallback, useEffect, useRef, useState } from 'react';
import {
  backup,
  bookSchema,
  newBook,
  normaliseBook,
  type Book,
} from '../domain/book';
import { database, storeBook } from './database';

const recoveryKey = 'writing-studio-recovery-v1';
export function useLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const pendingBooks = useRef(new Map<string, Book>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queues = useRef(new Map<string, Promise<void>>());
  const mounted = useRef(true);
  const flush = useCallback(async (bookId: string) => {
    const timer = timers.current.get(bookId);
    if (timer) clearTimeout(timer);
    const book = pendingBooks.current.get(bookId);
    if (!book) return;
    const promise = (queues.current.get(bookId) || Promise.resolve())
      .catch(() => {})
      .then(() => storeBook(book));
    queues.current.set(bookId, promise);
    try {
      await promise;
      if (pendingBooks.current.get(bookId) === book)
        pendingBooks.current.delete(bookId);
      if (mounted.current) {
        setPending(pendingBooks.current.size);
        setError('');
      }
      if (!pendingBooks.current.size) {
        try {
          localStorage.removeItem(recoveryKey);
        } catch {
          /* The database remains the primary store. */
        }
      }
    } catch {
      if (mounted.current)
        setError(
          'Your latest changes could not be saved. Export a backup before closing, then retry.',
        );
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let releaseLock: (() => void) | undefined;
    let disposed = false;
    const start = async () => {
      try {
        let loaded = await database.books.toArray();
        try {
          const recovery = JSON.parse(
            localStorage.getItem(recoveryKey) || '[]',
          ) as unknown;
          if (Array.isArray(recovery))
            for (const item of recovery) {
              const parsed = bookSchema.safeParse(item);
              if (parsed.success) {
                const old = loaded.find((b) => b.id === parsed.data.id);
                if (!old || old.updatedAt < parsed.data.updatedAt) {
                  await storeBook(parsed.data);
                  loaded = [
                    ...loaded.filter((b) => b.id !== parsed.data.id),
                    parsed.data,
                  ];
                }
              }
            }
        } catch {
          /* A broken recovery entry must not hide the stored library. */
        }
        loaded = loaded.map(normaliseBook);
        if (!loaded.length) {
          await database.transaction('rw', database.books, async () => {
            if ((await database.books.count()) === 0)
              await database.books.add(newBook());
          });
          loaded = (await database.books.toArray()).map(normaliseBook);
        }
        if (!disposed) {
          setBooks(loaded.sort((a, b) => b.updatedAt - a.updatedAt));
          setReady(true);
        }
      } catch {
        if (!disposed) {
          setError(
            'Browser storage is unavailable. Allow storage for this site and reload to open your writing.',
          );
          setReady(true);
        }
      }
    };
    if (navigator.locks) {
      void navigator.locks.request(
        'writing-studio-editing',
        { ifAvailable: true },
        async (lock) => {
          if (disposed) return;
          if (!lock) {
            setReadOnly(true);
            await start();
            void navigator.locks.request('writing-studio-editing', async () => {
              if (disposed) return;
              setReadOnly(false);
              await start();
              await new Promise<void>((resolve) => {
                releaseLock = resolve;
                if (disposed) resolve();
              });
            });
            return;
          }
          setReadOnly(false);
          await start();
          await new Promise<void>((resolve) => {
            releaseLock = resolve;
            if (disposed) resolve();
          });
        },
      );
    } else void start();
    const protect = (event: BeforeUnloadEvent) => {
      if (pendingBooks.current.size) {
        try {
          localStorage.setItem(
            recoveryKey,
            JSON.stringify([...pendingBooks.current.values()]),
          );
        } catch {
          /* Browser unload confirmation protects the unsaved state. */
        }
        event.preventDefault();
      }
    };
    const hide = () => {
      for (const key of pendingBooks.current.keys()) void flush(key);
    };
    window.addEventListener('beforeunload', protect);
    document.addEventListener('visibilitychange', hide);
    return () => {
      disposed = true;
      mounted.current = false;
      releaseLock?.();
      window.removeEventListener('beforeunload', protect);
      document.removeEventListener('visibilitychange', hide);
      for (const key of pendingBooks.current.keys()) void flush(key);
    };
  }, [flush]);
  const update = useCallback(
    (book: Book) => {
      if (readOnly) return;
      const next = {
        ...book,
        updatedAt: Math.max(Date.now(), book.updatedAt + 1),
      };
      setBooks((all) =>
        all.some((b) => b.id === next.id)
          ? all.map((b) => (b.id === next.id ? next : b))
          : [...all, next],
      );
      pendingBooks.current.set(next.id, next);
      setPending(pendingBooks.current.size);
      const timer = timers.current.get(next.id);
      if (timer) clearTimeout(timer);
      timers.current.set(
        next.id,
        setTimeout(() => void flush(next.id), 450),
      );
    },
    [flush, readOnly],
  );
  const retry = () => {
    for (const key of pendingBooks.current.keys()) void flush(key);
  };
  const backupAll = () =>
    JSON.stringify(
      {
        format: 'writing-studio-library',
        version: 1,
        books: books.map(backup),
      },
      null,
      2,
    );
  return { books, ready, error, pending, readOnly, update, retry, backupAll };
}
