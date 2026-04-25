# Changelog

## 2026-04-24

### Fixed
- Remote cursor now appears on click (not only on typing): caret offset broadcasts on `mouseup`/`keyup`/`focus` in addition to `selectionchange`; `textOffsetFromSelection` handles root-as-anchor selections; `RemoteCursors` falls back to `getClientRects()` then the parent element rect when `getBoundingClientRect()` is all zeros (`src/utils/caretOffset.ts`, `src/components/Editor.tsx`, `src/components/RemoteCursors.tsx`)

### Added
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
