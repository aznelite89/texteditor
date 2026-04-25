import { forwardRef, useEffect, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { UI_LABEL } from '../constants/ui';
import { textOffsetFromSelection } from '../utils/caretOffset';

type EditorProps = {
  content: string;
  onChange: (next: string) => void;
  onCaretChange?: (offset: number) => void;
};

export const Editor = forwardRef<HTMLDivElement, EditorProps>(function Editor(
  { content, onChange, onCaretChange },
  forwardedRef,
) {
  const internalRef = useRef<HTMLDivElement | null>(null);

  const setRef = (node: HTMLDivElement | null) => {
    internalRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    if (el.innerHTML !== content) {
      el.innerHTML = content;
    }
  }, [content]);

  useEffect(() => {
    if (!onCaretChange) return;
    const handler = () => {
      const el = internalRef.current;
      if (!el) return;
      const offset = textOffsetFromSelection(el);
      if (offset !== null) onCaretChange(offset);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [onCaretChange]);

  // Belt-and-suspenders: some click/focus paths in real browsers don't fire a
  // fresh selectionchange event (e.g., a click that doesn't move the caret, or
  // focus restoring a prior range). Re-broadcast on these events so peers see
  // the cursor as soon as the local user interacts.
  const emitCaret = () => {
    const el = internalRef.current;
    if (!el || !onCaretChange) return;
    // Defer one tick so the selection reflects the post-event state.
    queueMicrotask(() => {
      const offset = textOffsetFromSelection(el);
      if (offset !== null) onCaretChange(offset);
    });
  };

  const handleMouseUp = (_e: MouseEvent<HTMLDivElement>) => emitCaret();
  const handleKeyUp = (_e: KeyboardEvent<HTMLDivElement>) => emitCaret();
  const handleFocus = (_e: FocusEvent<HTMLDivElement>) => emitCaret();

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
      onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
      onMouseUp={handleMouseUp}
      onKeyUp={handleKeyUp}
      onFocus={handleFocus}
    />
  );
});
