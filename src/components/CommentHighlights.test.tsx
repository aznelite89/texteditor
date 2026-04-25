import { createRef, type RefObject } from 'react';
import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CommentHighlights } from './CommentHighlights';
import { type Comment } from '../constants/comments';

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

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    start: 0,
    end: 5,
    body: 'hi',
    authorId: 'me',
    authorName: 'Mia',
    authorColor: '#111',
    createdAt: 1,
    resolved: false,
    replies: [],
    ...overrides,
  };
}

function setupEditor(html: string) {
  const editorRef = createRef<HTMLDivElement>();
  const Wrapper = (props: { comments: Comment[] }) => (
    <div>
      <div
        ref={editorRef}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CommentHighlights
        editorRef={editorRef as RefObject<HTMLDivElement | null>}
        comments={props.comments}
        content={html}
      />
    </div>
  );
  return Wrapper;
}

describe('CommentHighlights — Requirement 9: render comment highlights', () => {
  it('renders nothing when there are no comments', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const { container } = render(<Wrapper comments={[]} />);
    expect(container.querySelectorAll('[data-testid^="comment-highlight-"]').length).toBe(0);
  });

  it('renders an active highlight for an unresolved comment', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const { container } = render(
      <Wrapper comments={[comment({ id: 'c1', resolved: false })]} />,
    );
    const el = container.querySelector('[data-testid="comment-highlight-c1"]');
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute('data-resolved', 'false');
  });

  it('renders a resolved highlight when the comment is resolved', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const { container } = render(
      <Wrapper comments={[comment({ id: 'c2', resolved: true })]} />,
    );
    const el = container.querySelector('[data-testid="comment-highlight-c2"]');
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute('data-resolved', 'true');
  });

  it('renders multiple highlights for multiple comments', () => {
    const Wrapper = setupEditor('<p>hello world foo bar</p>');
    const { container } = render(
      <Wrapper
        comments={[
          comment({ id: 'a', start: 0, end: 5 }),
          comment({ id: 'b', start: 6, end: 11 }),
        ]}
      />,
    );
    expect(container.querySelector('[data-testid="comment-highlight-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="comment-highlight-b"]')).not.toBeNull();
  });
});
