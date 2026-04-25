import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COLLAB_CHANNEL,
  COLLAB_MESSAGE,
} from '../constants/collab';
import { REVIEW_STATUS, type Review } from '../constants/review';
import { useCollab, type CollabEnvelope } from './useCollab';
import type { LocalUser } from './useLocalUser';

const LOCAL: LocalUser = {
  id: 'local-user',
  name: 'Local',
  color: '#000000',
};

const PEER_USER = {
  id: 'peer-user',
  name: 'Peer',
  color: '#ff00ff',
};

function makePeerEnvelope<T extends Partial<CollabEnvelope>>(
  type: CollabEnvelope['type'],
  extras?: T,
): CollabEnvelope {
  return {
    type,
    from: PEER_USER.id,
    fromName: PEER_USER.name,
    fromColor: PEER_USER.color,
    ts: Date.now(),
    ...extras,
  } as CollabEnvelope;
}

async function flush() {
  // Yield once for BroadcastChannel async delivery + once for React state.
  await Promise.resolve();
  await Promise.resolve();
}

describe('useCollab — Requirement 6: collab message protocol', () => {
  let externalChannel: BroadcastChannel;

  beforeEach(() => {
    if (typeof BroadcastChannel === 'undefined') {
      throw new Error('BroadcastChannel is required for useCollab tests');
    }
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);
  });

  afterEach(() => {
    externalChannel.close();
  });

  it('broadcasts a JOIN message on mount', async () => {
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    renderHook(() => useCollab(LOCAL));
    await flush();

    const join = received.find((m) => m.type === COLLAB_MESSAGE.JOIN);
    expect(join).toBeDefined();
    expect(join?.from).toBe(LOCAL.id);
  });

  it('broadcasts a LEAVE message on unmount', async () => {
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    const { unmount } = renderHook(() => useCollab(LOCAL));
    await flush();

    received.length = 0;
    unmount();
    await flush();

    const leave = received.find((m) => m.type === COLLAB_MESSAGE.LEAVE);
    expect(leave).toBeDefined();
    expect(leave?.from).toBe(LOCAL.id);
  });

  it('adds a peer to the peers list when a remote JOIN arrives', async () => {
    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();

    await act(async () => {
      externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.JOIN));
      await flush();
    });

    await waitFor(() => {
      expect(result.current.peers.map((p) => p.id)).toContain(PEER_USER.id);
    });
    const peer = result.current.peers.find((p) => p.id === PEER_USER.id);
    expect(peer?.name).toBe(PEER_USER.name);
    expect(peer?.color).toBe(PEER_USER.color);
  });

  it('replies to a remote JOIN with our own JOIN so the new peer learns about us', async () => {
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    renderHook(() => useCollab(LOCAL));
    await flush();

    received.length = 0;
    await act(async () => {
      externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.JOIN));
      await flush();
    });

    const reply = received.find(
      (m) => m.type === COLLAB_MESSAGE.JOIN && m.from === LOCAL.id,
    );
    expect(reply).toBeDefined();
  });

  it('removes a peer when LEAVE arrives', async () => {
    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();

    await act(async () => {
      externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.JOIN));
      await flush();
    });
    await waitFor(() => {
      expect(result.current.peers.map((p) => p.id)).toContain(PEER_USER.id);
    });

    await act(async () => {
      externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.LEAVE));
      await flush();
    });

    await waitFor(() => {
      expect(result.current.peers.map((p) => p.id)).not.toContain(PEER_USER.id);
    });
  });

  it('records remote caret offsets per peer', async () => {
    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();

    await act(async () => {
      externalChannel.postMessage(
        makePeerEnvelope(COLLAB_MESSAGE.CARET, { offset: 7 }),
      );
      await flush();
    });

    await waitFor(() => {
      expect(result.current.remoteCarets.get(PEER_USER.id)?.offset).toBe(7);
    });
  });

  it('invokes onRemoteContent subscribers when remote CONTENT arrives', async () => {
    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();

    const handler = vi.fn();
    let unsubscribe = () => {};
    act(() => {
      unsubscribe = result.current.onRemoteContent(handler);
    });

    await act(async () => {
      externalChannel.postMessage(
        makePeerEnvelope(COLLAB_MESSAGE.CONTENT, { html: '<p>from peer</p>' }),
      );
      await flush();
    });

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith('<p>from peer</p>', PEER_USER.id);
    });

    unsubscribe();
  });

  it('broadcastCaret posts a CARET message with the local user identity', async () => {
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();
    received.length = 0;

    act(() => {
      result.current.broadcastCaret(42);
    });
    await flush();

    const caret = received.find((m) => m.type === COLLAB_MESSAGE.CARET);
    expect(caret).toBeDefined();
    if (caret?.type === COLLAB_MESSAGE.CARET) {
      expect(caret.offset).toBe(42);
      expect(caret.from).toBe(LOCAL.id);
    }
  });

  it('broadcastContent posts a CONTENT message with the html payload', async () => {
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();
    received.length = 0;

    act(() => {
      result.current.broadcastContent('<p>hello</p>');
    });
    await flush();

    const content = received.find((m) => m.type === COLLAB_MESSAGE.CONTENT);
    expect(content).toBeDefined();
    if (content?.type === COLLAB_MESSAGE.CONTENT) {
      expect(content.html).toBe('<p>hello</p>');
      expect(content.from).toBe(LOCAL.id);
    }
  });

  it('broadcastReviews posts a REVIEWS message with the list', async () => {
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();
    received.length = 0;

    const list: Review[] = [
      {
        id: 'rev-1',
        start: 0,
        end: 5,
        status: REVIEW_STATUS.COMPLETED,
        reviewerId: LOCAL.id,
        reviewerName: LOCAL.name,
        createdAt: 1,
        completedAt: 2,
      },
    ];

    act(() => {
      result.current.broadcastReviews(list);
    });
    await flush();

    const envelope = received.find((m) => m.type === COLLAB_MESSAGE.REVIEWS);
    expect(envelope).toBeDefined();
    if (envelope?.type === COLLAB_MESSAGE.REVIEWS) {
      expect(envelope.reviews).toEqual(list);
      expect(envelope.from).toBe(LOCAL.id);
    }
  });

  it('invokes onRemoteReviews subscribers when a remote REVIEWS message arrives', async () => {
    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();

    const handler = vi.fn();
    let unsubscribe = () => {};
    act(() => {
      unsubscribe = result.current.onRemoteReviews(handler);
    });

    const incoming: Review[] = [
      {
        id: 'remote-1',
        start: 10,
        end: 12,
        status: REVIEW_STATUS.COMPLETED,
        reviewerId: PEER_USER.id,
        reviewerName: PEER_USER.name,
        createdAt: 1,
        completedAt: 2,
      },
    ];

    await act(async () => {
      externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.REVIEWS, { reviews: incoming }));
      await flush();
    });

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(incoming, PEER_USER.id);
    });
    unsubscribe();
  });

  it('ignores envelopes from itself (no echo loop)', async () => {
    const { result } = renderHook(() => useCollab(LOCAL));
    await flush();

    const handler = vi.fn();
    act(() => {
      result.current.onRemoteContent(handler);
    });

    await act(async () => {
      externalChannel.postMessage({
        type: COLLAB_MESSAGE.CONTENT,
        from: LOCAL.id,
        fromName: LOCAL.name,
        fromColor: LOCAL.color,
        ts: Date.now(),
        html: '<p>echo</p>',
      } satisfies CollabEnvelope);
      await flush();
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.current.peers.map((p) => p.id)).not.toContain(LOCAL.id);
  });
});
