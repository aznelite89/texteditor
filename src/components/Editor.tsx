import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { UI_LABEL } from '../constants/ui';
import { textOffsetFromSelection } from '../utils/caretOffset';
import { rafThrottle } from '../utils/rafThrottle';

type EditorProps = {
  content: string;
  onChange: (next: string) => void;
  onCaretChange?: (offset: number) => void;
};

const EditorImpl = forwardRef<HTMLDivElement, EditorProps>(function Editor(
  { content, onChange, onCaretChange },
  forwardedRef,
) {
  const internalRef = useRef<HTMLDivElement | null>(null);

  // Hold latest callbacks in refs so the document-level listener attaches
  // exactly once (not on every render when the parent passes new closures).
  const onCaretChangeRef = useRef(onCaretChange);
  onCaretChangeRef.current = onCaretChange;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    if (el.innerHTML !== content) {
      el.innerHTML = content;
    }
  }, [content]);

  // selectionchange fires on every cursor movement — coalesce to one rAF.
  useEffect(() => {
    const emit = rafThrottle(() => {
      const cb = onCaretChangeRef.current;
      const el = internalRef.current;
      if (!cb || !el) return;
      const offset = textOffsetFromSelection(el);
      if (offset !== null) cb(offset);
    });
    document.addEventListener('selectionchange', emit);
    return () => {
      document.removeEventListener('selectionchange', emit);
      emit.cancel();
    };
  }, []);

  const emitCaret = useCallback(() => {
    const cb = onCaretChangeRef.current;
    const el = internalRef.current;
    if (!cb || !el) return;
    queueMicrotask(() => {
      const offset = textOffsetFromSelection(el);
      if (offset !== null) cb(offset);
    });
  }, []);

  const handleMouseUp = useCallback((_e: MouseEvent<HTMLDivElement>) => emitCaret(), [emitCaret]);
  const handleKeyUp = useCallback((_e: KeyboardEvent<HTMLDivElement>) => emitCaret(), [emitCaret]);
  const handleFocus = useCallback((_e: FocusEvent<HTMLDivElement>) => emitCaret(), [emitCaret]);
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    onChangeRef.current((e.currentTarget as HTMLDivElement).innerHTML);
  }, []);

  return (
    <div
      ref={setRef}
      className="editor"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={UI_LABEL.APP_TITLE}
      data-placeholder={UI_LABEL.EDITOR_PLACEHOLDER}
      onInput={handleInput}
      onMouseUp={handleMouseUp}
      onKeyUp={handleKeyUp}
      onFocus={handleFocus}
    />
  );
});

export const Editor = memo(EditorImpl);
