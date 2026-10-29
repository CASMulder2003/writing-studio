import { useEffect, useState } from 'react';
import type { Book } from '../domain/book';

type OpenChapters = Record<string, string[]>;
const key = 'writing-studio-chapter-tabs';
export function useChapterTabs(book: Book | undefined) {
  const [byProject, setByProject] = useState<OpenChapters>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
      return Object.fromEntries(
        Object.entries(value).filter(
          ([, ids]) =>
            Array.isArray(ids) && ids.every((id) => typeof id === 'string'),
        ),
      );
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(byProject));
    } catch {
      /* Navigation preferences are optional. */
    }
  }, [byProject]);
  const ids = book
    ? (byProject[book.id] || []).filter((id) =>
        book.chapters.some((c) => c.id === id),
      )
    : [];
  return {
    ids,
    open(projectId: string, chapterId: string) {
      setByProject((current) => {
        const ids = current[projectId] || [];
        return ids.includes(chapterId)
          ? current
          : { ...current, [projectId]: [...ids, chapterId] };
      });
    },
    close(chapterId: string) {
      if (!book) return undefined;
      const index = ids.indexOf(chapterId);
      const remaining = ids.filter((id) => id !== chapterId);
      setByProject((current) => ({ ...current, [book.id]: remaining }));
      return remaining[Math.max(0, index - 1)];
    },
  };
}
