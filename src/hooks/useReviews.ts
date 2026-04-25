import { useCallback, useMemo } from 'react';
import { REVIEW_STATUS, type Review } from '../constants/review';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useLocalStorage } from './useLocalStorage';
import type { LocalUser } from './useLocalUser';

function makeReviewId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type UseReviewsResult = {
  reviews: Review[];
  markForReview: (start: number, end: number) => Review | null;
  completeReview: (id: string) => void;
  deleteReview: (id: string) => void;
  applyRemoteCompleted: (incoming: Review[]) => void;
  completedReviews: Review[];
};

export function useReviews(localUser: LocalUser): UseReviewsResult {
  const [reviews, setReviews] = useLocalStorage<Review[]>(STORAGE_KEYS.REVIEWS, []);

  const markForReview = useCallback(
    (start: number, end: number): Review | null => {
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      if (lo === hi) return null;
      const review: Review = {
        id: makeReviewId(),
        start: lo,
        end: hi,
        status: REVIEW_STATUS.DRAFT,
        reviewerId: localUser.id,
        reviewerName: localUser.name,
        createdAt: Date.now(),
      };
      setReviews((prev) => [...prev, review]);
      return review;
    },
    [localUser.id, localUser.name, setReviews],
  );

  const completeReview = useCallback(
    (id: string) => {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: REVIEW_STATUS.COMPLETED, completedAt: Date.now() }
            : r,
        ),
      );
    },
    [setReviews],
  );

  const deleteReview = useCallback(
    (id: string) => {
      setReviews((prev) => prev.filter((r) => r.id !== id));
    },
    [setReviews],
  );

  const applyRemoteCompleted = useCallback(
    (incoming: Review[]) => {
      setReviews((prev) => {
        const drafts = prev.filter((r) => r.status === REVIEW_STATUS.DRAFT);
        return [...drafts, ...incoming];
      });
    },
    [setReviews],
  );

  const completedReviews = useMemo(
    () => reviews.filter((r) => r.status === REVIEW_STATUS.COMPLETED),
    [reviews],
  );

  return useMemo(
    () => ({
      reviews,
      completedReviews,
      markForReview,
      completeReview,
      deleteReview,
      applyRemoteCompleted,
    }),
    [
      reviews,
      completedReviews,
      markForReview,
      completeReview,
      deleteReview,
      applyRemoteCompleted,
    ],
  );
}
