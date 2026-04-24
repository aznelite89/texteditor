import { useEffect, useRef, type RefObject } from 'react';

export type WithSavedSelection = (fn: () => void) => void;

export function useSavedSelection(
  editorRef: RefObject<HTMLElement | null>,
): WithSavedSelection {
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    const capture = () => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const el = editorRef.current;
      if (el && el.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [editorRef]);

  return (fn) => {
    const el = editorRef.current;
    const range = savedRange.current;
    if (el && range) {
      el.focus();
      const sel = document.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    fn();
  };
}
