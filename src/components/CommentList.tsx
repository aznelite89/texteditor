import { memo, useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import { type Comment } from '../constants/comments';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';

function snippet(html: string, start: number, end: number): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent ?? '';
  const slice = text.slice(start, end);
  if (slice.length === 0) return '(empty selection)';
  if (slice.length > 80) return `${slice.slice(0, 77)}…`;
  return slice;
}

type CommentListProps = {
  comments: Comment[];
  content: string;
  onAddReply: (commentId: string, body: string) => void;
  onToggleResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
};

type ReplyComposerProps = {
  commentId: string;
  onSubmit: (commentId: string, body: string) => void;
};

function ReplyComposer({ commentId, onSubmit }: ReplyComposerProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSubmit(commentId, trimmed);
    setDraft('');
  };

  return (
    <form className="comments__reply-form" onSubmit={handleSubmit}>
      <textarea
        className="comments__reply-input"
        aria-label={UI_LABEL.COMMENT_REPLY_PLACEHOLDER}
        placeholder={UI_LABEL.COMMENT_REPLY_PLACEHOLDER}
        value={draft}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
        rows={2}
      />
      <button
        type="submit"
        className="comments__btn comments__btn--reply"
        disabled={draft.trim().length === 0}
      >
        {UI_LABEL.COMMENT_REPLY}
      </button>
    </form>
  );
}

function CommentListImpl({
  comments,
  content,
  onAddReply,
  onToggleResolve,
  onDelete,
}: CommentListProps) {
  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm(UI_PROMPT.CONFIRM_DELETE_COMMENT)) {
        onDelete(id);
      }
    },
    [onDelete],
  );

  return (
    <aside className="comments">
      <div className="comments__header">
        <h2 className="comments__heading">{UI_LABEL.COMMENTS_HEADING}</h2>
      </div>
      {comments.length === 0 ? (
        <p className="comments__empty">{UI_LABEL.EMPTY_COMMENTS}</p>
      ) : (
        <ul className="comments__list">
          {comments.map((c) => (
            <li
              key={c.id}
              className={`comments__item${c.resolved ? ' comments__item--resolved' : ''}`}
              data-testid={`comment-item-${c.id}`}
              data-resolved={c.resolved ? 'true' : 'false'}
            >
              <div className="comments__meta">
                <span
                  className="comments__author-dot"
                  style={{ background: c.authorColor }}
                  aria-hidden
                />
                <span className="comments__author">{c.authorName}</span>
                {c.resolved && (
                  <span className="comments__badge">{UI_LABEL.COMMENT_RESOLVED_BADGE}</span>
                )}
              </div>
              <div className="comments__snippet">{snippet(content, c.start, c.end)}</div>
              <div className="comments__body">{c.body}</div>
              {c.replies.length > 0 && (
                <ul className="comments__replies">
                  {c.replies.map((r) => (
                    <li
                      key={r.id}
                      className="comments__reply"
                      data-testid={`comment-reply-${r.id}`}
                    >
                      <div className="comments__meta comments__meta--reply">
                        <span
                          className="comments__author-dot"
                          style={{ background: r.authorColor }}
                          aria-hidden
                        />
                        <span className="comments__author">{r.authorName}</span>
                      </div>
                      <div className="comments__body">{r.body}</div>
                    </li>
                  ))}
                </ul>
              )}
              <ReplyComposer commentId={c.id} onSubmit={onAddReply} />
              <div className="comments__actions">
                <button
                  type="button"
                  className="comments__btn"
                  onClick={() => onToggleResolve(c.id)}
                >
                  {c.resolved ? UI_LABEL.COMMENT_REOPEN : UI_LABEL.COMMENT_RESOLVE}
                </button>
                <button
                  type="button"
                  className="comments__btn comments__btn--delete"
                  onClick={() => handleDelete(c.id)}
                >
                  {UI_LABEL.COMMENT_DELETE}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export const CommentList = memo(CommentListImpl);
export default CommentList;
