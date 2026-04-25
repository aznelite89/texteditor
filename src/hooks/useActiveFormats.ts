import { useEffect, useState, type RefObject } from 'react';
import { APP_EVENT } from '../constants/events';
import { FORMAT_COMMAND } from '../constants/formatCommands';

export type ActiveFormats = {
  [FORMAT_COMMAND.BOLD]: boolean;
  [FORMAT_COMMAND.ITALIC]: boolean;
  [FORMAT_COMMAND.INSERT_UNORDERED_LIST]: boolean;
  [FORMAT_COMMAND.INSERT_ORDERED_LIST]: boolean;
};

const EMPTY: ActiveFormats = {
  [FORMAT_COMMAND.BOLD]: false,
  [FORMAT_COMMAND.ITALIC]: false,
  [FORMAT_COMMAND.INSERT_UNORDERED_LIST]: false,
  [FORMAT_COMMAND.INSERT_ORDERED_LIST]: false,
};

function isSelectionInside(el: HTMLElement): boolean {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const anchor = sel.anchorNode;
  return anchor !== null && el.contains(anchor);
}

function sameState(a: ActiveFormats, b: ActiveFormats): boolean {
  return (
    a[FORMAT_COMMAND.BOLD] === b[FORMAT_COMMAND.BOLD] &&
    a[FORMAT_COMMAND.ITALIC] === b[FORMAT_COMMAND.ITALIC] &&
    a[FORMAT_COMMAND.INSERT_UNORDERED_LIST] === b[FORMAT_COMMAND.INSERT_UNORDERED_LIST] &&
    a[FORMAT_COMMAND.INSERT_ORDERED_LIST] === b[FORMAT_COMMAND.INSERT_ORDERED_LIST]
  );
}

export function useActiveFormats(
  editorRef: RefObject<HTMLElement | null>,
): ActiveFormats {
  const [state, setState] = useState<ActiveFormats>(EMPTY);

  useEffect(() => {
    const read = () => {
      const el = editorRef.current;
      if (!el || !isSelectionInside(el)) {
        setState((prev) => (sameState(prev, EMPTY) ? prev : EMPTY));
        return;
      }
      const next: ActiveFormats = {
        [FORMAT_COMMAND.BOLD]: document.queryCommandState(FORMAT_COMMAND.BOLD),
        [FORMAT_COMMAND.ITALIC]: document.queryCommandState(FORMAT_COMMAND.ITALIC),
        [FORMAT_COMMAND.INSERT_UNORDERED_LIST]: document.queryCommandState(
          FORMAT_COMMAND.INSERT_UNORDERED_LIST,
        ),
        [FORMAT_COMMAND.INSERT_ORDERED_LIST]: document.queryCommandState(
          FORMAT_COMMAND.INSERT_ORDERED_LIST,
        ),
      };
      setState((prev) => (sameState(prev, next) ? prev : next));
    };

    document.addEventListener('selectionchange', read);
    document.addEventListener(APP_EVENT.FORMAT_CHANGE, read);
    return () => {
      document.removeEventListener('selectionchange', read);
      document.removeEventListener(APP_EVENT.FORMAT_CHANGE, read);
    };
  }, [editorRef]);

  return state;
}
