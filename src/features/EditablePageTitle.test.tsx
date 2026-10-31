// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { EditablePageTitle } from './EditablePageTitle';

afterEach(cleanup);

describe('editing a title on the book page', () => {
  it('keeps typing local, saves once on Enter, and returns keyboard focus', async () => {
    const save = vi.fn();
    render(
      <EditablePageTitle
        value="Arrival"
        displayTitle="Arrival"
        onSave={save}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Edit chapter title: Arrival',
    });
    fireEvent.click(trigger);
    const input = screen.getByRole('textbox', {
      name: 'Chapter title on page',
    });
    fireEvent.change(input, { target: { value: 'The letter' } });
    expect(save).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(save).toHaveBeenCalledExactlyOnceWith('The letter');
    expect(screen.queryByRole('textbox')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('cancels with Escape without saving or passing Escape to navigation, and saves on blur', () => {
    const save = vi.fn(),
      outerEscape = vi.fn();
    render(
      <div onKeyDown={outerEscape}>
        <EditablePageTitle
          value="Arrival"
          displayTitle="Arrival"
          onSave={save}
        />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    let input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Discard me' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(save).not.toHaveBeenCalled();
    expect(outerEscape).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    input = screen.getByRole('textbox');
    expect((input as HTMLTextAreaElement).value).toBe('Arrival');
    fireEvent.change(input, { target: { value: '  The letter\narrives  ' } });
    fireEvent.blur(input);
    expect(save).toHaveBeenCalledExactlyOnceWith('The letter arrives');
  });

  it('disables editing when the project is read-only', () => {
    render(
      <EditablePageTitle
        value="Arrival"
        displayTitle="Arrival"
        readOnly
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Arrival')).toBeTruthy();
  });
});
