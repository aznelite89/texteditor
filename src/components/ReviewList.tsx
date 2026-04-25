import { memo, useCallback } from 'react';
import { REVIEW_STATUS, type Review } from '../constants/review';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';

type ReviewListProps = {
  reviews: Review[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
};

function snippet(html: string, start: number, end: number): string {
  // Strip tags and slice the plain text — best-effort preview.
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent ?? '';
  const slice = text.slice(start, end);
  if (slice.length === 0) return '(empty selection)';
  if (slice.length > 80) return `${slice.slice(0, 77)}…`;
  return slice;
}

type ReviewListProps2 = ReviewListProps & { content: string };

function ReviewListImpl({ reviews, content, onComplete, onDelete }: ReviewListProps2) {
  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm(UI_PROMPT.CONFIRM_DELETE_REVIEW)) {
        onDelete(id);
      }
    },
    [onDelete],
  );

  return (
    <aside className="reviews">
      <div className="reviews__header">
        <h2 className="reviews__heading">{UI_LABEL.REVIEWS_HEADING}</h2>
      </div>
      {reviews.length === 0 ? (
        <p className="reviews__empty">{UI_LABEL.EMPTY_REVIEWS}</p>
      ) : (
        <ul className="reviews__list">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`reviews__item reviews__item--${r.status}`}
              data-testid={`review-item-${r.id}`}
              data-review-status={r.status}
            >
              <div className="reviews__meta">
                <span className={`reviews__badge reviews__badge--${r.status}`}>
                  {r.status === REVIEW_STATUS.COMPLETED
                    ? UI_LABEL.REVIEW_COMPLETED_BADGE
                    : UI_LABEL.REVIEW_DRAFT_BADGE}
                </span>
                <span className="reviews__reviewer">{r.reviewerName}</span>
              </div>
              <div className="reviews__snippet">{snippet(content, r.start, r.end)}</div>
              <div className="reviews__actions">
                {r.status === REVIEW_STATUS.DRAFT && (
                  <button
                    type="button"
                    className="reviews__btn reviews__btn--complete"
                    onClick={() => onComplete(r.id)}
                  >
                    {UI_LABEL.COMPLETE_REVIEW}
                  </button>
                )}
                <button
                  type="button"
                  className="reviews__btn reviews__btn--delete"
                  onClick={() => handleDelete(r.id)}
                >
                  {UI_LABEL.DELETE_REVIEW}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export const ReviewList = memo(ReviewListImpl);
export default ReviewList;
