import { memo, useCallback, type ChangeEvent, type RefObject } from 'react';
import { APP_EVENT } from '../constants/events';
import {
  BLOCK_FORMAT,
  DEFAULT_TEXT_COLOR,
  FONT_SIZE_VALUE,
  FORMAT_COMMAND,
  type FormatCommand,
} from '../constants/formatCommands';
import { UI_LABEL, UI_PROMPT } from '../constants/ui';
import type { ActiveFormats } from '../hooks/useActiveFormats';
import { useSavedSelection } from '../hooks/useSavedSelection';
import { applyFormat } from '../utils/formatCommand';

function notifyFormatChange() {
  // Defer one tick so execCommand has fully updated queryCommandState before
  // useActiveFormats re-reads it.
  queueMicrotask(() => {
    document.dispatchEvent(new Event(APP_EVENT.FORMAT_CHANGE));
  });
}

type ToolbarProps = {
  onClear: () => void;
  activeFormats: ActiveFormats;
  editorRef: RefObject<HTMLDivElement | null>;
  onMarkReview?: () => void;
  onAddComment?: () => void;
};

function ToolbarImpl({
  onClear,
  activeFormats,
  editorRef,
  onMarkReview,
  onAddComment,
}: ToolbarProps) {
  const withSelection = useSavedSelection(editorRef);

  const handleClear = useCallback(() => {
    if (window.confirm(UI_PROMPT.CONFIRM_CLEAR)) {
      onClear();
    }
  }, [onClear]);

  const toggle = useCallback((cmd: FormatCommand) => {
    applyFormat(cmd);
    notifyFormatChange();
  }, []);

  const handleColor = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      withSelection(() => applyFormat(FORMAT_COMMAND.FORE_COLOR, value));
      notifyFormatChange();
    },
    [withSelection],
  );

  const handleFontSize = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (!value) return;
      withSelection(() => applyFormat(FORMAT_COMMAND.FONT_SIZE, value));
      notifyFormatChange();
      e.currentTarget.value = '';
    },
    [withSelection],
  );

  const handleBlockFormat = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (!value) return;
      withSelection(() => applyFormat(FORMAT_COMMAND.FORMAT_BLOCK, value));
      notifyFormatChange();
      e.currentTarget.value = '';
    },
    [withSelection],
  );

  const boldActive = activeFormats[FORMAT_COMMAND.BOLD];
  const italicActive = activeFormats[FORMAT_COMMAND.ITALIC];
  const ulActive = activeFormats[FORMAT_COMMAND.INSERT_UNORDERED_LIST];
  const olActive = activeFormats[FORMAT_COMMAND.INSERT_ORDERED_LIST];

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="toolbar__group">
        <button
          type="button"
          className={`toolbar__btn toolbar__btn--bold${boldActive ? ' toolbar__btn--active' : ''}`}
          aria-label="Bold (Cmd+B)"
          aria-pressed={boldActive}
          onMouseDown={(e) => {
            e.preventDefault();
            toggle(FORMAT_COMMAND.BOLD);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
          <span className="toolbar__hint">Bold · Cmd+B</span>
        </button>
        <button
          type="button"
          className={`toolbar__btn toolbar__btn--italic${italicActive ? ' toolbar__btn--active' : ''}`}
          aria-label="Italic (Cmd+I)"
          aria-pressed={italicActive}
          onMouseDown={(e) => {
            e.preventDefault();
            toggle(FORMAT_COMMAND.ITALIC);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4"/>
            <line x1="14" y1="20" x2="5" y2="20"/>
            <line x1="15" y1="4" x2="9" y2="20"/>
          </svg>
          <span className="toolbar__hint">Italic · Cmd+I</span>
        </button>
      </div>

      <div className="toolbar__group">
        <label className="toolbar__color-wrap">
          <span className="toolbar__color-swatch" aria-hidden="true">A</span>
          <input
            type="color"
            className="toolbar__color"
            aria-label={UI_LABEL.COLOR}
            defaultValue={DEFAULT_TEXT_COLOR}
            onChange={handleColor}
          />
        </label>
        <select
          className="toolbar__select"
          aria-label={UI_LABEL.FONT_SIZE}
          defaultValue=""
          onChange={handleFontSize}
        >
          <option value="" disabled>{UI_LABEL.FONT_SIZE}</option>
          <option value={FONT_SIZE_VALUE.SMALL}>{UI_LABEL.FONT_SIZE_SMALL}</option>
          <option value={FONT_SIZE_VALUE.NORMAL}>{UI_LABEL.FONT_SIZE_NORMAL}</option>
          <option value={FONT_SIZE_VALUE.LARGE}>{UI_LABEL.FONT_SIZE_LARGE}</option>
          <option value={FONT_SIZE_VALUE.HUGE}>{UI_LABEL.FONT_SIZE_HUGE}</option>
        </select>
      </div>

      <div className="toolbar__group">
        <button
          type="button"
          className={`toolbar__btn toolbar__btn--ul${ulActive ? ' toolbar__btn--active' : ''}`}
          aria-label={UI_LABEL.BULLET_LIST}
          aria-pressed={ulActive}
          onMouseDown={(e) => {
            e.preventDefault();
            toggle(FORMAT_COMMAND.INSERT_UNORDERED_LIST);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6"/>
            <line x1="9" y1="12" x2="20" y2="12"/>
            <line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4.5" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="4.5" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="4.5" cy="18" r="1.5" fill="currentColor"/>
          </svg>
          <span className="toolbar__hint">{UI_LABEL.BULLET_LIST}</span>
        </button>
        <button
          type="button"
          className={`toolbar__btn toolbar__btn--ol${olActive ? ' toolbar__btn--active' : ''}`}
          aria-label={UI_LABEL.NUMBERED_LIST}
          aria-pressed={olActive}
          onMouseDown={(e) => {
            e.preventDefault();
            toggle(FORMAT_COMMAND.INSERT_ORDERED_LIST);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="20" y2="6"/>
            <line x1="10" y1="12" x2="20" y2="12"/>
            <line x1="10" y1="18" x2="20" y2="18"/>
            <text x="3" y="8" fontSize="6" fill="currentColor" stroke="none">1</text>
            <text x="3" y="14" fontSize="6" fill="currentColor" stroke="none">2</text>
            <text x="3" y="20" fontSize="6" fill="currentColor" stroke="none">3</text>
          </svg>
          <span className="toolbar__hint">{UI_LABEL.NUMBERED_LIST}</span>
        </button>
        <select
          className="toolbar__select"
          aria-label={UI_LABEL.BLOCK_FORMAT}
          defaultValue=""
          onChange={handleBlockFormat}
        >
          <option value="" disabled>{UI_LABEL.BLOCK_FORMAT}</option>
          <option value={BLOCK_FORMAT.PARAGRAPH}>{UI_LABEL.BLOCK_PARAGRAPH}</option>
          <option value={BLOCK_FORMAT.HEADING_1}>{UI_LABEL.BLOCK_HEADING_1}</option>
          <option value={BLOCK_FORMAT.HEADING_2}>{UI_LABEL.BLOCK_HEADING_2}</option>
          <option value={BLOCK_FORMAT.HEADING_3}>{UI_LABEL.BLOCK_HEADING_3}</option>
        </select>
      </div>

      {(onMarkReview || onAddComment) && (
        <div className="toolbar__group">
          {onMarkReview && (
            <button
              type="button"
              className="toolbar__btn toolbar__btn--review"
              aria-label={UI_LABEL.MARK_REVIEWED}
              onMouseDown={(e) => {
                e.preventDefault();
                onMarkReview();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span className="toolbar__hint">{UI_LABEL.MARK_REVIEWED}</span>
            </button>
          )}
          {onAddComment && (
            <button
              type="button"
              className="toolbar__btn toolbar__btn--comment"
              aria-label={UI_LABEL.ADD_COMMENT}
              onMouseDown={(e) => {
                e.preventDefault();
                onAddComment();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span className="toolbar__hint">{UI_LABEL.ADD_COMMENT}</span>
            </button>
          )}
        </div>
      )}

      <span className="toolbar__spacer" />
      <button
        type="button"
        className="toolbar__btn toolbar__btn--clear"
        onClick={handleClear}
        aria-label="Clear all content"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,6 5,6 21,6"/>
          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
        </svg>
        {UI_LABEL.CLEAR}
      </button>
    </div>
  );
}

export const Toolbar = memo(ToolbarImpl);
