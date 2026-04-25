import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionList } from './VersionList';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';
import type { Version } from '../hooks/useVersions';

function v(overrides: Partial<Version> = {}): Version {
  return {
    id: 'v1',
    name: 'A version',
    content: '<p>content</p>',
    createdAt: Date.now(),
    ...overrides,
  };
}

function renderList(overrides: Partial<React.ComponentProps<typeof VersionList>> = {}) {
  const props = {
    versions: overrides.versions ?? [],
    currentContent: overrides.currentContent ?? '<p>current</p>',
    onSave: overrides.onSave ?? vi.fn(),
    onRestore: overrides.onRestore ?? vi.fn(),
    onDelete: overrides.onDelete ?? vi.fn(),
  };
  render(<VersionList {...props} />);
  return props;
}

describe('VersionList — Requirement 7: version history UI', () => {
  let promptSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    promptSpy = vi.spyOn(window, 'prompt');
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    promptSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it('renders the heading and an empty state when there are no versions', () => {
    renderList();
    expect(screen.getByRole('heading', { name: UI_LABEL.VERSIONS_HEADING })).toBeInTheDocument();
    expect(screen.getByText(/no versions yet/i)).toBeInTheDocument();
  });

  it('renders one entry per version with name and Restore/Delete actions', () => {
    renderList({
      versions: [
        v({ id: '1', name: 'First' }),
        v({ id: '2', name: 'Second' }),
      ],
    });
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: UI_LABEL.RESTORE })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: UI_LABEL.DELETE })).toHaveLength(2);
  });

  it('save flow: prompts for a name and forwards (name, currentContent) to onSave', () => {
    promptSpy.mockReturnValue('my snapshot');
    const { onSave } = renderList({ currentContent: '<p>snapshot body</p>' });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.SAVE_VERSION }));

    expect(promptSpy).toHaveBeenCalledWith(UI_PROMPT.ASK_VERSION_NAME, '');
    expect(onSave).toHaveBeenCalledWith('my snapshot', '<p>snapshot body</p>');
  });

  it('save flow: cancelling the prompt does not call onSave', () => {
    promptSpy.mockReturnValue(null);
    const { onSave } = renderList();

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.SAVE_VERSION }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('save flow: empty string still calls onSave (the hook trims/falls back to "Untitled")', () => {
    promptSpy.mockReturnValue('');
    const { onSave } = renderList({ currentContent: '<p>x</p>' });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.SAVE_VERSION }));

    expect(onSave).toHaveBeenCalledWith('', '<p>x</p>');
  });

  it('Restore calls onRestore with the version content', () => {
    const { onRestore } = renderList({
      versions: [v({ id: '1', name: 'Snap', content: '<p>restored html</p>' })],
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.RESTORE }));

    expect(onRestore).toHaveBeenCalledWith('<p>restored html</p>');
  });

  it('Delete asks confirmation and calls onDelete with the version id when confirmed', () => {
    confirmSpy.mockReturnValue(true);
    const { onDelete } = renderList({
      versions: [v({ id: 'to-delete', name: 'Bye' })],
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.DELETE }));

    expect(confirmSpy).toHaveBeenCalledWith(UI_PROMPT.CONFIRM_DELETE_VERSION);
    expect(onDelete).toHaveBeenCalledWith('to-delete');
  });

  it('Delete does NOT call onDelete when the user cancels the confirmation', () => {
    confirmSpy.mockReturnValue(false);
    const { onDelete } = renderList({
      versions: [v({ id: 'safe', name: 'Stay' })],
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABEL.DELETE }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('renders "Untitled" for a version whose name is an empty string', () => {
    renderList({ versions: [v({ id: '1', name: '' })] });
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});
