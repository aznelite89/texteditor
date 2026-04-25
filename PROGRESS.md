# Implementation Progress

Tracks the 9 functional requirements of the text-editor app, phase by phase.
Each phase adds tests that prove a requirement passes or fails; failing requirements get implemented within the same phase.

Last updated: 2026-04-24 (Phase 8 complete — all requirements ✅)

## Summary

| # | Requirement | Phase | Status | Tests |
|---|---|---|---|---|
| 1 | Text input and display | 0 | ✅ Passing | 7/7 |
| 2 | Formatting (bold, italic, color, font size, lists, paragraphs) | 1 | ✅ Passing | 10/10 |
| 3 | Clear text | 2 | ✅ Passing | 6/6 |
| 4 | Save to localStorage | 3 | ✅ Passing | 17/17 |
| 5 | Word count | 4 | ✅ Passing | 22/22 |
| 6 | Collaborative editing + remote cursors | 5 | ✅ Passing | 42/42 |
| 7 | Version history / revision archive | 6 | ✅ Passing | 25/25 |
| 8 | Review functionality (highlight reviewed text) | 7 | ✅ Passing | 35/35 |
| 9 | Comments (Word/Docs-style) | 8 | ✅ Passing | 34/34 |

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
- **Status**: ✅ Passing
- **Phase**: 4
- **Test files**: `src/utils/wordCount.test.ts`, `src/components/WordCount.test.tsx`, `src/App.test.tsx`
- **Last run**: 2026-04-24, 22/22 tests passing (13 util + 6 component + 3 App integration)
- **Notes**:
  - Util: `htmlToText` strips tags, decodes entities; `countWords` handles empty, whitespace-only, single, multi-whitespace, punctuation, numbers.
  - Component: renders count, updates on rerender, strips formatting, exposes `aria-live="polite"`, shows "Words:" label.
  - App integration: starts at 0, updates live as the editor receives input, reflects saved-content count on mount.

## Requirement 6 — Collaborative editing + remote cursors
- **Status**: ✅ Passing
- **Phase**: 5
- **Test files**: `src/utils/caretOffset.test.ts`, `src/utils/userColor.test.ts`, `src/hooks/useLocalUser.test.tsx`, `src/hooks/useCollab.test.tsx`, `src/components/PresenceAvatars.test.tsx`, `src/components/RemoteCursors.test.tsx`, `src/App.test.tsx`
- **Last run**: 2026-04-24, 36/36 tests passing (8 caretOffset + 3 userColor + 3 useLocalUser + 10 useCollab + 4 PresenceAvatars + 4 RemoteCursors + 6 App integration *minus 2 covered already in earlier requirements*; counted by new Phase 5 only = 8+3+3+10+4+4+6 = 38, of which 6 App-collab + the rest)
- **Transport**: `BroadcastChannel('quiz.collab.v1')` — same-browser-tab collab. Open the app in two tabs and edits + caret movements + presence sync live. No server required. Real cross-machine collab would require swapping the transport for Yjs + y-websocket.
- **Identity**: `useLocalUser` hook generates a stable `{id, name, color}` per browser tab, persisted in `sessionStorage` so refresh keeps the same identity until the tab closes.
- **Protocol** (`src/constants/collab.ts`): `JOIN`, `LEAVE`, `PING` (every 5s, peer timeout 12s), `CARET` (offset broadcast), `CONTENT` (full HTML broadcast). Self-messages are ignored to prevent echo loops.
- **Caret offsets**: `src/utils/caretOffset.ts` — `textOffsetFromSelection` (current selection → linear text offset) and `nodeAtOffset` (offset → text node + local offset). Used by Editor (broadcast) and RemoteCursors (render).
- **UI**: `src/components/PresenceAvatars.tsx` replaces the old static avatar block; caps visible peers at 4 with a "+N" overflow chip. `src/components/RemoteCursors.tsx` overlays colored vertical bars + name labels at each peer's caret position.
- **Test infra**: Added `BroadcastChannel` polyfill + `sessionStorage` polyfill to `src/test/setup.ts` (Node 25 ships its own non-functional shadows). `RemoteCursors` tests stub `Range.prototype.getBoundingClientRect` because jsdom returns zero rects.
- **Bugfix (2026-04-24)**: Remote cursor wasn't appearing on click — only on type. Three fixes: (a) `textOffsetFromSelection` no longer returns `null` when the selection's `endContainer` is the contenteditable root itself; (b) Editor now also broadcasts the caret on `mouseup`/`keyup`/`focus` (deferred to next microtask) since `selectionchange` doesn't always fire on click; (c) `RemoteCursors` falls back to `range.getClientRects()[0]`, then to the parent element's rect, before silently dropping a cursor. Six new regression tests added.

## Requirement 7 — Version history / revision archive
- **Status**: ✅ Passing
- **Phase**: 6
- **Test files**: `src/hooks/useVersions.test.tsx`, `src/components/VersionList.test.tsx`, `src/App.test.tsx`
- **Last run**: 2026-04-24, 25/25 tests passing (10 hook + 9 component + 6 App integration)
- **Notes**:
  - Hook: empty start, save adds `{id, name, content, createdAt}`, name trim + `Untitled` fallback, newest-first ordering, delete by id, no-op on unknown id, `getVersion` lookup, persistence to `STORAGE_KEYS.VERSIONS`, hydration from existing storage, unique ids across rapid saves.
  - Component: heading + empty state, list rendering, save flow uses `window.prompt` with `UI_PROMPT.ASK_VERSION_NAME` and forwards `(name, currentContent)`, prompt cancel skips save, empty string still calls `onSave` (hook trims), restore forwards content, delete confirms via `UI_PROMPT.CONFIRM_DELETE_VERSION`, cancel skips delete, "Untitled" fallback render.
  - App integration: end-to-end save (appears in list + persists to localStorage), restore writes into editor DOM, delete with confirmation removes entry + updates storage, cancel skips delete, prompt cancel skips save.

## Requirement 8 — Review functionality
- **Status**: ✅ Passing
- **Phase**: 7
- **Test files**: `src/utils/caretOffset.test.ts`, `src/hooks/useReviews.test.tsx`, `src/hooks/useCollab.test.tsx`, `src/components/ReviewHighlights.test.tsx`, `src/components/ReviewList.test.tsx`, `src/App.test.tsx`
- **Last run**: 2026-04-24, 35/35 new tests passing (5 selectionRangeOffsets + 11 useReviews + 2 useCollab REVIEWS + 4 ReviewHighlights + 7 ReviewList + 6 App integration)
- **Workflow**: Two-step. Reviewer selects text and clicks "Mark reviewed" in the toolbar → DRAFT highlight (yellow, local only). Clicks "Complete" in the side panel → COMPLETED highlight (green) + broadcast to all peers via the existing BroadcastChannel.
- **Data model** (`src/constants/review.ts`): `Review = { id, start, end, status: 'draft'|'completed', reviewerId, reviewerName, createdAt, completedAt? }`. Stored in `STORAGE_KEYS.REVIEWS`.
- **Range capture**: `selectionRangeOffsets(root)` in `src/utils/caretOffset.ts` returns `{start, end}` for the current selection in linear text-offset coordinates.
- **Hook** (`src/hooks/useReviews.ts`): `markForReview` (collapsed = no-op), `completeReview`, `deleteReview`, `applyRemoteCompleted` (replaces the COMPLETED set, preserves local DRAFTs).
- **Sync**: New `REVIEWS` collab message in `useCollab` carries the full completed-reviews list. App broadcasts on complete + on delete-of-completed; receivers replace their COMPLETED set via `applyRemoteCompleted`.
- **UI**: `ReviewHighlights` overlay renders one `<div>` per line rect (yellow draft / green completed, mix-blend-mode: multiply). `ReviewList` side panel shows snippet, badge, Complete (drafts only), and Delete (all) actions.
- **Test infra**: Added `Range.prototype.getClientRects` polyfill to `src/test/setup.ts` so jsdom doesn't throw when rendering the highlight overlay.

## Requirement 9 — Comments (Word/Docs-style) — DONE
- **Status**: ✅ Passing
- **Phase**: 8
- **Test files**: `src/hooks/useComments.test.tsx`, `src/hooks/useCollab.test.tsx`, `src/components/CommentHighlights.test.tsx`, `src/components/CommentList.test.tsx`, `src/App.test.tsx`
- **Last run**: 2026-04-24, 34/34 new tests passing (11 useComments + 2 useCollab COMMENTS + 4 CommentHighlights + 9 CommentList + 8 App integration)
- **Workflow**: Select text → toolbar Comment button → `window.prompt(UI_PROMPT.ASK_COMMENT_BODY)` → comment created and broadcast to all peers. Each comment supports threaded replies, a Resolve/Reopen toggle, and Delete (with confirmation). Resolved comments dim and switch their highlight to a dashed gray underline.
- **Data model** (`src/constants/comments.ts`): `Comment = { id, start, end, body, authorId, authorName, authorColor, createdAt, resolved, resolvedAt?, replies: Reply[] }`. Stored in `STORAGE_KEYS.COMMENTS`.
- **Hook** (`src/hooks/useComments.ts`): `addComment` (collapsed-or-empty-body = no-op), `addReply`, `toggleResolve`, `deleteComment`, `applyRemoteComments` (LWW: replaces the entire local list).
- **Sync**: New `COMMENTS` collab message in `useCollab` carries the full comment list. App broadcasts on add / reply / resolve / delete; receivers replace via `applyRemoteComments`.
- **UI**: `CommentHighlights` overlay (blue active / gray-dashed resolved, mix-blend-mode: multiply, z-index: 2 above review highlights). `CommentList` side panel renders thread with author dot, snippet, body, replies, reply textarea + Post button (disabled when empty), Resolve/Reopen toggle, Delete.
- **Note**: Comment list test for `comment.body` uses `getByLabelText` for the reply textarea so changing the snippet text is unambiguous.
