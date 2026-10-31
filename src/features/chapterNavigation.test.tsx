// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newBook, newChapter } from '../domain/book';
import { ChapterTabs } from './ChapterTabs';
import { useChapterTabs } from './useChapterTabs';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('chapter navigation without changing the manuscript', () => {
  it('keeps separate tabs for each project and restores them after reloading', () => {
    const first = newBook('First');
    const second = newBook('Second');
    first.chapters.push(newChapter('Next'));
    const { result, rerender, unmount } = renderHook(
      ({ book }) => useChapterTabs(book),
      { initialProps: { book: first } },
    );
    act(() => {
      result.current.open(first.id, first.chapters[0].id);
      result.current.open(first.id, first.chapters[0].id);
      result.current.open(first.id, first.chapters[1].id);
    });
    expect(result.current.ids).toEqual(first.chapters.map((c) => c.id));
    rerender({ book: second });
    expect(result.current.ids).toEqual([]);
    act(() => result.current.open(second.id, second.chapters[0].id));
    rerender({ book: first });
    expect(result.current.ids).toHaveLength(2);
    unmount();
    const restored = renderHook(() => useChapterTabs(first));
    expect(restored.result.current.ids).toEqual(
      first.chapters.map((c) => c.id),
    );
  });

  it('closing a tab picks a neighbour and preserves every chapter and its contents', () => {
    const book = newBook('Draft');
    book.chapters.push(newChapter('Second'), newChapter('Third'));
    const original = JSON.stringify(book);
    const { result } = renderHook(() => useChapterTabs(book));
    act(() => book.chapters.forEach((c) => result.current.open(book.id, c.id)));
    let next: string | undefined;
    act(() => {
      next = result.current.close(book.chapters[1].id);
    });
    expect(next).toBe(book.chapters[0].id);
    expect(result.current.ids).toEqual([
      book.chapters[0].id,
      book.chapters[2].id,
    ]);
    expect(JSON.stringify(book)).toBe(original);
    act(() => {
      result.current.close(book.chapters[0].id);
    });
    act(() => {
      next = result.current.close(book.chapters[2].id);
    });
    expect(next).toBeUndefined();
    expect(result.current.ids).toEqual([]);
    expect(book.chapters).toHaveLength(3);
  });

  it('ignores unavailable chapters and damaged navigation preferences', () => {
    const book = newBook('Draft');
    localStorage.setItem(
      'writing-studio-chapter-tabs',
      JSON.stringify({
        [book.id]: ['removed', book.chapters[0].id],
        other: 123,
      }),
    );
    const { result, unmount } = renderHook(() => useChapterTabs(book));
    expect(result.current.ids).toEqual([book.chapters[0].id]);
    unmount();
    localStorage.setItem('writing-studio-chapter-tabs', '{invalid');
    const fallback = renderHook(() => useChapterTabs(book));
    expect(fallback.result.current.ids).toEqual([]);
  });

  it('reorders and clears a project’s working tabs without changing its book order or another project', () => {
    const book = newBook('Draft'),
      other = newBook('Other');
    book.chapters.push(newChapter('Second'), newChapter('Third'));
    const original = JSON.stringify(book);
    const { result, rerender } = renderHook(
      ({ book }) => useChapterTabs(book),
      { initialProps: { book } },
    );
    act(() => {
      book.chapters.forEach((c) => result.current.open(book.id, c.id));
      result.current.open(other.id, other.chapters[0].id);
    });
    act(() => result.current.move(book.chapters[2].id, book.chapters[0].id));
    expect(result.current.ids).toEqual([
      book.chapters[2].id,
      book.chapters[0].id,
      book.chapters[1].id,
    ]);
    expect(
      JSON.parse(localStorage.getItem('writing-studio-chapter-tabs')!)[book.id],
    ).toEqual(result.current.ids);
    act(() => result.current.keepOnly(book.chapters[1].id));
    expect(result.current.ids).toEqual([book.chapters[1].id]);
    act(() => result.current.closeAll());
    expect(result.current.ids).toEqual([]);
    rerender({ book: other });
    expect(result.current.ids).toEqual([other.chapters[0].id]);
    expect(JSON.stringify(book)).toBe(original);
  });

  it('supports keyboard switching and a close button that does not reopen the chapter', () => {
    const chapter = newChapter('Prologue', 'prologue');
    const second = newChapter('Arrival');
    const onOpen = vi.fn(),
      onClose = vi.fn(),
      onCloseOthers = vi.fn(),
      onCloseAll = vi.fn(),
      onMove = vi.fn();
    render(
      <ChapterTabs
        chapters={[
          { chapter, number: null },
          { chapter: second, number: 1 },
        ]}
        activeId={chapter.id}
        onOpen={onOpen}
        onClose={onClose}
        onCloseOthers={onCloseOthers}
        onCloseAll={onCloseAll}
        onMove={onMove}
      />,
    );
    const tab = screen.getByRole('tab', { name: 'Prologue' });
    fireEvent.keyDown(tab, { key: 'ArrowLeft' });
    expect(onOpen).toHaveBeenCalledWith(second);
    expect(document.activeElement).toBe(
      screen.getByRole('tab', { name: '1. Arrival' }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(onOpen).toHaveBeenCalledWith(chapter);
    expect(document.activeElement).toBe(tab);
    onOpen.mockClear();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close chapter tab: Prologue' }),
    );
    expect(onClose).toHaveBeenCalledWith(chapter.id);
    expect(onOpen).not.toHaveBeenCalled();
    const dragData: Record<string, string> = {};
    const transfer = {
      types: ['application/x-writing-studio-tab'],
      setData: (key: string, value: string) => {
        dragData[key] = value;
      },
      getData: (key: string) => dragData[key],
    };
    fireEvent.dragStart(tab, { dataTransfer: transfer });
    const destination = screen.getByRole('tab', { name: '1. Arrival' });
    expect(fireEvent.dragOver(destination, { dataTransfer: transfer })).toBe(
      false,
    );
    fireEvent.drop(destination, { dataTransfer: transfer });
    expect(onMove).toHaveBeenCalledWith(chapter.id, second.id);
    onMove.mockClear();
    const closeTarget = screen.getByRole('button', {
      name: 'Close chapter tab: Arrival',
    });
    fireEvent.dragOver(closeTarget, { dataTransfer: transfer });
    fireEvent.drop(closeTarget, { dataTransfer: transfer });
    expect(onMove).toHaveBeenCalledExactlyOnceWith(chapter.id, second.id);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.contextMenu(screen.getByRole('tab', { name: '1. Arrival' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Close other tabs' }));
    expect(onCloseOthers).toHaveBeenCalledWith(second.id);
    fireEvent.contextMenu(tab);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move tab right' }));
    expect(onMove).toHaveBeenCalledWith(chapter.id, second.id);
    fireEvent.contextMenu(tab);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Close all tabs' }));
    expect(onCloseAll).toHaveBeenCalledOnce();
    fireEvent(tab, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(onClose).toHaveBeenLastCalledWith(chapter.id);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
