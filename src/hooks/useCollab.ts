import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COLLAB_CHANNEL,
  COLLAB_MESSAGE,
  COLLAB_TIMING,
  type CollabMessageType,
} from '../constants/collab';
import type { Comment } from '../constants/comments';
import type { Review } from '../constants/review';
import type { LocalUser } from './useLocalUser';

export type Peer = {
  id: string;
  name: string;
  color: string;
  lastSeen: number;
};

export type RemoteCaret = {
  userId: string;
  offset: number;
};

type EnvelopeBase = {
  type: CollabMessageType;
  from: string;
  fromName: string;
  fromColor: string;
  ts: number;
};

export type CollabEnvelope =
  | (EnvelopeBase & { type: typeof COLLAB_MESSAGE.JOIN })
  | (EnvelopeBase & { type: typeof COLLAB_MESSAGE.LEAVE })
  | (EnvelopeBase & { type: typeof COLLAB_MESSAGE.PING })
  | (EnvelopeBase & { type: typeof COLLAB_MESSAGE.CARET; offset: number })
  | (EnvelopeBase & { type: typeof COLLAB_MESSAGE.CONTENT; html: string })
  | (EnvelopeBase & { type: typeof COLLAB_MESSAGE.REVIEWS; reviews: Review[] })
  | (EnvelopeBase & { type: typeof COLLAB_MESSAGE.COMMENTS; comments: Comment[] });

export type RemoteContentHandler = (html: string, fromUserId: string) => void;
export type RemoteReviewsHandler = (reviews: Review[], fromUserId: string) => void;
export type RemoteCommentsHandler = (comments: Comment[], fromUserId: string) => void;

export type UseCollabResult = {
  peers: Peer[];
  remoteCarets: Map<string, RemoteCaret>;
  broadcastCaret: (offset: number) => void;
  broadcastContent: (html: string) => void;
  broadcastReviews: (reviews: Review[]) => void;
  broadcastComments: (comments: Comment[]) => void;
  onRemoteContent: (handler: RemoteContentHandler) => () => void;
  onRemoteReviews: (handler: RemoteReviewsHandler) => () => void;
  onRemoteComments: (handler: RemoteCommentsHandler) => () => void;
};

function upsertPeer(prev: Peer[], peer: Peer): Peer[] {
  const idx = prev.findIndex((p) => p.id === peer.id);
  if (idx === -1) return [...prev, peer];
  const next = prev.slice();
  next[idx] = peer;
  return next;
}

function removePeer(prev: Peer[], id: string): Peer[] {
  const idx = prev.findIndex((p) => p.id === id);
  return idx === -1 ? prev : prev.filter((p) => p.id !== id);
}

function reapStaleCarets(
  prev: Map<string, RemoteCaret>,
  livePeerIds: Set<string>,
): Map<string, RemoteCaret> {
  let changed = false;
  const next = new Map<string, RemoteCaret>();
  for (const [id, caret] of prev) {
    if (livePeerIds.has(id)) {
      next.set(id, caret);
    } else {
      changed = true;
    }
  }
  return changed ? next : prev;
}

export function useCollab(localUser: LocalUser): UseCollabResult {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [remoteCarets, setRemoteCarets] = useState<Map<string, RemoteCaret>>(
    () => new Map(),
  );
  const channelRef = useRef<BroadcastChannel | null>(null);
  const contentSubsRef = useRef<Set<RemoteContentHandler>>(new Set());
  const reviewsSubsRef = useRef<Set<RemoteReviewsHandler>>(new Set());
  const commentsSubsRef = useRef<Set<RemoteCommentsHandler>>(new Set());

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(COLLAB_CHANNEL);
    channelRef.current = channel;

    const send = (extra: Partial<CollabEnvelope> & { type: CollabMessageType }) => {
      const envelope = {
        ...extra,
        from: localUser.id,
        fromName: localUser.name,
        fromColor: localUser.color,
        ts: Date.now(),
      } as CollabEnvelope;
      channel.postMessage(envelope);
    };

    const handle = (event: MessageEvent<CollabEnvelope>) => {
      const msg = event.data;
      if (!msg || msg.from === localUser.id) return;

      const seenPeer: Peer = {
        id: msg.from,
        name: msg.fromName,
        color: msg.fromColor,
        lastSeen: msg.ts,
      };

      if (msg.type === COLLAB_MESSAGE.JOIN) {
        setPeers((prev) => upsertPeer(prev, seenPeer));
        // Reply so the new peer learns about us.
        send({ type: COLLAB_MESSAGE.JOIN });
      } else if (msg.type === COLLAB_MESSAGE.PING) {
        setPeers((prev) => upsertPeer(prev, seenPeer));
      } else if (msg.type === COLLAB_MESSAGE.LEAVE) {
        setPeers((prev) => removePeer(prev, msg.from));
        setRemoteCarets((prev) => {
          if (!prev.has(msg.from)) return prev;
          const next = new Map(prev);
          next.delete(msg.from);
          return next;
        });
      } else if (msg.type === COLLAB_MESSAGE.CARET) {
        setPeers((prev) => upsertPeer(prev, seenPeer));
        setRemoteCarets((prev) => {
          const next = new Map(prev);
          next.set(msg.from, { userId: msg.from, offset: msg.offset });
          return next;
        });
      } else if (msg.type === COLLAB_MESSAGE.CONTENT) {
        setPeers((prev) => upsertPeer(prev, seenPeer));
        for (const cb of contentSubsRef.current) cb(msg.html, msg.from);
      } else if (msg.type === COLLAB_MESSAGE.REVIEWS) {
        setPeers((prev) => upsertPeer(prev, seenPeer));
        for (const cb of reviewsSubsRef.current) cb(msg.reviews, msg.from);
      } else if (msg.type === COLLAB_MESSAGE.COMMENTS) {
        setPeers((prev) => upsertPeer(prev, seenPeer));
        for (const cb of commentsSubsRef.current) cb(msg.comments, msg.from);
      }
    };

    channel.addEventListener('message', handle);
    send({ type: COLLAB_MESSAGE.JOIN });

    const pingTimer = setInterval(() => {
      send({ type: COLLAB_MESSAGE.PING });
      const cutoff = Date.now() - COLLAB_TIMING.PEER_TIMEOUT_MS;
      setPeers((prev) => {
        const live = prev.filter((p) => p.lastSeen >= cutoff);
        if (live.length === prev.length) return prev;
        const liveIds = new Set(live.map((p) => p.id));
        setRemoteCarets((current) => reapStaleCarets(current, liveIds));
        return live;
      });
    }, COLLAB_TIMING.PING_INTERVAL_MS);

    const onUnload = () => send({ type: COLLAB_MESSAGE.LEAVE });
    window.addEventListener('beforeunload', onUnload);

    return () => {
      send({ type: COLLAB_MESSAGE.LEAVE });
      window.removeEventListener('beforeunload', onUnload);
      clearInterval(pingTimer);
      channel.removeEventListener('message', handle);
      channel.close();
      channelRef.current = null;
    };
  }, [localUser.id, localUser.name, localUser.color]);

  const broadcastCaret = useCallback(
    (offset: number) => {
      const ch = channelRef.current;
      if (!ch) return;
      ch.postMessage({
        type: COLLAB_MESSAGE.CARET,
        from: localUser.id,
        fromName: localUser.name,
        fromColor: localUser.color,
        ts: Date.now(),
        offset,
      } satisfies CollabEnvelope);
    },
    [localUser.id, localUser.name, localUser.color],
  );

  const broadcastContent = useCallback(
    (html: string) => {
      const ch = channelRef.current;
      if (!ch) return;
      ch.postMessage({
        type: COLLAB_MESSAGE.CONTENT,
        from: localUser.id,
        fromName: localUser.name,
        fromColor: localUser.color,
        ts: Date.now(),
        html,
      } satisfies CollabEnvelope);
    },
    [localUser.id, localUser.name, localUser.color],
  );

  const broadcastReviews = useCallback(
    (reviews: Review[]) => {
      const ch = channelRef.current;
      if (!ch) return;
      ch.postMessage({
        type: COLLAB_MESSAGE.REVIEWS,
        from: localUser.id,
        fromName: localUser.name,
        fromColor: localUser.color,
        ts: Date.now(),
        reviews,
      } satisfies CollabEnvelope);
    },
    [localUser.id, localUser.name, localUser.color],
  );

  const onRemoteContent = useCallback((handler: RemoteContentHandler) => {
    contentSubsRef.current.add(handler);
    return () => {
      contentSubsRef.current.delete(handler);
    };
  }, []);

  const onRemoteReviews = useCallback((handler: RemoteReviewsHandler) => {
    reviewsSubsRef.current.add(handler);
    return () => {
      reviewsSubsRef.current.delete(handler);
    };
  }, []);

  const broadcastComments = useCallback(
    (comments: Comment[]) => {
      const ch = channelRef.current;
      if (!ch) return;
      ch.postMessage({
        type: COLLAB_MESSAGE.COMMENTS,
        from: localUser.id,
        fromName: localUser.name,
        fromColor: localUser.color,
        ts: Date.now(),
        comments,
      } satisfies CollabEnvelope);
    },
    [localUser.id, localUser.name, localUser.color],
  );

  const onRemoteComments = useCallback((handler: RemoteCommentsHandler) => {
    commentsSubsRef.current.add(handler);
    return () => {
      commentsSubsRef.current.delete(handler);
    };
  }, []);

  // Memoize the returned object so consumers that depend on `collab` don't
  // tear down + re-attach effects on every render. The inner functions are
  // already stable via useCallback; peers/remoteCarets change only when their
  // setState fires.
  return useMemo(
    () => ({
      peers,
      remoteCarets,
      broadcastCaret,
      broadcastContent,
      broadcastReviews,
      broadcastComments,
      onRemoteContent,
      onRemoteReviews,
      onRemoteComments,
    }),
    [
      peers,
      remoteCarets,
      broadcastCaret,
      broadcastContent,
      broadcastReviews,
      broadcastComments,
      onRemoteContent,
      onRemoteReviews,
      onRemoteComments,
    ],
  );
}
