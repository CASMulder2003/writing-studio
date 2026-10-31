// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EntryMenu } from './EntryMenu';
import { NotebookIndex } from './NotebookIndex';
import { newBook, newChapter, type Note } from '../domain/book';
afterEach(cleanup);
describe('workspace menus and notebook navigation', () => {
  it('opens the clicked entry at the pointer without opening or deleting it, and preserves text-field context menus', () => {
    const remove = vi.fn();
    render(
      <article className="test-entry">
        <button>Chapter title</button>
        <textarea aria-label="Summary" />
        <EntryMenu
          label="Chapter"
          contextSelector=".test-entry"
          onDelete={remove}
        />
      </article>,
    );
    const title = screen.getByRole('button', { name: 'Chapter title' });
    expect(fireEvent.contextMenu(title, { clientX: 120, clientY: 180 })).toBe(
      false,
    );
    const menu = screen.getByRole('menu');
    expect(menu.style.left).toBe('120px');
    expect(menu.style.top).toBe('180px');
    expect(remove).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(title);
    expect(
      fireEvent.contextMenu(screen.getByRole('textbox', { name: 'Summary' })),
    ).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.contextMenu(title);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledOnce();
  });
  it('opens alternative add actions with Shift+F10 without triggering the parent button', () => {
    const addChapter = vi.fn(),
      addPrologue = vi.fn();
    render(
      <button className="test-add" onClick={addChapter}>
        Add section
        <EntryMenu
          label="Add section"
          contextOnly
          contextSelector=".test-add"
          actions={[{ label: 'Add prologue', onSelect: addPrologue }]}
        />
      </button>,
    );
    const add = screen.getByRole('button', { name: 'Add section' });
    fireEvent.keyDown(add, { key: 'F10', shiftKey: true });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add prologue' }));
    expect(addPrologue).toHaveBeenCalledOnce();
    expect(addChapter).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(add);
    fireEvent.click(add);
    expect(addChapter).toHaveBeenCalledOnce();
  });
  it('opens by keyboard, restores focus on Escape and only deletes after choosing the menu item', () => {
    const remove = vi.fn();
    render(<EntryMenu label="Mara" onDelete={remove} onUp={() => {}} />);
    const trigger = screen.getByRole('button', { name: 'Mara options' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Move up' }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Delete' }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledOnce();
  });
  it('can close a menu whose only action is disabled', () => {
    render(
      <EntryMenu label="Only chapter" onDelete={() => {}} deleteDisabled />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Only chapter options',
    });
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole('menu'));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });
  it('finds notes by their contents and offers explicit keyboard reordering', () => {
    const book = newBook();
    const note = (
      id: string,
      body: string,
      chapterId: string | null,
      status: Note['status'],
    ): Note => ({
      id,
      title: id,
      body,
      chapterId,
      status,
      images: [],
      updatedAt: 1,
    });
    book.notes = [
      note('Clue', 'A blue envelope', null, 'Idea'),
      note('Question', 'Who sent the envelope?', null, 'Planned'),
      note('Ending', 'The door closes.', book.chapters[0].id, 'Idea'),
    ];
    book.chapters.push(newChapter('Empty chapter'));
    const onMove = vi.fn(),
      onOpen = vi.fn();
    render(
      <NotebookIndex
        book={book}
        activeId="Clue"
        resetKey={0}
        readOnly={false}
        onOpen={onOpen}
        onDelete={() => {}}
        onMove={onMove}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
      target: { value: 'envelope' },
    });
    expect(
      screen.queryByRole('button', { name: 'Open note: Ending' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open note: Question' }),
    );
    expect(onOpen).toHaveBeenCalledWith(book.notes[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear note search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Question options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move up' }));
    expect(onMove).toHaveBeenCalledWith('Question', null, 'Clue');
    const data: Record<string, string> = {};
    const transfer = {
      types: ['application/x-writing-studio-note'],
      setData: (type: string, value: string) => {
        data[type] = value;
      },
      getData: (type: string) => data[type],
    };
    fireEvent.dragStart(
      screen.getByRole('button', { name: 'Open note: Clue' }),
      { dataTransfer: transfer },
    );
    // Dragging must not insert empty groups and shift the destination beneath the pointer.
    expect(
      screen.queryByRole('button', { name: /2\. Empty chapter/ }),
    ).toBeNull();
    const target = screen.getByRole('button', { name: /1\. Chapter one/ });
    expect(fireEvent.dragOver(target, { dataTransfer: transfer })).toBe(false);
    fireEvent.drop(target, {
      dataTransfer: transfer,
    });
    expect(onMove).toHaveBeenLastCalledWith(
      'Clue',
      book.chapters[0].id,
      undefined,
    );
  });
});
