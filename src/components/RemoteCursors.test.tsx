import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RemoteCursors } from './RemoteCursors';
import type { Peer, RemoteCaret } from '../hooks/useCollab';

const ALEX: Peer = { id: 'alex', name: 'Alex', color: '#8b5cf6', lastSeen: 0 };
const JORDAN: Peer = { id: 'jordan', name: 'Jordan', color: '#10b981', lastSeen: 0 };

const originalRangeRect = Range.prototype.getBoundingClientRect;
const originalElementRect = Element.prototype.getBoundingClientRect;

beforeAll(() => {
  // jsdom returns zero rects by default; the component skips zero rects to
  // avoid placing ghost cursors during initial render. Stub non-zero rects so
  // the rendering branch is exercised in tests.
  Range.prototype.getBoundingClientRect = function () {
    return {
      x: 10,
      y: 20,
      width: 0,
      height: 18,
      top: 20,
      left: 10,
      right: 10,
      bottom: 38,
      toJSON: () => ({}),
    } as DOMRect;
  };
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      width: 800,
      height: 400,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

afterAll(() => {
  Range.prototype.getBoundingClientRect = originalRangeRect;
  Element.prototype.getBoundingClientRect = originalElementRect;
});

function setupEditor(html: string) {
  const editorRef = createRef<HTMLDivElement>();
  const Wrapper = (props: { carets: Map<string, RemoteCaret>; peers: Peer[] }) => (
    <div>
      <div
        ref={editorRef}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <RemoteCursors
        editorRef={editorRef as React.RefObject<HTMLDivElement | null>}
        carets={props.carets}
        peers={props.peers}
        content={html}
      />
    </div>
  );
  return Wrapper;
}

describe('RemoteCursors — Requirement 6: render remote carets', () => {
  it('renders a cursor element per peer with a known caret', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const carets = new Map<string, RemoteCaret>([
      ['alex', { userId: 'alex', offset: 5 }],
    ]);
    const { container } = render(<Wrapper carets={carets} peers={[ALEX]} />);

    const cursor = container.querySelector('[data-testid="remote-cursor-alex"]');
    expect(cursor).not.toBeNull();
    expect(cursor).toHaveAttribute('data-peer-name', 'Alex');
    expect(cursor).toHaveAttribute('data-peer-color', '#8b5cf6');
  });

  it('renders one cursor per peer when multiple peers have carets', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const carets = new Map<string, RemoteCaret>([
      ['alex', { userId: 'alex', offset: 3 }],
      ['jordan', { userId: 'jordan', offset: 7 }],
    ]);
    const { container } = render(<Wrapper carets={carets} peers={[ALEX, JORDAN]} />);

    expect(container.querySelector('[data-testid="remote-cursor-alex"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="remote-cursor-jordan"]')).not.toBeNull();
  });

  it('does not render a cursor when the peer is unknown', () => {
    const Wrapper = setupEditor('<p>hello</p>');
    const carets = new Map<string, RemoteCaret>([
      ['ghost', { userId: 'ghost', offset: 2 }],
    ]);
    const { container } = render(<Wrapper carets={carets} peers={[]} />);
    expect(container.querySelector('[data-testid^="remote-cursor-"]')).toBeNull();
  });

  it('clears cursors when carets become empty', () => {
    const Wrapper = setupEditor('<p>hello world</p>');
    const carets = new Map<string, RemoteCaret>([
      ['alex', { userId: 'alex', offset: 4 }],
    ]);
    const { container, rerender } = render(<Wrapper carets={carets} peers={[ALEX]} />);
    expect(container.querySelector('[data-testid="remote-cursor-alex"]')).not.toBeNull();

    act(() => {
      rerender(<Wrapper carets={new Map()} peers={[ALEX]} />);
    });
    expect(container.querySelector('[data-testid="remote-cursor-alex"]')).toBeNull();
  });

  it('still renders the cursor when getBoundingClientRect is all zeros but getClientRects has a usable entry', () => {
    const previousBounding = Range.prototype.getBoundingClientRect;
    const previousClientRects = Range.prototype.getClientRects;
    Range.prototype.getBoundingClientRect = function () {
      return {
        x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
    Range.prototype.getClientRects = function () {
      const rect = {
        x: 30, y: 40, width: 0, height: 16, top: 40, left: 30, right: 30, bottom: 56,
        toJSON: () => ({}),
      } as DOMRect;
      const list = [rect] as unknown as DOMRectList;
      (list as unknown as { length: number }).length = 1;
      return list;
    };

    try {
      const Wrapper = setupEditor('<p>collapsed range</p>');
      const carets = new Map<string, RemoteCaret>([
        ['alex', { userId: 'alex', offset: 2 }],
      ]);
      const { container } = render(<Wrapper carets={carets} peers={[ALEX]} />);
      const cursor = container.querySelector('[data-testid="remote-cursor-alex"]');
      expect(cursor).not.toBeNull();
    } finally {
      Range.prototype.getBoundingClientRect = previousBounding;
      Range.prototype.getClientRects = previousClientRects;
    }
  });

  it('falls back to the parent element rect when both Range rect APIs return zeros', () => {
    const previousBounding = Range.prototype.getBoundingClientRect;
    const previousClientRects = Range.prototype.getClientRects;
    Range.prototype.getBoundingClientRect = function () {
      return {
        x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
    Range.prototype.getClientRects = function () {
      const list = [] as unknown as DOMRectList;
      (list as unknown as { length: number }).length = 0;
      return list;
    };

    try {
      const Wrapper = setupEditor('<p>fallback target</p>');
      const carets = new Map<string, RemoteCaret>([
        ['alex', { userId: 'alex', offset: 3 }],
      ]);
      const { container } = render(<Wrapper carets={carets} peers={[ALEX]} />);
      // Element.prototype.getBoundingClientRect is stubbed in beforeAll to a
      // non-zero rect, so the parent fallback should produce a position.
      const cursor = container.querySelector('[data-testid="remote-cursor-alex"]');
      expect(cursor).not.toBeNull();
    } finally {
      Range.prototype.getBoundingClientRect = previousBounding;
      Range.prototype.getClientRects = previousClientRects;
    }
  });
});
