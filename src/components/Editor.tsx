import { forwardRef, useEffect, useRef } from 'react';
import { UI_LABEL } from '../constants/ui';

type EditorProps = {
  content: string;
  onChange: (next: string) => void;
};

export const Editor = forwardRef<HTMLDivElement, EditorProps>(function Editor(
  { content, onChange },
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
    />
  );
});
