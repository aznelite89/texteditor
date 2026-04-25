import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { nodeAtOffset } from '../utils/caretOffset';
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
  // Some browsers return a usable entry in getClientRects() even when
  // getBoundingClientRect() reports all zeros for a collapsed range.
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

export function RemoteCursors({ editorRef, carets, peers, content }: RemoteCursorsProps) {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      setPositions(new Map());
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
          // Last-resort anchor: pin to the editor's top-left so the peer is
          // still visible rather than silently dropped.
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

    compute();
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [editorRef, carets, content]);

  return (
    <div className="remote-cursors" aria-hidden>
      {Array.from(positions.entries()).map(([userId, pos]) => {
        const peer = peers.find((p) => p.id === userId);
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
