import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Comment } from '../constants/comments';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useComments } from './useComments';
import type { LocalUser } from './useLocalUser';

const LOCAL: LocalUser = { id: 'me', name: 'Mia', color: '#111' };

function clearCommentsStorage() {
  window.localStorage.removeItem(STORAGE_KEYS.COMMENTS);
}

describe('useComments — Requirement 9: comments hook', () => {
  beforeEach(() => clearCommentsStorage());
  afterEach(() => clearCommentsStorage());

  it('starts empty when nothing is stored', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    expect(result.current.comments).toEqual([]);
  });

  it('addComment creates a comment with author + range + body', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let created: Comment | null = null;
    act(() => {
      created = result.current.addComment(0, 5, 'Looks good');
    });
    expect(created).not.toBeNull();
    expect(created!.body).toBe('Looks good');
    expect(created!.start).toBe(0);
    expect(created!.end).toBe(5);
    expect(created!.authorId).toBe(LOCAL.id);
    expect(created!.authorName).toBe(LOCAL.name);
    expect(created!.authorColor).toBe(LOCAL.color);
    expect(created!.resolved).toBe(false);
    expect(created!.replies).toEqual([]);
    expect(result.current.comments).toHaveLength(1);
  });

  it('addComment normalizes start/end and trims the body', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let created: Comment | null = null;
    act(() => {
      created = result.current.addComment(8, 3, '  trimmed body  ');
    });
    expect(created!.start).toBe(3);
    expect(created!.end).toBe(8);
    expect(created!.body).toBe('trimmed body');
  });

  it('addComment returns null and stores nothing for collapsed selection', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let created: Comment | null = null;
    act(() => {
      created = result.current.addComment(5, 5, 'x');
    });
    expect(created).toBeNull();
    expect(result.current.comments).toHaveLength(0);
  });

  it('addComment returns null and stores nothing when body is whitespace-only', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let created: Comment | null = null;
    act(() => {
      created = result.current.addComment(0, 5, '   \n  ');
    });
    expect(created).toBeNull();
    expect(result.current.comments).toHaveLength(0);
  });

  it('addReply appends a reply with the local user', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let created: Comment | null = null;
    act(() => {
      created = result.current.addComment(0, 4, 'parent');
    });

    act(() => {
      result.current.addReply(created!.id, 'first reply');
    });

    const updated = result.current.comments.find((c) => c.id === created!.id)!;
    expect(updated.replies).toHaveLength(1);
    expect(updated.replies[0].body).toBe('first reply');
    expect(updated.replies[0].authorId).toBe(LOCAL.id);
  });

  it('addReply ignores empty / whitespace-only bodies', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let created: Comment | null = null;
    act(() => {
      created = result.current.addComment(0, 4, 'parent');
    });

    act(() => {
      result.current.addReply(created!.id, '   ');
    });

    expect(result.current.comments[0].replies).toHaveLength(0);
  });

  it('toggleResolve flips resolved on then off and tracks resolvedAt', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let created: Comment | null = null;
    act(() => {
      created = result.current.addComment(0, 4, 'thread');
    });

    act(() => {
      result.current.toggleResolve(created!.id);
    });
    let updated = result.current.comments.find((c) => c.id === created!.id)!;
    expect(updated.resolved).toBe(true);
    expect(typeof updated.resolvedAt).toBe('number');

    act(() => {
      result.current.toggleResolve(created!.id);
    });
    updated = result.current.comments.find((c) => c.id === created!.id)!;
    expect(updated.resolved).toBe(false);
    expect(updated.resolvedAt).toBeUndefined();
  });

  it('deleteComment removes the entry by id', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    let a: Comment | null = null;
    let b: Comment | null = null;
    act(() => {
      a = result.current.addComment(0, 2, 'a');
    });
    act(() => {
      b = result.current.addComment(3, 5, 'b');
    });

    act(() => {
      result.current.deleteComment(a!.id);
    });

    expect(result.current.comments.map((c) => c.id)).toEqual([b!.id]);
  });

  it('applyRemoteComments replaces the entire local list', () => {
    const { result } = renderHook(() => useComments(LOCAL));
    act(() => {
      result.current.addComment(0, 2, 'local');
    });

    const incoming: Comment[] = [
      {
        id: 'remote-1',
        start: 10,
        end: 15,
        body: 'from peer',
        authorId: 'peer',
        authorName: 'Peer',
        authorColor: '#10b981',
        createdAt: 1,
        resolved: false,
        replies: [],
      },
    ];

    act(() => {
      result.current.applyRemoteComments(incoming);
    });

    expect(result.current.comments).toEqual(incoming);
  });

  it('persists to STORAGE_KEYS.COMMENTS and hydrates from it', () => {
    const seeded: Comment[] = [
      {
        id: 'seed',
        start: 0,
        end: 3,
        body: 'hello',
        authorId: 'me',
        authorName: 'Mia',
        authorColor: '#111',
        createdAt: 1,
        resolved: false,
        replies: [],
      },
    ];
    window.localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(seeded));
    const { result } = renderHook(() => useComments(LOCAL));
    expect(result.current.comments).toEqual(seeded);

    act(() => {
      result.current.addComment(5, 8, 'second');
    });
    const raw = window.localStorage.getItem(STORAGE_KEYS.COMMENTS);
    const parsed = JSON.parse(raw as string) as Comment[];
    expect(parsed).toHaveLength(2);
  });
});
