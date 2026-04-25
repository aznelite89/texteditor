import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REVIEW_STATUS, type Review } from '../constants/review';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useReviews } from './useReviews';
import type { LocalUser } from './useLocalUser';

const LOCAL: LocalUser = { id: 'me', name: 'Mia', color: '#111' };

function clearReviewsStorage() {
  window.localStorage.removeItem(STORAGE_KEYS.REVIEWS);
}

describe('useReviews — Requirement 8: review highlights state', () => {
  beforeEach(() => clearReviewsStorage());
  afterEach(() => clearReviewsStorage());

  it('starts empty when nothing is stored', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    expect(result.current.reviews).toEqual([]);
    expect(result.current.completedReviews).toEqual([]);
  });

  it('markForReview creates a DRAFT review with the local user as reviewer', () => {
    const { result } = renderHook(() => useReviews(LOCAL));

    let created: Review | null = null;
    act(() => {
      created = result.current.markForReview(0, 5);
    });

    expect(created).not.toBeNull();
    expect(created!.status).toBe(REVIEW_STATUS.DRAFT);
    expect(created!.reviewerId).toBe(LOCAL.id);
    expect(created!.reviewerName).toBe(LOCAL.name);
    expect(created!.start).toBe(0);
    expect(created!.end).toBe(5);
    expect(result.current.reviews).toHaveLength(1);
  });

  it('markForReview normalizes start/end so end is always >= start', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    let created: Review | null = null;
    act(() => {
      created = result.current.markForReview(8, 3);
    });
    expect(created!.start).toBe(3);
    expect(created!.end).toBe(8);
  });

  it('markForReview returns null and stores nothing when start === end (collapsed)', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    let created: Review | null = null;
    act(() => {
      created = result.current.markForReview(5, 5);
    });
    expect(created).toBeNull();
    expect(result.current.reviews).toHaveLength(0);
  });

  it('completeReview flips status to COMPLETED and sets completedAt', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    let created: Review | null = null;
    act(() => {
      created = result.current.markForReview(0, 3);
    });

    act(() => {
      result.current.completeReview(created!.id);
    });

    const updated = result.current.reviews.find((r) => r.id === created!.id);
    expect(updated?.status).toBe(REVIEW_STATUS.COMPLETED);
    expect(typeof updated?.completedAt).toBe('number');
    expect(result.current.completedReviews).toHaveLength(1);
  });

  it('deleteReview removes the entry by id', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    let a: Review | null = null;
    let b: Review | null = null;
    act(() => {
      a = result.current.markForReview(0, 2);
    });
    act(() => {
      b = result.current.markForReview(3, 5);
    });

    act(() => {
      result.current.deleteReview(a!.id);
    });

    expect(result.current.reviews.map((r) => r.id)).toEqual([b!.id]);
  });

  it('deleteReview is a no-op for unknown ids', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    act(() => {
      result.current.markForReview(0, 2);
    });
    act(() => {
      result.current.deleteReview('does-not-exist');
    });
    expect(result.current.reviews).toHaveLength(1);
  });

  it('applyRemoteCompleted replaces COMPLETED reviews while preserving local DRAFTs', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    let draft: Review | null = null;
    act(() => {
      draft = result.current.markForReview(0, 4);
    });

    const remoteCompleted: Review[] = [
      {
        id: 'remote-1',
        start: 10,
        end: 15,
        status: REVIEW_STATUS.COMPLETED,
        reviewerId: 'peer',
        reviewerName: 'Peer',
        createdAt: 1,
        completedAt: 2,
      },
    ];

    act(() => {
      result.current.applyRemoteCompleted(remoteCompleted);
    });

    const drafts = result.current.reviews.filter((r) => r.status === REVIEW_STATUS.DRAFT);
    const completed = result.current.reviews.filter((r) => r.status === REVIEW_STATUS.COMPLETED);
    expect(drafts.map((r) => r.id)).toEqual([draft!.id]);
    expect(completed.map((r) => r.id)).toEqual(['remote-1']);
  });

  it('applyRemoteCompleted overwrites previously-known completed reviews', () => {
    const seeded: Review[] = [
      {
        id: 'old-completed',
        start: 0,
        end: 2,
        status: REVIEW_STATUS.COMPLETED,
        reviewerId: 'peer-1',
        reviewerName: 'P1',
        createdAt: 1,
        completedAt: 2,
      },
    ];
    window.localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(seeded));

    const { result } = renderHook(() => useReviews(LOCAL));
    expect(result.current.completedReviews.map((r) => r.id)).toEqual(['old-completed']);

    act(() => {
      result.current.applyRemoteCompleted([
        {
          id: 'new-completed',
          start: 5,
          end: 9,
          status: REVIEW_STATUS.COMPLETED,
          reviewerId: 'peer-2',
          reviewerName: 'P2',
          createdAt: 3,
          completedAt: 4,
        },
      ]);
    });

    expect(result.current.completedReviews.map((r) => r.id)).toEqual(['new-completed']);
  });

  it('persists reviews to STORAGE_KEYS.REVIEWS', () => {
    const { result } = renderHook(() => useReviews(LOCAL));
    act(() => {
      result.current.markForReview(0, 4);
    });
    const raw = window.localStorage.getItem(STORAGE_KEYS.REVIEWS);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Review[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].status).toBe(REVIEW_STATUS.DRAFT);
  });

  it('hydrates reviews from storage on mount', () => {
    const seeded: Review[] = [
      {
        id: 'h1',
        start: 1,
        end: 4,
        status: REVIEW_STATUS.DRAFT,
        reviewerId: 'someone',
        reviewerName: 'Some',
        createdAt: 1,
      },
    ];
    window.localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(seeded));
    const { result } = renderHook(() => useReviews(LOCAL));
    expect(result.current.reviews).toEqual(seeded);
  });
});
