import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
  COLLAB_CHANNEL,
  COLLAB_MESSAGE,
  SESSION_KEYS,
} from './constants/collab';
import { STORAGE_KEYS } from './constants/storageKeys';
import { UI_LABEL } from './constants/ui';
import type { CollabEnvelope } from './hooks/useCollab';

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
