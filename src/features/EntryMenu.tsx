import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export function EntryMenu({
  label,
  onDelete,
  disabled,
  deleteDisabled,
  onUp,
  onDown,
  triggerRef,
}: {
  label: string;
  onDelete: () => void;
  disabled?: boolean;
  deleteDisabled?: boolean;
  onUp?: () => void;
  onDown?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const close = (focus = true) => {
    setPosition(null);
    if (focus) trigger.current?.focus({ preventScroll: true });
  };
  const show = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    const height = 44 + (onUp ? 36 : 0) + (onDown ? 36 : 0);
    setPosition({
      left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)),
      top:
        rect.bottom + height + 8 > window.innerHeight
          ? Math.max(8, rect.top - height - 4)
          : rect.bottom + 4,
    });
  };
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
          </div>,
          document.body,
        )}
    </>
  );
}
