import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { COMMENT_HIGHLIGHT_COLOR, type Comment } from '../constants/comments';
import { nodeAtOffset } from '../utils/caretOffset';

type Rect = { top: number; left: number; width: number; height: number };
type Highlight = { commentId: string; resolved: boolean; rects: Rect[] };

type CommentHighlightsProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  comments: Comment[];
  content: string;
};

function isZeroRect(r: DOMRect): boolean {
  return r.top === 0 && r.left === 0 && r.width === 0 && r.height === 0;
}

export function CommentHighlights({ editorRef, comments, content }: CommentHighlightsProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      setHighlights([]);
      return;
    }

    const compute = () => {
      const editorRect = editor.getBoundingClientRect();
      const next: Highlight[] = [];
      for (const comment of comments) {
        const startNode = nodeAtOffset(editor, comment.start);
        const endNode = nodeAtOffset(editor, comment.end);
        if (!startNode || !endNode) continue;
        const range = document.createRange();
        try {
          range.setStart(startNode.node, startNode.offset);
          range.setEnd(endNode.node, endNode.offset);
        } catch {
          continue;
        }
        const list = range.getClientRects();
        const rects: Rect[] = [];
        for (let i = 0; i < list.length; i++) {
          const r = list[i];
          if (isZeroRect(r)) continue;
          rects.push({
            top: r.top - editorRect.top,
            left: r.left - editorRect.left,
            width: r.width,
            height: r.height,
          });
        }
        if (rects.length === 0) continue;
        next.push({ commentId: comment.id, resolved: comment.resolved, rects });
      }
      setHighlights(next);
    };

    compute();
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [editorRef, comments, content]);

  return (
    <div className="comment-highlights" aria-hidden>
      {highlights.map((h) =>
        h.rects.map((rect, i) => {
          const color = h.resolved
            ? COMMENT_HIGHLIGHT_COLOR.RESOLVED
            : COMMENT_HIGHLIGHT_COLOR.ACTIVE;
          const style: CSSProperties = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            background: color,
          };
          return (
            <div
              key={`${h.commentId}-${i}`}
              className={`comment-highlight comment-highlight--${h.resolved ? 'resolved' : 'active'}`}
              data-testid={`comment-highlight-${h.commentId}`}
              data-resolved={h.resolved ? 'true' : 'false'}
              style={style}
            />
          );
        }),
      )}
    </div>
  );
}
