import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEYS } from './constants/storageKeys';
import { UI_LABEL } from './constants/ui';

const getEditor = () => screen.getByRole('textbox', { name: UI_LABEL.APP_TITLE });

function clearAppStorage() {
  Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
}

function installExecCommand() {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(true),
  });
}

function uninstallExecCommand() {
  Reflect.deleteProperty(document, 'execCommand');
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
