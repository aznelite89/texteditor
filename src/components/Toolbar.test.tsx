import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toolbar } from './Toolbar';
import {
  BLOCK_FORMAT,
  FONT_SIZE_VALUE,
  FORMAT_COMMAND,
} from '../constants/formatCommands';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';
import type { ActiveFormats } from '../hooks/useActiveFormats';

const INACTIVE: ActiveFormats = {
  [FORMAT_COMMAND.BOLD]: false,
  [FORMAT_COMMAND.ITALIC]: false,
  [FORMAT_COMMAND.INSERT_UNORDERED_LIST]: false,
  [FORMAT_COMMAND.INSERT_ORDERED_LIST]: false,
};

function renderToolbar(overrides: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const editorRef = overrides.editorRef ?? createRef<HTMLDivElement>();
  const onClear = overrides.onClear ?? vi.fn();
  const activeFormats = overrides.activeFormats ?? INACTIVE;
  return render(
    <Toolbar
      onClear={onClear}
      activeFormats={activeFormats}
      editorRef={editorRef as React.RefObject<HTMLDivElement | null>}
    />,
  );
}

describe('Toolbar — Requirement 2: basic text formatting', () => {
  let execSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom no longer provides document.execCommand; stub it per test.
    execSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      writable: true,
      value: execSpy,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'execCommand');
  });

  it('dispatches bold when the Bold button is pressed', () => {
    renderToolbar();
    fireEvent.mouseDown(screen.getByRole('button', { name: /bold/i }));
    expect(execSpy).toHaveBeenCalledWith(FORMAT_COMMAND.BOLD, false, undefined);
  });

  it('dispatches italic when the Italic button is pressed', () => {
    renderToolbar();
    fireEvent.mouseDown(screen.getByRole('button', { name: /italic/i }));
    expect(execSpy).toHaveBeenCalledWith(FORMAT_COMMAND.ITALIC, false, undefined);
  });

  it('dispatches foreColor with the chosen hex when the color input changes', () => {
    renderToolbar();
    const colorInput = screen.getByLabelText(UI_LABEL.COLOR) as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(execSpy).toHaveBeenCalledWith(FORMAT_COMMAND.FORE_COLOR, false, '#ff0000');
  });

  it('dispatches fontSize with the chosen size when the font size select changes', () => {
    renderToolbar();
    const sizeSelect = screen.getByLabelText(UI_LABEL.FONT_SIZE) as HTMLSelectElement;
    fireEvent.change(sizeSelect, { target: { value: FONT_SIZE_VALUE.LARGE } });
    expect(execSpy).toHaveBeenCalledWith(
      FORMAT_COMMAND.FONT_SIZE,
      false,
      FONT_SIZE_VALUE.LARGE,
    );
  });

  it('dispatches insertUnorderedList when the bullet list button is pressed', () => {
    renderToolbar();
    fireEvent.mouseDown(screen.getByRole('button', { name: UI_LABEL.BULLET_LIST }));
    expect(execSpy).toHaveBeenCalledWith(
      FORMAT_COMMAND.INSERT_UNORDERED_LIST,
      false,
      undefined,
    );
  });

  it('dispatches insertOrderedList when the numbered list button is pressed', () => {
    renderToolbar();
    fireEvent.mouseDown(screen.getByRole('button', { name: UI_LABEL.NUMBERED_LIST }));
    expect(execSpy).toHaveBeenCalledWith(
      FORMAT_COMMAND.INSERT_ORDERED_LIST,
      false,
      undefined,
    );
  });

  it('dispatches formatBlock=P when Paragraph is chosen from the block format select', () => {
    renderToolbar();
    const blockSelect = screen.getByLabelText(UI_LABEL.BLOCK_FORMAT) as HTMLSelectElement;
    fireEvent.change(blockSelect, { target: { value: BLOCK_FORMAT.PARAGRAPH } });
    expect(execSpy).toHaveBeenCalledWith(
      FORMAT_COMMAND.FORMAT_BLOCK,
      false,
      BLOCK_FORMAT.PARAGRAPH,
    );
  });

  it('dispatches formatBlock=H1 when Heading 1 is chosen from the block format select', () => {
    renderToolbar();
    const blockSelect = screen.getByLabelText(UI_LABEL.BLOCK_FORMAT) as HTMLSelectElement;
    fireEvent.change(blockSelect, { target: { value: BLOCK_FORMAT.HEADING_1 } });
    expect(execSpy).toHaveBeenCalledWith(
      FORMAT_COMMAND.FORMAT_BLOCK,
      false,
      BLOCK_FORMAT.HEADING_1,
    );
  });

  it('does not dispatch anything when the block format select is re-set to the placeholder', () => {
    renderToolbar();
    const blockSelect = screen.getByLabelText(UI_LABEL.BLOCK_FORMAT) as HTMLSelectElement;
    fireEvent.change(blockSelect, { target: { value: '' } });
    expect(execSpy).not.toHaveBeenCalled();
  });

  it('reflects active bold/italic/list state via aria-pressed', () => {
    renderToolbar({
      activeFormats: {
        [FORMAT_COMMAND.BOLD]: true,
        [FORMAT_COMMAND.ITALIC]: false,
        [FORMAT_COMMAND.INSERT_UNORDERED_LIST]: true,
        [FORMAT_COMMAND.INSERT_ORDERED_LIST]: false,
      },
    });
    expect(screen.getByRole('button', { name: /bold/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /italic/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: UI_LABEL.BULLET_LIST })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: UI_LABEL.NUMBERED_LIST })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Toolbar — Requirement 3: clear text', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('renders a Clear button with an accessible label', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('shows the confirmation prompt when the Clear button is clicked', () => {
    confirmSpy.mockReturnValue(false);
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(confirmSpy).toHaveBeenCalledWith(UI_PROMPT.CONFIRM_CLEAR);
  });

  it('invokes onClear when the user confirms the dialog', () => {
    confirmSpy.mockReturnValue(true);
    const onClear = vi.fn();
    renderToolbar({ onClear });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does NOT invoke onClear when the user cancels the dialog', () => {
    confirmSpy.mockReturnValue(false);
    const onClear = vi.fn();
    renderToolbar({ onClear });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).not.toHaveBeenCalled();
  });
});
