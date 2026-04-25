import { useCallback, useMemo } from 'react';
import { type Comment, type Reply } from '../constants/comments';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useLocalStorage } from './useLocalStorage';
import type { LocalUser } from './useLocalUser';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type UseCommentsResult = {
  comments: Comment[];
  addComment: (start: number, end: number, body: string) => Comment | null;
  addReply: (commentId: string, body: string) => Reply | null;
  toggleResolve: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  applyRemoteComments: (incoming: Comment[]) => void;
};

export function useComments(localUser: LocalUser): UseCommentsResult {
  const [comments, setComments] = useLocalStorage<Comment[]>(STORAGE_KEYS.COMMENTS, []);

  const addComment = useCallback(
    (start: number, end: number, body: string): Comment | null => {
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      const trimmed = body.trim();
      if (lo === hi || trimmed.length === 0) return null;
      const comment: Comment = {
        id: makeId('c'),
        start: lo,
        end: hi,
        body: trimmed,
        authorId: localUser.id,
        authorName: localUser.name,
        authorColor: localUser.color,
        createdAt: Date.now(),
        resolved: false,
        replies: [],
      };
      setComments((prev) => [...prev, comment]);
      return comment;
    },
    [localUser.id, localUser.name, localUser.color, setComments],
  );

  const addReply = useCallback(
    (commentId: string, body: string): Reply | null => {
      const trimmed = body.trim();
      if (trimmed.length === 0) return null;
      const reply: Reply = {
        id: makeId('rp'),
        body: trimmed,
        authorId: localUser.id,
        authorName: localUser.name,
        authorColor: localUser.color,
        createdAt: Date.now(),
      };
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c)),
      );
      return reply;
    },
    [localUser.id, localUser.name, localUser.color, setComments],
  );

  const toggleResolve = useCallback(
    (commentId: string) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                resolved: !c.resolved,
                resolvedAt: !c.resolved ? Date.now() : undefined,
              }
            : c,
        ),
      );
    },
    [setComments],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [setComments],
  );

  const applyRemoteComments = useCallback(
    (incoming: Comment[]) => {
      setComments(() => incoming);
    },
    [setComments],
  );

  return useMemo(
    () => ({ comments, addComment, addReply, toggleResolve, deleteComment, applyRemoteComments }),
    [comments, addComment, addReply, toggleResolve, deleteComment, applyRemoteComments],
  );
}
