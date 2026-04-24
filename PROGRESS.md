# Implementation Progress

Tracks the 9 functional requirements of the text-editor app, phase by phase.
Each phase adds tests that prove a requirement passes or fails; failing requirements get implemented within the same phase.

Last updated: 2026-04-24 (Phase 3 complete)

## Summary

| # | Requirement | Phase | Status | Tests |
|---|---|---|---|---|
| 1 | Text input and display | 0 | ✅ Passing | 7/7 |
| 2 | Formatting (bold, italic, color, font size, lists, paragraphs) | 1 | ✅ Passing | 10/10 |
| 3 | Clear text | 2 | ✅ Passing | 6/6 |
| 4 | Save to localStorage | 3 | ✅ Passing | 17/17 |
| 5 | Word count | 4 | 🟡 Implemented, no tests | — |
| 6 | Collaborative editing + remote cursors | 5 | ❌ Not implemented (static avatar shell only) | — |
| 7 | Version history / revision archive | 6 | 🟡 Implemented, no tests | — |
| 8 | Review functionality (highlight reviewed text) | 7 | ❌ Not implemented | — |
| 9 | Comments (Word/Docs-style) | 8 | ❌ Not implemented | — |

Legend: ✅ Passing · 🟡 Implemented-but-untested · ⚠️ Partial · ❌ Not implemented

## Phase 0 — Setup + Requirement 1

- Test runner: **Vitest + @testing-library/react + @testing-library/jest-dom + jsdom**.
- Commands: `npm test` (watch) · `npm run test:run` (one-shot).
- Config: `vite.config.ts` (test block), `src/test/setup.ts`, `tsconfig.app.json` types.

### Requirement 1 — Text input and display
- **Status**: ✅ Passing
- **Phase**: 0
- **Test files**: `src/components/Editor.test.tsx`
- **Last run**: 2026-04-24, 7/7 tests passing
- **Notes**:
  - Covers: contenteditable rendering, empty-state, initial HTML display, typing fires `onChange`, typed text appears in DOM, external content prop re-syncs the DOM, identical content prop does **not** rewrite `innerHTML` (protects caret position).
  - Pre-existing lint errors in `src/App.tsx:30` and `src/hooks/useLocalStorage.ts:11` are unrelated to this phase and will be addressed in a later phase.

---

## Requirement 2 — Basic text formatting
- **Status**: ✅ Passing
- **Phase**: 1
- **Test files**: `src/components/Toolbar.test.tsx`
- **Last run**: 2026-04-24, 10/10 tests passing
- **Notes**:
  - Covers: bold, italic, color (foreColor), font size, bullet list, numbered list, paragraph, headings 1–3, placeholder no-op, active-state aria-pressed.
  - `FORMAT_COMMAND` now includes `foreColor`, `fontSize`, `insertUnorderedList`, `insertOrderedList`, `formatBlock`. Values live in `FONT_SIZE_VALUE` and `BLOCK_FORMAT` constants.
  - `applyFormat(cmd, value?)` takes an optional value; dispatches `document.execCommand(cmd, false, value)`.
  - `useSavedSelection(editorRef)` hook preserves the editor's selection through focus-stealing controls (color input, selects). Reused later in Phases 7–8.
  - `useActiveFormats` now tracks list state alongside bold/italic.

## Requirement 3 — Clear text
- **Status**: ✅ Passing
- **Phase**: 2
- **Test files**: `src/components/Toolbar.test.tsx`, `src/App.test.tsx`
- **Last run**: 2026-04-24, 6/6 tests passing (4 Toolbar unit + 2 App integration)
- **Notes**:
  - Covers: Clear button renders; `window.confirm(UI_PROMPT.CONFIRM_CLEAR)` fires; `onClear` runs on confirm; skipped on cancel; editor DOM empties end-to-end on confirm; editor preserved on cancel.
  - Integration test preseeds `STORAGE_KEYS.CONTENT` in localStorage, renders App, and asserts the contenteditable `innerHTML` transitions to `''`.
  - Added a localStorage polyfill in `src/test/setup.ts`: Node 25 ships an experimental global `localStorage` that shadows jsdom's Storage when `--localstorage-file` isn't configured, breaking `setItem`/`getItem`/`removeItem`/`clear`. Polyfill is only installed if `setItem` is missing.

## Requirement 4 — Save to localStorage
- **Status**: ✅ Passing
- **Phase**: 3
- **Test files**: `src/utils/storage.test.ts`, `src/hooks/useLocalStorage.test.tsx`, `src/App.test.tsx`
- **Last run**: 2026-04-24, 17/17 tests passing (7 storage util + 6 hook + 4 App integration)
- **Notes**:
  - Storage util: JSON round-trip, missing-key fallback, malformed-JSON fallback, silent `setItem` errors (quota), `removeKey`, key isolation.
  - `useLocalStorage` hook: initial fallback, reads existing on mount, persists on update, function updater, complex object JSON, cross-key isolation.
  - App integration: typing into contenteditable persists HTML to `STORAGE_KEYS.CONTENT`; remount restores content (simulated reload); Clear persists empty string; content edits don't touch `STORAGE_KEYS.VERSIONS`.

## Requirement 5 — Word count
- **Status**: 🟡 Implemented, no tests
- **Phase**: 4 (pending)
- **Test files**: —
- **Last run**: —
- **Notes**: `src/utils/wordCount.ts` (`htmlToText` + `countWords`) drives `src/components/WordCount.tsx`.

## Requirement 6 — Collaborative editing + remote cursors
- **Status**: ❌ Not implemented
- **Phase**: 5 (pending — design pass required)
- **Test files**: —
- **Last run**: —
- **Notes**: Static avatar badges in `src/App.tsx:51-76` are placeholders only. No WebSocket, CRDT, or cursor sync. Phase 5 will need a transport decision (Yjs + y-websocket vs mock/in-memory).

## Requirement 7 — Version history / revision archive
- **Status**: 🟡 Implemented, no tests
- **Phase**: 6 (pending)
- **Test files**: —
- **Last run**: —
- **Notes**: `src/hooks/useVersions.ts` manages `{id, name, content, createdAt}`; UI in `src/components/VersionList.tsx`. No diff/compare view.

## Requirement 8 — Review functionality
- **Status**: ❌ Not implemented
- **Phase**: 7 (pending — design pass required)
- **Test files**: —
- **Last run**: —
- **Notes**: Needs a data model (ranges + status), a highlight render layer, and a "completed" toggle that makes the marked text visible to others.

## Requirement 9 — Comments (Word/Docs-style)
- **Status**: ❌ Not implemented
- **Phase**: 8 (pending — design pass required)
- **Test files**: —
- **Last run**: —
- **Notes**: Needs anchored-range comments, thread UI overlay, and persistence. Will be the largest single phase alongside Phase 5.
