import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewList } from './ReviewList';
import { REVIEW_STATUS, type Review } from '../constants/review';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'r1',
    start: 0,
    end: 5,
    status: REVIEW_STATUS.DRAFT,
    reviewerId: 'me',
    reviewerName: 'Mia',
    createdAt: 1,
    ...overrides,
  };
}

function renderList(overrides: Partial<React.ComponentProps<typeof ReviewList>> = {}) {
  const props = {
    reviews: overrides.reviews ?? [],
    content: overrides.content ?? '<p>hello world</p>',
    onComplete: overrides.onComplete ?? vi.fn(),
    onDelete: overrides.onDelete ?? vi.fn(),
  };
  render(<ReviewList {...props} />);
  return props;
}

describe('ReviewList — Requirement 8: review list UI', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('renders the heading and an empty state when no reviews', () => {
    renderList();
    expect(screen.getByRole('heading', { name: UI_LABEL.REVIEWS_HEADING })).toBeInTheDocument();
    expect(screen.getByText(UI_LABEL.EMPTY_REVIEWS)).toBeInTheDocument();
  });

  it('renders an item per review with reviewer name and a snippet of selected text', () => {
    renderList({
      content: '<p>the quick brown fox</p>',
      reviews: [review({ id: 'r1', start: 4, end: 9, reviewerName: 'Mia' })],
    });
    const item = screen.getByTestId('review-item-r1');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Mia');
    expect(item).toHaveTextContent('quick');
  });

  it('shows a Draft badge for DRAFT reviews and a Complete action button', () => {
    renderList({ reviews: [review({ id: 'r1', status: REVIEW_STATUS.DRAFT })] });
    const item = screen.getByTestId('review-item-r1');
    expect(item).toHaveTextContent(UI_LABEL.REVIEW_DRAFT_BADGE);
    expect(screen.getByRole('button', { name: UI_LABEL.COMPLETE_REVIEW })).toBeInTheDocument();
  });

  it('shows a Completed badge for COMPLETED reviews and no Complete button', () => {
    renderList({ reviews: [review({ id: 'r1', status: REVIEW_STATUS.COMPLETED })] });
    const item = screen.getByTestId('review-item-r1');
    expect(item).toHaveTextContent(UI_LABEL.REVIEW_COMPLETED_BADGE);
    expect(screen.queryByRole('button', { name: UI_LABEL.COMPLETE_REVIEW })).toBeNull();
  });

  it('Complete button calls onComplete with the review id', () => {
    const { onComplete } = renderList({
      reviews: [review({ id: 'to-complete', status: REVIEW_STATUS.DRAFT })],
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.COMPLETE_REVIEW }));

    expect(onComplete).toHaveBeenCalledWith('to-complete');
  });

  it('Delete asks for confirmation and calls onDelete with the id when confirmed', () => {
    confirmSpy.mockReturnValue(true);
    const { onDelete } = renderList({
      reviews: [review({ id: 'to-delete' })],
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.DELETE_REVIEW }));

    expect(confirmSpy).toHaveBeenCalledWith(UI_PROMPT.CONFIRM_DELETE_REVIEW);
    expect(onDelete).toHaveBeenCalledWith('to-delete');
  });

  it('Delete does NOT call onDelete when the user cancels the confirmation', () => {
    confirmSpy.mockReturnValue(false);
    const { onDelete } = renderList({
      reviews: [review({ id: 'safe' })],
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.DELETE_REVIEW }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
