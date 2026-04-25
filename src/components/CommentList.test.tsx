import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentList } from './CommentList';
import { type Comment, type Reply } from '../constants/comments';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';

function reply(overrides: Partial<Reply> = {}): Reply {
  return {
    id: 'rp1',
    body: 'sounds good',
    authorId: 'p',
    authorName: 'Pat',
    authorColor: '#222',
    createdAt: 2,
    ...overrides,
  };
}

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    start: 0,
    end: 5,
    body: 'please reword',
    authorId: 'me',
    authorName: 'Mia',
    authorColor: '#111',
    createdAt: 1,
    resolved: false,
    replies: [],
    ...overrides,
  };
}

function renderList(overrides: Partial<React.ComponentProps<typeof CommentList>> = {}) {
  const props = {
    comments: overrides.comments ?? [],
    content: overrides.content ?? '<p>hello world</p>',
    onAddReply: overrides.onAddReply ?? vi.fn(),
    onToggleResolve: overrides.onToggleResolve ?? vi.fn(),
    onDelete: overrides.onDelete ?? vi.fn(),
  };
  render(<CommentList {...props} />);
  return props;
}

describe('CommentList — Requirement 9: comment thread UI', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('renders the heading and an empty state when there are no comments', () => {
    renderList();
    expect(screen.getByRole('heading', { name: UI_LABEL.COMMENTS_HEADING })).toBeInTheDocument();
    expect(screen.getByText(UI_LABEL.EMPTY_COMMENTS)).toBeInTheDocument();
  });

  it('renders a comment with author, snippet, and body', () => {
    renderList({
      content: '<p>the quick brown fox</p>',
      comments: [comment({ id: 'c1', start: 4, end: 9, body: 'quick → fast?', authorName: 'Mia' })],
    });
    const item = screen.getByTestId('comment-item-c1');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Mia');
    expect(item).toHaveTextContent('quick');
    expect(item).toHaveTextContent('quick → fast?');
  });

  it('renders nested replies when present', () => {
    renderList({
      comments: [
        comment({
          id: 'c1',
          replies: [
            reply({ id: 'rp1', body: 'agreed', authorName: 'Pat' }),
            reply({ id: 'rp2', body: 'no', authorName: 'Sam' }),
          ],
        }),
      ],
    });
    expect(screen.getByTestId('comment-reply-rp1')).toHaveTextContent('agreed');
    expect(screen.getByTestId('comment-reply-rp2')).toHaveTextContent('no');
  });

  it('reply form submits trimmed text via onAddReply', () => {
    const { onAddReply } = renderList({
      comments: [comment({ id: 'c1' })],
    });

    const textarea = screen.getByLabelText(UI_LABEL.COMMENT_REPLY_PLACEHOLDER) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '  thanks  ' } });
    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.COMMENT_REPLY }));

    expect(onAddReply).toHaveBeenCalledWith('c1', 'thanks');
  });

  it('reply button is disabled when the textarea is empty / whitespace', () => {
    renderList({ comments: [comment({ id: 'c1' })] });
    const replyBtn = screen.getByRole('button', { name: UI_LABEL.COMMENT_REPLY });
    expect(replyBtn).toBeDisabled();

    const textarea = screen.getByLabelText(UI_LABEL.COMMENT_REPLY_PLACEHOLDER) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(replyBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'real text' } });
    expect(replyBtn).not.toBeDisabled();
  });

  it('Resolve button calls onToggleResolve when comment is unresolved (label "Resolve")', () => {
    const { onToggleResolve } = renderList({
      comments: [comment({ id: 'c1', resolved: false })],
    });
    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.COMMENT_RESOLVE }));
    expect(onToggleResolve).toHaveBeenCalledWith('c1');
  });

  it('When resolved, button label becomes "Reopen" and item carries the data attribute', () => {
    renderList({ comments: [comment({ id: 'c1', resolved: true })] });
    expect(screen.getByRole('button', { name: UI_LABEL.COMMENT_REOPEN })).toBeInTheDocument();
    expect(screen.getByTestId('comment-item-c1')).toHaveAttribute('data-resolved', 'true');
    expect(screen.getByText(UI_LABEL.COMMENT_RESOLVED_BADGE)).toBeInTheDocument();
  });

  it('Delete asks for confirmation and forwards the id when confirmed', () => {
    confirmSpy.mockReturnValue(true);
    const { onDelete } = renderList({ comments: [comment({ id: 'to-delete' })] });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.COMMENT_DELETE }));

    expect(confirmSpy).toHaveBeenCalledWith(UI_PROMPT.CONFIRM_DELETE_COMMENT);
    expect(onDelete).toHaveBeenCalledWith('to-delete');
  });

  it('Delete does NOT call onDelete when the user cancels the confirmation', () => {
    confirmSpy.mockReturnValue(false);
    const { onDelete } = renderList({ comments: [comment({ id: 'safe' })] });
    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.COMMENT_DELETE }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
