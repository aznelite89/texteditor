import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { nodeAtOffset } from '../utils/caretOffset';
import { rafThrottle } from '../utils/rafThrottle';
import type { Peer, RemoteCaret } from '../hooks/useCollab';

type Position = { top: number; left: number; height: number };

type RemoteCursorsProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  carets: Map<string, RemoteCaret>;
  peers: Peer[];
  content: string;
};

function isZeroRect(rect: DOMRect): boolean {
  return rect.top === 0 && rect.left === 0 && rect.width === 0 && rect.height === 0;
}

function rectFromRange(range: Range): DOMRect | null {
  const direct = range.getBoundingClientRect();
  if (!isZeroRect(direct)) return direct;
  const list = range.getClientRects();
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!isZeroRect(r)) return r;
  }
  return null;
}

function fallbackRectFromNode(node: Node): DOMRect | null {
  const parent = node.parentElement;
  if (!parent) return null;
  const rect = parent.getBoundingClientRect();
  return isZeroRect(rect) ? null : rect;
}

function RemoteCursorsImpl({ editorRef, carets, peers, content }: RemoteCursorsProps) {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      setPositions((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }

    const compute = () => {
      const editorRect = editor.getBoundingClientRect();
      const next = new Map<string, Position>();
      for (const [userId, caret] of carets) {
        const found = nodeAtOffset(editor, caret.offset);
        if (!found) continue;
        const range = document.createRange();
        try {
          range.setStart(found.node, found.offset);
          range.setEnd(found.node, found.offset);
        } catch {
          continue;
        }
        const rect = rectFromRange(range) ?? fallbackRectFromNode(found.node);
        if (!rect) {
          next.set(userId, { top: 0, left: 0, height: 18 });
          continue;
        }
        next.set(userId, {
          top: rect.top - editorRect.top,
          left: rect.left - editorRect.left,
          height: rect.height || 18,
        });
      }
      setPositions(next);
    };

    // First compute is synchronous so the cursor appears immediately;
    // resize/scroll updates are throttled to one per frame.
    compute();
    const throttled = rafThrottle(compute);
    window.addEventListener('resize', throttled);
    window.addEventListener('scroll', throttled, true);
    return () => {
      throttled.cancel();
      window.removeEventListener('resize', throttled);
      window.removeEventListener('scroll', throttled, true);
    };
  }, [editorRef, carets, content]);

  const peerById = useMemo(() => {
    const map = new Map<string, Peer>();
    for (const p of peers) map.set(p.id, p);
    return map;
  }, [peers]);

  return (
    <div className="remote-cursors" aria-hidden>
      {Array.from(positions.entries()).map(([userId, pos]) => {
        const peer = peerById.get(userId);
        if (!peer) return null;
        const style: CSSProperties = {
          top: pos.top,
          left: pos.left,
          height: pos.height,
          ['--peer-color' as string]: peer.color,
        };
        return (
          <div
            key={userId}
            className="remote-cursor"
            data-testid={`remote-cursor-${userId}`}
            data-peer-name={peer.name}
            data-peer-color={peer.color}
            style={style}
          >
            <span className="remote-cursor__bar" />
            <span className="remote-cursor__label">{peer.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export const RemoteCursors = memo(RemoteCursorsImpl);
