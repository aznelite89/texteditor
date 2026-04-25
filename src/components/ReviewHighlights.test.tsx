import { createRef, type RefObject } from 'react';
import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ReviewHighlights } from './ReviewHighlights';
import { REVIEW_STATUS, type Review } from '../constants/review';

const originalRangeBounding = Range.prototype.getBoundingClientRect;
const originalRangeClientRects = Range.prototype.getClientRects;
const originalElementRect = Element.prototype.getBoundingClientRect;

beforeAll(() => {
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0, y: 0, width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400,
      toJSON: () => ({}),
    } as DOMRect;
  };
  Range.prototype.getBoundingClientRect = function () {
    return {
      x: 10, y: 20, width: 60, height: 18, top: 20, left: 10, right: 70, bottom: 38,
      toJSON: () => ({}),
    } as DOMRect;
  };
  Range.prototype.getClientRects = function () {
    const rect = {
      x: 10, y: 20, width: 60, height: 18, top: 20, left: 10, right: 70, bottom: 38,
      toJSON: () => ({}),
    } as DOMRect;
    const list = [rect] as unknown as DOMRectList;
    (list as unknown as { length: number }).length = 1;
    return list;
  };
});

afterAll(() => {
  Range.prototype.getBoundingClientRect = originalRangeBounding;
  Range.prototype.getClientRects = originalRangeClientRects;
  Element.prototype.getBoundingClientRect = originalElementRect;
});

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'r1',
    start: 0,
    end: 5,
    status: REVIEW_STATUS.DRAFT,
    reviewerId: 'me',
    reviewerName: 'Me',
    createdAt: 1,
    ...overrides,
  };
}

function setupEditor(html: string) {
  const editorRef = createRef<HTMLDivElement>();
  const Wrapper = (props: { reviews: Review[] }) => (
    <div>
      <div
        ref={editorRef}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ReviewHighlights
        editorRef={editorRef as RefObject<HTMLDivElement | null>}
        reviews={props.reviews}
        content={html}
      />
    </div>
  );
  return Wrapper;
}

describe('ReviewHighlights — Requirement 8: render highlights', () => {
  it('renders nothing when there are no reviews', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const { container } = render(<Wrapper reviews={[]} />);
    expect(container.querySelectorAll('[data-testid^="review-highlight-"]').length).toBe(0);
  });

  it('renders a highlight rectangle for a draft review with the draft data attribute', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const { container } = render(
      <Wrapper reviews={[review({ id: 'r1', status: REVIEW_STATUS.DRAFT, start: 0, end: 5 })]} />,
    );
    const el = container.querySelector('[data-testid="review-highlight-r1"]');
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute('data-review-status', REVIEW_STATUS.DRAFT);
  });

  it('renders a highlight for a completed review with the completed data attribute', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const { container } = render(
      <Wrapper reviews={[review({ id: 'r2', status: REVIEW_STATUS.COMPLETED, start: 0, end: 5 })]} />,
    );
    const el = container.querySelector('[data-testid="review-highlight-r2"]');
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute('data-review-status', REVIEW_STATUS.COMPLETED);
  });

  it('renders multiple highlights when multiple reviews exist', () => {
    const Wrapper = setupEditor('<p>hello world foo bar</p>');
    const { container } = render(
      <Wrapper
        reviews={[
          review({ id: 'a', status: REVIEW_STATUS.DRAFT, start: 0, end: 5 }),
          review({ id: 'b', status: REVIEW_STATUS.COMPLETED, start: 6, end: 11 }),
        ]}
      />,
    );
    expect(container.querySelector('[data-testid="review-highlight-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="review-highlight-b"]')).not.toBeNull();
  });
});
