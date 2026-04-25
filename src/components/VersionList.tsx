import { memo, useCallback } from 'react';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';
import type { Version } from '../hooks/useVersions';

function formatRelative(createdAt: number, now: number = Date.now()): string {
  const diffMs = now - createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const date = new Date(createdAt);
  const nowDate = new Date(now);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== nowDate.getFullYear() ? 'numeric' : undefined,
  });
}

type VersionListProps = {
  versions: Version[];
  currentContent: string;
  onSave: (name: string, content: string) => void;
  onRestore: (content: string) => void;
  onDelete: (id: string) => void;
};

function VersionListImpl({
  versions,
  currentContent,
  onSave,
  onRestore,
  onDelete,
}: VersionListProps) {
  const handleSave = useCallback(() => {
    const name = window.prompt(UI_PROMPT.ASK_VERSION_NAME, '');
    if (name === null) return;
    onSave(name, currentContent);
  }, [onSave, currentContent]);

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm(UI_PROMPT.CONFIRM_DELETE_VERSION)) {
        onDelete(id);
      }
    },
    [onDelete],
  );

  return (
    <aside className="versions">
      <div className="versions__header">
        <h2 className="versions__heading">{UI_LABEL.VERSIONS_HEADING}</h2>
        <button
          type="button"
          className="versions__save"
          onClick={handleSave}
        >
          {UI_LABEL.SAVE_VERSION}
        </button>
      </div>
      {versions.length === 0 ? (
        <div className="versions__empty">
          <div className="versions__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <p className="versions__empty-text">No versions yet</p>
          <p className="versions__empty-hint">Your saved versions will appear here</p>
        </div>
      ) : (
        <ul className="versions__list">
          {versions.map((v) => (
            <li key={v.id} className="versions__item">
              <div className="versions__meta">
                <span className="versions__name">{v.name || 'Untitled'}</span>
                <time className="versions__time">
                  {formatRelative(v.createdAt)}
                </time>
              </div>
              <div className="versions__actions">
                <button
                  type="button"
                  onClick={() => onRestore(v.content)}
                >
                  {UI_LABEL.RESTORE}
                </button>
                <button type="button" onClick={() => handleDelete(v.id)}>
                  {UI_LABEL.DELETE}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export const VersionList = memo(VersionListImpl);
export default VersionList;
