import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
  COLLAB_CHANNEL,
  COLLAB_MESSAGE,
  SESSION_KEYS,
} from './constants/collab';
import { REVIEW_STATUS, type Review } from './constants/review';
import { STORAGE_KEYS } from './constants/storageKeys';
import { UI_LABEL } from './constants/ui';
import type { CollabEnvelope } from './hooks/useCollab';
import type { Version } from './hooks/useVersions';

const getEditor = () => screen.getByRole('textbox', { name: UI_LABEL.APP_TITLE });

function clearAppStorage() {
  Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
  Object.values(SESSION_KEYS).forEach((k) => {
    try {
      window.sessionStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function installExecCommand() {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(true),
  });
  Object.defineProperty(document, 'queryCommandState', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(false),
  });
}

function uninstallExecCommand() {
  Reflect.deleteProperty(document, 'execCommand');
  Reflect.deleteProperty(document, 'queryCommandState');
}

describe('App — Requirement 3: clear text end-to-end', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearAppStorage();
    installExecCommand();
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    clearAppStorage();
    uninstallExecCommand();
  });

  it('empties the editor after the user clicks Clear and confirms', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>hello world</p>'),
    );
    confirmSpy.mockReturnValue(true);

    render(<App />);

    const editor = getEditor();
    expect(editor).toHaveTextContent('hello world');

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(editor.innerHTML).toBe('');
    expect(editor.textContent).toBe('');
  });

  it('leaves the editor untouched when the user cancels the clear confirmation', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>keep me</p>'),
    );
    confirmSpy.mockReturnValue(false);

    render(<App />);

    const editor = getEditor();
    expect(editor).toHaveTextContent('keep me');

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(editor).toHaveTextContent('keep me');
    expect(editor.innerHTML).toBe('<p>keep me</p>');
  });
});

describe('App — Requirement 4: autosave to localStorage', () => {
  beforeEach(() => {
    clearAppStorage();
    installExecCommand();
  });

  afterEach(() => {
    clearAppStorage();
    uninstallExecCommand();
  });

  it('persists editor HTML to STORAGE_KEYS.CONTENT as the user edits', () => {
    render(<App />);

    const editor = getEditor();
    // Simulate the editor's onInput payload: contenteditable reports current innerHTML.
    editor.innerHTML = '<p>typing</p>';
    fireEvent.input(editor);

    expect(window.localStorage.getItem(STORAGE_KEYS.CONTENT)).toBe(
      JSON.stringify('<p>typing</p>'),
    );
  });

  it('restores the saved content after a remount (simulates reload)', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>restored after reload</p>'),
    );

    const first = render(<App />);
    expect(getEditor()).toHaveTextContent('restored after reload');
    first.unmount();

    render(<App />);
    expect(getEditor()).toHaveTextContent('restored after reload');
  });

  it('persists the empty string after Clear, so a reload shows an empty editor', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>before</p>'),
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(window.localStorage.getItem(STORAGE_KEYS.CONTENT)).toBe(JSON.stringify(''));
    confirmSpy.mockRestore();
  });

  it('uses the content key dedicated to the editor (not versions or other keys)', () => {
    render(<App />);
    const editor = getEditor();
    editor.innerHTML = '<p>key-scoped</p>';
    fireEvent.input(editor);

    expect(window.localStorage.getItem(STORAGE_KEYS.CONTENT)).toBe(
      JSON.stringify('<p>key-scoped</p>'),
    );
    // Versions key should not be touched by content edits.
    const versions = window.localStorage.getItem(STORAGE_KEYS.VERSIONS);
    expect(versions === null || versions === JSON.stringify([])).toBe(true);
  });
});

describe('App — Requirement 5: live word count', () => {
  beforeEach(() => {
    clearAppStorage();
    installExecCommand();
  });

  afterEach(() => {
    clearAppStorage();
    uninstallExecCommand();
  });

  it('shows 0 words when the editor is empty', () => {
    render(<App />);
    expect(screen.getByText(/words:/i).parentElement).toHaveTextContent('0');
  });

  it('updates the visible count live as the user edits the document', () => {
    render(<App />);
    const editor = getEditor();
    const getCountValue = () =>
      document.querySelector('.word-count__value')?.textContent;

    editor.innerHTML = '<p>one two three</p>';
    fireEvent.input(editor);
    expect(getCountValue()).toBe('3');

    editor.innerHTML = '<p>one two three four five six</p>';
    fireEvent.input(editor);
    expect(getCountValue()).toBe('6');
  });

  it('reflects the saved content count immediately on mount', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p><strong>alpha</strong> beta gamma delta</p>'),
    );
    render(<App />);
    expect(document.querySelector('.word-count__value')?.textContent).toBe('4');
  });
});

describe('App — Requirement 6: collaborative editing + presence', () => {
  let externalChannel: BroadcastChannel | null = null;

  beforeEach(() => {
    clearAppStorage();
    installExecCommand();
  });

  afterEach(() => {
    externalChannel?.close();
    externalChannel = null;
    clearAppStorage();
    uninstallExecCommand();
  });

  function makePeerEnvelope(
    type: CollabEnvelope['type'],
    extras?: Partial<CollabEnvelope>,
  ): CollabEnvelope {
    return {
      type,
      from: 'remote-peer',
      fromName: 'Remote',
      fromColor: '#10b981',
      ts: Date.now(),
      ...extras,
    } as CollabEnvelope;
  }

  it('always renders the local user avatar', () => {
    render(<App />);
    expect(screen.getByTestId('presence-local')).toBeInTheDocument();
  });

  it('adds a peer avatar when a remote JOIN message arrives', async () => {
    render(<App />);
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);

    externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.JOIN));

    await waitFor(() => {
      expect(screen.getByTestId('presence-peer-remote-peer')).toBeInTheDocument();
    });
    expect(screen.getByTestId('presence-peer-remote-peer')).toHaveAttribute(
      'title',
      'Remote',
    );
  });

  it('removes the peer avatar when a remote LEAVE message arrives', async () => {
    render(<App />);
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);

    externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.JOIN));
    await waitFor(() => {
      expect(screen.getByTestId('presence-peer-remote-peer')).toBeInTheDocument();
    });

    externalChannel.postMessage(makePeerEnvelope(COLLAB_MESSAGE.LEAVE));
    await waitFor(() => {
      expect(screen.queryByTestId('presence-peer-remote-peer')).toBeNull();
    });
  });

  it('applies remote CONTENT messages to the local editor', async () => {
    render(<App />);
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);

    externalChannel.postMessage(
      makePeerEnvelope(COLLAB_MESSAGE.CONTENT, { html: '<p>from peer</p>' }),
    );

    await waitFor(() => {
      expect(getEditor()).toHaveTextContent('from peer');
    });
  });

  it('broadcasts local edits to peers via a CONTENT message', async () => {
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    render(<App />);
    await flush();
    received.length = 0;

    const editor = getEditor();
    editor.innerHTML = '<p>local change</p>';
    fireEvent.input(editor);
    await flush();

    const content = received.find((m) => m.type === COLLAB_MESSAGE.CONTENT);
    expect(content).toBeDefined();
    if (content?.type === COLLAB_MESSAGE.CONTENT) {
      expect(content.html).toBe('<p>local change</p>');
    }
  });

  it('broadcasts a JOIN on mount so existing peers learn about the new user', async () => {
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    render(<App />);
    await flush();

    const join = received.find((m) => m.type === COLLAB_MESSAGE.JOIN);
    expect(join).toBeDefined();
  });

});

describe('App — Requirement 7: version history end-to-end', () => {
  let promptSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearAppStorage();
    installExecCommand();
    promptSpy = vi.spyOn(window, 'prompt');
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    promptSpy.mockRestore();
    confirmSpy.mockRestore();
    clearAppStorage();
    uninstallExecCommand();
  });

  it('saves the current editor content as a named version that appears in the list', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>snapshot body</p>'),
    );
    promptSpy.mockReturnValue('Draft v1');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.SAVE_VERSION }));

    expect(promptSpy).toHaveBeenCalled();
    expect(screen.getByText('Draft v1')).toBeInTheDocument();
  });

  it('persists the saved version to STORAGE_KEYS.VERSIONS', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>persisted</p>'),
    );
    promptSpy.mockReturnValue('Saved');

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.SAVE_VERSION }));

    const raw = window.localStorage.getItem(STORAGE_KEYS.VERSIONS);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Version[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Saved');
    expect(parsed[0].content).toBe('<p>persisted</p>');
  });

  it('restores a saved version into the editor', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>now editing</p>'),
    );
    const seeded: Version[] = [
      { id: 'old', name: 'Old draft', content: '<p>restored draft</p>', createdAt: 1 },
    ];
    window.localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(seeded));

    render(<App />);
    expect(getEditor()).toHaveTextContent('now editing');

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.RESTORE }));

    expect(getEditor()).toHaveTextContent('restored draft');
    expect(getEditor().innerHTML).toBe('<p>restored draft</p>');
  });

  it('deletes a version after confirmation', () => {
    const seeded: Version[] = [
      { id: 'a', name: 'Keep', content: 'k', createdAt: 1 },
      { id: 'b', name: 'Drop', content: 'd', createdAt: 2 },
    ];
    window.localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(seeded));
    confirmSpy.mockReturnValue(true);

    render(<App />);
    expect(screen.getByText('Drop')).toBeInTheDocument();

    // The first Delete button (newest-first ordering puts 'Drop' on top after re-sort,
    // but localStorage seeding preserves array order — find by row context).
    const dropRow = screen.getByText('Drop').closest('li')!;
    const deleteBtn = dropRow.querySelector('button:last-child')!;
    fireEvent.click(deleteBtn);

    expect(screen.queryByText('Drop')).toBeNull();
    expect(screen.getByText('Keep')).toBeInTheDocument();

    const raw = window.localStorage.getItem(STORAGE_KEYS.VERSIONS);
    const parsed = JSON.parse(raw as string) as Version[];
    expect(parsed.map((p) => p.name)).toEqual(['Keep']);
  });

  it('skips delete when the user cancels the confirmation', () => {
    const seeded: Version[] = [
      { id: 'a', name: 'Stay', content: 's', createdAt: 1 },
    ];
    window.localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(seeded));
    confirmSpy.mockReturnValue(false);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.DELETE }));

    expect(screen.getByText('Stay')).toBeInTheDocument();
  });

  it('cancelling the save prompt does not create a version', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>x</p>'),
    );
    promptSpy.mockReturnValue(null);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.SAVE_VERSION }));

    expect(screen.getByText(/no versions yet/i)).toBeInTheDocument();
    // useLocalStorage hydrates the key to its empty initial on mount; the
    // important assertion is that no entries were appended.
    const raw = window.localStorage.getItem(STORAGE_KEYS.VERSIONS);
    expect(raw === null || raw === JSON.stringify([])).toBe(true);
  });
});

describe('App — Requirement 8: review highlighting end-to-end', () => {
  let externalChannel: BroadcastChannel | null = null;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearAppStorage();
    installExecCommand();
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    externalChannel?.close();
    externalChannel = null;
    confirmSpy.mockRestore();
    clearAppStorage();
    uninstallExecCommand();
  });

  function selectRangeInEditor(editor: HTMLElement, start: number, end: number) {
    const text = editor.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, end);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  it('clicking Mark reviewed creates a DRAFT review with the local user', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>hello world</p>'),
    );
    render(<App />);
    const editor = getEditor();
    selectRangeInEditor(editor, 0, 5);

    fireEvent.mouseDown(screen.getByRole('button', { name: UI_LABEL.MARK_REVIEWED }));

    const raw = window.localStorage.getItem(STORAGE_KEYS.REVIEWS);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string) as Review[];
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe(REVIEW_STATUS.DRAFT);
    expect(stored[0].start).toBe(0);
    expect(stored[0].end).toBe(5);
  });

  it('clicking Mark reviewed with a collapsed selection does NOT create a review', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>hello</p>'),
    );
    render(<App />);
    const editor = getEditor();
    selectRangeInEditor(editor, 2, 2);

    fireEvent.mouseDown(screen.getByRole('button', { name: UI_LABEL.MARK_REVIEWED }));

    const raw = window.localStorage.getItem(STORAGE_KEYS.REVIEWS);
    const stored = raw ? (JSON.parse(raw) as Review[]) : [];
    expect(stored).toHaveLength(0);
  });

  it('Complete flips a draft to COMPLETED and broadcasts a REVIEWS message', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>hello world</p>'),
    );
    const seeded: Review[] = [
      {
        id: 'draft-1',
        start: 0,
        end: 5,
        status: REVIEW_STATUS.DRAFT,
        reviewerId: 'me',
        reviewerName: 'Mia',
        createdAt: 1,
      },
    ];
    window.localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(seeded));

    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    render(<App />);
    await flush();
    received.length = 0;

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.COMPLETE_REVIEW }));
    await flush();

    // Local state flipped to completed badge
    expect(screen.getByTestId('review-item-draft-1')).toHaveAttribute(
      'data-review-status',
      REVIEW_STATUS.COMPLETED,
    );

    await waitFor(() => {
      const env = received.find((m) => m.type === COLLAB_MESSAGE.REVIEWS);
      expect(env).toBeDefined();
    });
    const env = received.find((m) => m.type === COLLAB_MESSAGE.REVIEWS);
    if (env?.type === COLLAB_MESSAGE.REVIEWS) {
      expect(env.reviews).toHaveLength(1);
      expect(env.reviews[0].id).toBe('draft-1');
      expect(env.reviews[0].status).toBe(REVIEW_STATUS.COMPLETED);
    }
  });

  it('renders a review highlight overlay for a stored review', () => {
    // jsdom returns zero rects by default; the component skips zero rects.
    // Temporarily stub a non-zero rect so the highlight branch is exercised.
    const previousRects = Range.prototype.getClientRects;
    Range.prototype.getClientRects = function () {
      const r = {
        x: 10, y: 20, width: 60, height: 18, top: 20, left: 10, right: 70, bottom: 38,
        toJSON: () => ({}),
      } as DOMRect;
      const list = [r] as unknown as DOMRectList;
      (list as unknown as { length: number }).length = 1;
      return list;
    };

    try {
      window.localStorage.setItem(
        STORAGE_KEYS.CONTENT,
        JSON.stringify('<p>hello world</p>'),
      );
      const seeded: Review[] = [
        {
          id: 'visible',
          start: 0,
          end: 5,
          status: REVIEW_STATUS.DRAFT,
          reviewerId: 'me',
          reviewerName: 'Mia',
          createdAt: 1,
        },
      ];
      window.localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(seeded));

      const { container } = render(<App />);
      expect(container.querySelector('[data-testid="review-highlight-visible"]')).not.toBeNull();
    } finally {
      Range.prototype.getClientRects = previousRects;
    }
  });

  it('applies a remote REVIEWS message: peer-published completed reviews appear locally', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>hello world</p>'),
    );
    render(<App />);
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);

    const incoming: Review[] = [
      {
        id: 'peer-rev',
        start: 6,
        end: 11,
        status: REVIEW_STATUS.COMPLETED,
        reviewerId: 'peer-id',
        reviewerName: 'Peer',
        createdAt: 1,
        completedAt: 2,
      },
    ];
    externalChannel.postMessage({
      type: COLLAB_MESSAGE.REVIEWS,
      from: 'peer-id',
      fromName: 'Peer',
      fromColor: '#10b981',
      ts: Date.now(),
      reviews: incoming,
    });

    await waitFor(() => {
      expect(screen.getByTestId('review-item-peer-rev')).toBeInTheDocument();
    });
    expect(screen.getByTestId('review-item-peer-rev')).toHaveAttribute(
      'data-review-status',
      REVIEW_STATUS.COMPLETED,
    );
  });

  it('deletes a review after confirmation and persists the removal', () => {
    const seeded: Review[] = [
      {
        id: 'to-delete',
        start: 0,
        end: 4,
        status: REVIEW_STATUS.DRAFT,
        reviewerId: 'me',
        reviewerName: 'Mia',
        createdAt: 1,
      },
    ];
    window.localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(seeded));
    confirmSpy.mockReturnValue(true);

    render(<App />);
    expect(screen.getByTestId('review-item-to-delete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.DELETE_REVIEW }));

    expect(screen.queryByTestId('review-item-to-delete')).toBeNull();
    const raw = window.localStorage.getItem(STORAGE_KEYS.REVIEWS);
    const stored = raw ? (JSON.parse(raw) as Review[]) : [];
    expect(stored).toHaveLength(0);
  });
});

describe('App — Requirement 6 (collab) — additional', () => {
  let externalChannel: BroadcastChannel | null = null;

  beforeEach(() => {
    clearAppStorage();
    installExecCommand();
  });

  afterEach(() => {
    externalChannel?.close();
    externalChannel = null;
    clearAppStorage();
    uninstallExecCommand();
  });

  it('broadcasts a CARET message when the user clicks (mouseup) inside the editor', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONTENT,
      JSON.stringify('<p>hello world</p>'),
    );
    externalChannel = new BroadcastChannel(COLLAB_CHANNEL);
    const received: CollabEnvelope[] = [];
    externalChannel.addEventListener('message', (e) => received.push(e.data));

    render(<App />);
    await flush();
    received.length = 0;

    const editor = getEditor();
    const text = editor.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 4);
    range.setEnd(text, 4);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.mouseUp(editor);
    await flush();
    await flush();

    await waitFor(() => {
      const caret = received.find((m) => m.type === COLLAB_MESSAGE.CARET);
      expect(caret).toBeDefined();
    });
    const caret = received.find((m) => m.type === COLLAB_MESSAGE.CARET);
    if (caret?.type === COLLAB_MESSAGE.CARET) {
      expect(caret.offset).toBe(4);
    }
  });
});
