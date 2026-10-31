import { useLayoutEffect, useRef, useState } from 'react';

export function EditablePageTitle({
  value,
  displayTitle,
  readOnly = false,
  overlay = false,
  onSave,
}: {
  value: string;
  displayTitle: string;
  readOnly?: boolean;
  overlay?: boolean;
  onSave: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);
  useLayoutEffect(() => {
    if (editing) {
      input.current?.focus({ preventScroll: true });
      input.current?.select();
    }
  }, [editing]);
  useLayoutEffect(() => {
    if (!input.current) return;
    input.current.style.height = '0px';
    input.current.style.height = `${input.current.scrollHeight}px`;
  }, [draft, editing]);
  const finish = (save: boolean, restoreFocus: boolean) => {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const title = draft.replace(/\s+/g, ' ').trim();
    if (save && !readOnly && title !== value) onSave(title);
    if (restoreFocus)
      requestAnimationFrame(() =>
        trigger.current?.focus({ preventScroll: true }),
      );
  };
  if (readOnly) return overlay ? null : <span>{displayTitle}</span>;
  return (
    <div
      className={`editable-page-title ${overlay ? 'over-printed-title' : ''}`}
    >
      <button
        ref={trigger}
        type="button"
        hidden={editing}
        aria-label={`Edit chapter title: ${displayTitle}`}
        title="Edit chapter title"
        onClick={() => {
          setDraft(value);
          finished.current = false;
          setEditing(true);
        }}
      >
        <span>{displayTitle}</span>
      </button>
      {editing && (
        <textarea
          ref={input}
          rows={1}
          aria-label="Chapter title on page"
          title="Enter to save · Escape to cancel"
          data-local-escape="true"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => finish(true, false)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter' || event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              finish(event.key === 'Enter', true);
            }
          }}
        />
      )}
    </div>
  );
}
