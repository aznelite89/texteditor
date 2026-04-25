import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Editor } from './Editor';
import { UI_LABEL } from '../constants/ui';

const getEditor = () => screen.getByRole('textbox', { name: UI_LABEL.APP_TITLE });

function ControlledEditor({ initial = '' }: { initial?: string }) {
  const [content, setContent] = useState(initial);
  return <Editor content={content} onChange={setContent} />;
}

describe('Editor — Requirement 1: text input and display', () => {
  it('renders a contenteditable textbox labeled as the app title', () => {
    render(<Editor content="" onChange={() => {}} />);
    const editor = getEditor();
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(editor.tagName).toBe('DIV');
  });

  it('renders an empty editor when content is an empty string', () => {
    render(<Editor content="" onChange={() => {}} />);
    const editor = getEditor();
    expect(editor.innerHTML).toBe('');
    expect(editor.textContent).toBe('');
  });

  it('renders the initial HTML content passed in via the content prop', () => {
    render(<Editor content="<p>seed</p>" onChange={() => {}} />);
    const editor = getEditor();
    expect(editor.innerHTML).toBe('<p>seed</p>');
    expect(editor).toHaveTextContent('seed');
  });

  it('invokes onChange with the latest HTML as the user types', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Editor content="" onChange={handleChange} />);
    const editor = getEditor();

    await user.click(editor);
    await user.keyboard('hello');

    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).toContain('hello');
  });

  it('displays typed text in the DOM when rendered in a controlled wrapper', async () => {
    const user = userEvent.setup();
    render(<ControlledEditor />);
    const editor = getEditor();

    await user.click(editor);
    await user.keyboard('world');

    expect(editor).toHaveTextContent('world');
  });

  it('re-syncs the DOM when the content prop changes externally (e.g., version restore)', () => {
    const { rerender } = render(<Editor content="<p>before</p>" onChange={() => {}} />);
    const editor = getEditor();
    expect(editor.innerHTML).toBe('<p>before</p>');

    rerender(<Editor content="<p>after</p>" onChange={() => {}} />);
    expect(editor.innerHTML).toBe('<p>after</p>');
  });

  it('emits onCaretChange on mouseup (click) even when selectionchange does not fire', async () => {
    const handleCaret = vi.fn();
    render(<Editor content="<p>hello world</p>" onChange={() => {}} onCaretChange={handleCaret} />);
    const editor = getEditor();

    // Place a Range explicitly, then dispatch mouseup. Importantly we do NOT
    // dispatch a selectionchange event, mirroring browsers where a click that
    // doesn't actually move the caret skips selectionchange.
    const text = editor.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 6);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.mouseUp(editor);

    await waitFor(() => {
      expect(handleCaret).toHaveBeenCalled();
    });
    expect(handleCaret.mock.calls.at(-1)?.[0]).toBe(6);
  });

  it('emits onCaretChange on focus (covers focus paths where the same range is restored)', async () => {
    const handleCaret = vi.fn();
    render(<Editor content="<p>focus me</p>" onChange={() => {}} onCaretChange={handleCaret} />);
    const editor = getEditor();

    const text = editor.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 5);
    range.setEnd(text, 5);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    fireEvent.focus(editor);

    await waitFor(() => {
      expect(handleCaret).toHaveBeenCalled();
    });
    expect(handleCaret.mock.calls.at(-1)?.[0]).toBe(5);
  });

  it('does NOT rewrite innerHTML when the incoming content prop matches the current DOM', () => {
    const { rerender } = render(<Editor content="<p>same</p>" onChange={() => {}} />);
    const editor = getEditor();

    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    const setterSpy = vi.fn(descriptor.set!);
    Object.defineProperty(Element.prototype, 'innerHTML', {
      ...descriptor,
      set: setterSpy,
    });

    try {
      rerender(<Editor content="<p>same</p>" onChange={() => {}} />);
      expect(setterSpy).not.toHaveBeenCalled();
      expect(editor.innerHTML).toBe('<p>same</p>');
    } finally {
      Object.defineProperty(Element.prototype, 'innerHTML', descriptor);
    }
  });
});
