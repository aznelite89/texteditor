import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { REVIEW_COLOR, REVIEW_STATUS, type Review } from '../constants/review';
import { nodeAtOffset } from '../utils/caretOffset';

type Rect = { top: number; left: number; width: number; height: number };

type Highlight = {
  reviewId: string;
  status: Review['status'];
  rects: Rect[];
};

type ReviewHighlightsProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  reviews: Review[];
  content: string;
};

function isZeroRect(r: DOMRect): boolean {
  return r.top === 0 && r.left === 0 && r.width === 0 && r.height === 0;
}

export function ReviewHighlights({ editorRef, reviews, content }: ReviewHighlightsProps) {
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
      for (const review of reviews) {
        const startNode = nodeAtOffset(editor, review.start);
        const endNode = nodeAtOffset(editor, review.end);
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
        next.push({ reviewId: review.id, status: review.status, rects });
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
  }, [editorRef, reviews, content]);

  return (
    <div className="review-highlights" aria-hidden>
      {highlights.map((h) =>
        h.rects.map((rect, i) => {
          const color = h.status === REVIEW_STATUS.COMPLETED
            ? REVIEW_COLOR.COMPLETED
            : REVIEW_COLOR.DRAFT;
          const style: CSSProperties = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            background: color,
          };
          return (
            <div
              key={`${h.reviewId}-${i}`}
              className={`review-highlight review-highlight--${h.status}`}
              data-testid={`review-highlight-${h.reviewId}`}
              data-review-status={h.status}
              style={style}
            />
          );
        }),
      )}
    </div>
  );
}
