# Changelog

## 2026-04-25

### Changed
- README: add **Screenshots** section with two images (`./assets/app-screenshot.png`, `./assets/app-screenshot-comments.png`); use `./assets/` paths for reliable local preview
- Document how to run tests (`pnpm test`, `pnpm test:run`) in README

### Fixed
- `formatCommands`: `FORMAT_COMMAND` uses an explicit `FormatCommandMap`; `FONT_SIZE_VALUE` and `BLOCK_FORMAT` use merged `as const` slices (avoids truncated module / missing `FONT_SIZE_VALUE` in `Toolbar`)
- `applyFormat` (`src/utils/formatCommand.ts`): first parameter widened to `string` so optional `value` is not rejected when `FormatCommand` is mis-inferred
- `Editor`: export `EditorProps` and `memo(EditorImpl) as typeof EditorImpl` so `App` sees `onCaretChange` on the public API
- `Toolbar`: export `ToolbarProps` and use `memo<ToolbarProps>(ToolbarImpl)` so consumers (e.g. `App`) see the full prop surface including `editorRef`
- `UI_LABEL` / `UI_PROMPT`: split large `as const` literals in `src/constants/ui.ts` into merged slices so TypeScript no longer infers truncated types (missing comment/review/status keys)
- `STORAGE_KEY_*` named string literals in `src/constants/storageKeys.ts` (used by `useLocalStorage` callers) so TypeScript no longer infers a truncated `STORAGE_KEYS` object type missing `COMMENTS` / `REVIEWS` / `VERSIONS`
- `React.lazy` side panels: dynamic imports wrap named exports as `{ default: m.* }` so `lazy` matches TypeScript’s `import()` type under `verbatimModuleSyntax` / `erasableSyntaxOnly`
- TypeScript/IDE: Vitest `expect` now picks up `@testing-library/jest-dom` matchers (e.g. `toHaveAttribute`) via `src/vitest-dom.d.ts` and `tsconfig.app.json` `types` no longer loading the Jest-only entry
- App freeze / "page unresponsive" under typing + collab load — root causes: every render rebuilt the `collab` object so all child effects torn down + re-attached on every keystroke; the Editor's document `selectionchange` listener was reattached on every render; `broadcastContent` and `broadcastCaret` fired on every keystroke / cursor move with no batching; the highlight overlays remeasured the DOM on every render with no rAF coalescing; the "All changes saved" toast effect leaked its inner `setTimeout` (the cleanup was wrongly returned from inside the timer callback).

### Performance
- New `rafThrottle` utility (`src/utils/rafThrottle.ts`) coalesces rapid calls to one per animation frame with `cancel`/`flush`
- `useCollab`, `useReviews`, `useComments` return memoized objects so consumers depending on them don't re-subscribe / recreate callbacks on every parent render
- App now stores `collab` / `reviewsApi` / `commentsApi` / `setContent` in refs and uses stable `useCallback`s with empty/minimal deps; `broadcastContent` and `broadcastCaret` are rAF-throttled via the new util
- Editor uses ref-held `onCaretChange` / `onChange` callbacks; the document `selectionchange` listener attaches once for the component lifetime and is itself rAF-throttled
- `RemoteCursors`, `ReviewHighlights`, `CommentHighlights` now compute positions synchronously on first render but throttle resize/scroll recomputes via rAF, and skip empty `setHighlights` updates to avoid identity churn
- `React.memo` applied to `Editor`, `Toolbar`, `WordCount`, `PresenceAvatars`, `RemoteCursors`, `ReviewHighlights`, `CommentHighlights`, `ReviewList`, `CommentList`, `VersionList`
- Side-panel components (`ReviewList`, `CommentList`, `VersionList`) are now `React.lazy`-loaded under a `<Suspense>` boundary, splitting them into their own chunks (`ReviewList-*.js` ~1.6KB, `VersionList-*.js` ~2.1KB, `CommentList-*.js` ~2.9KB) and trimming the initial bundle
- `VersionList`'s relative-date helper is hoisted to module scope (single closure across renders) and accepts the raw `createdAt` number directly, removing per-render `Date(...).toISOString()` allocations
- "All changes saved" toast effect rewritten with `useRef` timer handles so both the idle and hide timers clear on every content change — fixes the prior cleanup leak

## 2026-04-24

### Fixed
- Remote cursor now appears on click (not only on typing): caret offset broadcasts on `mouseup`/`keyup`/`focus` in addition to `selectionchange`; `textOffsetFromSelection` handles root-as-anchor selections; `RemoteCursors` falls back to `getClientRects()` then the parent element rect when `getBoundingClientRect()` is all zeros (`src/utils/caretOffset.ts`, `src/components/Editor.tsx`, `src/components/RemoteCursors.tsx`)

### Added
- Comments (Word/Docs-style): toolbar Add comment button, prompt-based body input, threaded replies with Post button, Resolve/Reopen toggle, Delete with confirmation, blue active / gray-dashed resolved highlight overlay, full sync across peers via BroadcastChannel, persisted to localStorage
- `Comment` and `Reply` types + `COMMENT_HIGHLIGHT_COLOR` in `src/constants/comments.ts`; `STORAGE_KEYS.COMMENTS`; `COLLAB_MESSAGE.COMMENTS` envelope
- `useComments` hook (`src/hooks/useComments.ts`) with addComment / addReply / toggleResolve / deleteComment / applyRemoteComments
- `CommentHighlights` overlay (`src/components/CommentHighlights.tsx`) and `CommentList` thread panel (`src/components/CommentList.tsx`)
- Toolbar "Add comment" button in `src/components/Toolbar.tsx`
- Hint label under the side panel referencing the Comment button (`UI_LABEL.COMMENT_HINT`)
- Phase 8 tests: 11 useComments, 2 useCollab COMMENTS protocol, 4 CommentHighlights, 9 CommentList, 8 App integration
- Review functionality: two-step workflow (Mark reviewed → Complete) with yellow draft / green completed highlights, side panel listing reviews with Complete + Delete, and live sync of completed reviews across peers over BroadcastChannel
- `Review` data model + `REVIEW_STATUS` enum in `src/constants/review.ts`; `STORAGE_KEYS.REVIEWS`; `COLLAB_MESSAGE.REVIEWS` envelope
- `useReviews` hook (`src/hooks/useReviews.ts`) with markForReview / completeReview / deleteReview / applyRemoteCompleted
- `selectionRangeOffsets` helper in `src/utils/caretOffset.ts` for capturing the current selection as `{start, end}` text offsets
- `ReviewHighlights` overlay (`src/components/ReviewHighlights.tsx`) and `ReviewList` side panel (`src/components/ReviewList.tsx`)
- Toolbar "Mark reviewed" button (renders only when `onMarkReview` is provided) in `src/components/Toolbar.tsx`
- Phase 7 tests: 5 selectionRangeOffsets, 11 useReviews, 2 useCollab REVIEWS protocol, 4 ReviewHighlights, 7 ReviewList, 6 App integration
- `Range.prototype.getClientRects` polyfill in `src/test/setup.ts` (jsdom doesn't implement it; required by the highlight overlay)
- `useVersions` hook tests (`src/hooks/useVersions.test.tsx`) covering save/delete/getVersion, name trimming, newest-first ordering, persistence, hydration, and unique ids
- `VersionList` component tests (`src/components/VersionList.test.tsx`) covering empty state, list rendering, save/cancel flows, restore, and delete with confirmation
- App-level version-history integration tests in `src/App.test.tsx` covering save → list + storage, restore into editor, delete with confirmation, cancel paths
- Real-time collaborative editing over `BroadcastChannel('quiz.collab.v1')`: same-browser-tab presence, content sync, and remote cursors (`src/hooks/useCollab.ts`, `src/constants/collab.ts`)
- Per-tab user identity hook with stable id/name/color persisted in sessionStorage (`src/hooks/useLocalUser.ts`, `src/utils/userId.ts`, `src/utils/userColor.ts`, `src/utils/sessionStore.ts`)
- Caret-offset utilities: linear text offset from a Selection, and inverse lookup of a text node at a given offset (`src/utils/caretOffset.ts`)
- `PresenceAvatars` component replacing the static avatar block; `RemoteCursors` overlay rendering colored caret bars with peer name labels (`src/components/PresenceAvatars.tsx`, `src/components/RemoteCursors.tsx`)
- Editor accepts `onCaretChange` for broadcasting local caret offset to peers (`src/components/Editor.tsx`)
- Phase 5 tests: 8 caret-offset, 3 user-color, 3 useLocalUser, 10 useCollab, 4 PresenceAvatars, 4 RemoteCursors, 6 App-collab integration
- BroadcastChannel + sessionStorage polyfills in `src/test/setup.ts` (Node 25's globals shadow jsdom and do not deliver across instances)
- `wordCount` utility tests (`src/utils/wordCount.test.ts`) covering `htmlToText` (tags, entities, empty) and `countWords` (empty, whitespace, single, multi, punctuation, numbers)
- `WordCount` component tests (`src/components/WordCount.test.tsx`) covering render, live updates, formatting-tag stripping, and `aria-live="polite"`
- App-level word-count integration tests in `src/App.test.tsx` covering empty start, live updates on input, and saved-content count on mount
- Storage utility tests (`src/utils/storage.test.ts`) covering JSON round-trip, fallbacks, silent quota errors, removal, and key isolation
- `useLocalStorage` hook tests (`src/hooks/useLocalStorage.test.tsx`) covering initial fallback, reads-on-mount, persistence, function updaters, objects, and cross-key isolation
- App-level autosave integration tests in `src/App.test.tsx` covering typing-persists, remount-restores, Clear-persists-empty, and content/versions key isolation
- Toolbar Clear-button tests (confirm/cancel paths) in `src/components/Toolbar.test.tsx`
- App-level integration tests for end-to-end clear behavior in `src/App.test.tsx`
- localStorage polyfill in `src/test/setup.ts` to work around Node 25's experimental global `localStorage` shadowing jsdom's Storage
- Toolbar controls for text color, font size, bullet/numbered lists, and paragraph/heading block formats, extending `FORMAT_COMMAND` with `foreColor`, `fontSize`, `insertUnorderedList`, `insertOrderedList`, `formatBlock`
- `FONT_SIZE_VALUE` and `BLOCK_FORMAT` value enums in `src/constants/formatCommands.ts`
- `useSavedSelection` hook that preserves the editor's caret/range across focus-stealing controls (`src/hooks/useSavedSelection.ts`)
- Toolbar tests covering all 6 formatting categories (`src/components/Toolbar.test.tsx`)
- Vitest + React Testing Library + jsdom test infrastructure (`vite.config.ts`, `src/test/setup.ts`, `npm test` / `npm run test:run` scripts)
- Editor component tests covering text input, display, and ref-synced content updates (`src/components/Editor.test.tsx`)
- PROGRESS.md tracking status of the 9 functional requirements

### Changed
- `applyFormat(cmd, value?)` now accepts an optional value so commands like `foreColor`, `fontSize`, and `formatBlock` can be dispatched uniformly
- `useActiveFormats` now also tracks `insertUnorderedList` and `insertOrderedList` state for toolbar aria-pressed reflection
- Active-state highlight and aria-pressed on Bold/Italic toolbar buttons, tracking the current selection so the user can see which formatting is applied
- Vite + React + TypeScript text editor scaffold
- Contenteditable editor with Bold, Italic, and Clear toolbar
- Live word count
- Autosave of editor content to localStorage
- Named version snapshots with restore and delete
