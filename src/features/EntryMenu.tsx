import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export type MenuAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export function EntryMenu({
  label,
  onDelete,
  disabled,
  deleteDisabled,
  onUp,
  onDown,
  triggerRef,
  contextSelector,
  contextOnly = false,
  actions = [],
}: {
  label: string;
  onDelete?: () => void;
  disabled?: boolean;
  deleteDisabled?: boolean;
  onUp?: () => void;
  onDown?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
  contextSelector?: string;
  contextOnly?: boolean;
  actions?: MenuAction[];
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const contextAnchor = useRef<HTMLSpanElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const current = useRef({ disabled, count: 0 });
  current.current = {
    disabled,
    count:
      actions.length +
      Number(Boolean(onDelete)) +
      Number(Boolean(onUp)) +
      Number(Boolean(onDown)),
  };
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const close = (focus = true) => {
    setPosition(null);
    if (focus)
      (returnFocus.current || trigger.current)?.focus({ preventScroll: true });
  };
  const show = useCallback(
    (point?: { x: number; y: number; target: HTMLElement }) => {
      const rect = (point?.target || trigger.current)?.getBoundingClientRect();
      if (!rect || current.current.disabled) return;
      returnFocus.current = point?.target || trigger.current;
      const height = 10 + current.current.count * 36;
      const x = point ? point.x : rect.right - 180;
      const y = point ? point.y : rect.bottom + 4;
      setPosition({
        left: Math.max(8, Math.min(x, window.innerWidth - 188)),
        top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
      });
    },
    [],
  );
  useEffect(() => {
    if (!contextSelector || disabled) return;
    const target = (
      contextAnchor.current || trigger.current
    )?.closest<HTMLElement>(contextSelector);
    if (!target) return;
    const editable = (node: EventTarget | null) =>
      node instanceof Element &&
      Boolean(
        node.closest('input, textarea, select, [contenteditable="true"]'),
      );
    const focusTarget = (node: EventTarget | null) =>
      (node instanceof Element
        ? node.closest<HTMLElement>('button, [tabindex]')
        : null) ||
      trigger.current ||
      target;
    const context = (event: MouseEvent) => {
      if (editable(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      const source = focusTarget(event.target);
      const rect = source.getBoundingClientRect();
      show({
        x: event.clientX || rect.left,
        y: event.clientY || rect.bottom,
        target: source,
      });
    };
    const keyboard = (event: KeyboardEvent) => {
      if (
        editable(event.target) ||
        !(
          event.key === 'ContextMenu' ||
          (event.key === 'F10' && event.shiftKey)
        )
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const source = focusTarget(event.target);
      const rect = source.getBoundingClientRect();
      show({ x: rect.left, y: rect.bottom, target: source });
    };
    target.addEventListener('contextmenu', context);
    target.addEventListener('keydown', keyboard);
    return () => {
      target.removeEventListener('contextmenu', context);
      target.removeEventListener('keydown', keyboard);
    };
  }, [contextSelector, contextOnly, disabled, show]);
  useLayoutEffect(() => {
    if (position)
      (
        menu.current?.querySelector<HTMLButtonElement>(
          'button:not(:disabled)',
        ) || menu.current
      )?.focus();
  }, [position]);
  useEffect(() => {
    if (!position) return;
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setPosition(null);
    };
    const dismiss = () => setPosition(null);
    const blur = (event: FocusEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setPosition(null);
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', blur);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', blur);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [position]);
  return (
    <>
      {contextOnly ? (
        <span ref={contextAnchor} hidden />
      ) : (
        <button
          type="button"
          className="icon-button entry-menu-trigger"
          aria-label={label + ' options'}
          title={label + ' options'}
          aria-haspopup="menu"
          aria-expanded={Boolean(position)}
          aria-controls={position ? id : undefined}
          disabled={disabled}
          ref={(node) => {
            trigger.current = node;
            if (typeof triggerRef === 'function') triggerRef(node);
            else if (triggerRef) triggerRef.current = node;
          }}
          onClick={() => (position ? close() : show())}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              show();
            }
          }}
        >
          <Ellipsis size={17} />
        </button>
      )}
      {position &&
        createPortal(
          <div
            id={id}
            ref={menu}
            className="entry-menu"
            role="menu"
            tabIndex={-1}
            aria-label={label + ' actions'}
            data-entry-menu="true"
            style={position}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
              if (event.key === 'Tab') {
                close();
                return;
              }
              const items = Array.from(
                menu.current?.querySelectorAll<HTMLButtonElement>(
                  'button:not(:disabled)',
                ) || [],
              );
              const current = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === 'ArrowDown'
                  ? (current + 1) % items.length
                  : event.key === 'ArrowUp'
                    ? (current - 1 + items.length) % items.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? items.length - 1
                        : -1;
              if (next >= 0) {
                event.preventDefault();
                items[next]?.focus();
              }
            }}
          >
            {onUp && (
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  onUp();
                }}
              >
                <ArrowUp size={14} />
                Move up
              </button>
            )}
            {onDown && (
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  onDown();
                }}
              >
                <ArrowDown size={14} />
                Move down
              </button>
            )}
            {actions.map((action) => (
              <button
                key={action.label}
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  close();
                  action.onSelect();
                }}
              >
                {action.label}
              </button>
            ))}
            {onDelete && (
              <button
                role="menuitem"
                className="menu-delete"
                disabled={deleteDisabled}
                onClick={() => {
                  close();
                  onDelete();
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
