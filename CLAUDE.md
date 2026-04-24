# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page rich-text editor (Vite + React 19 + TypeScript). Features: contenteditable editor, Bold/Italic/Clear toolbar, live word count, autosaved content, and named version snapshots persisted in `localStorage`. No backend, no routing, no test runner configured.

## Commands

- `npm run dev` — Vite dev server (http://localhost:5173)
- `npm run build` — `tsc -b && vite build` (type-checks the whole project, then bundles)
- `npm run lint` — ESLint across the repo
- `npm run preview` — serve the built `dist/` locally
- `npm test` — Vitest in watch mode
- `npm run test:run` — Vitest one-shot (use for CI / status checks)

Tests run on Vitest + @testing-library/react + jsdom. Setup lives at `src/test/setup.ts`; the `test` block is configured in `vite.config.ts`. Test files are colocated with the code under test as `*.test.tsx` / `*.test.ts`. Functional-requirement progress is tracked in `PROGRESS.md`.

## Architecture

State flows top-down from `src/App.tsx`, which owns two pieces of persistent state and passes them into dumb-ish components:

- `content: string` (editor HTML) — managed by `useLocalStorage(STORAGE_KEYS.CONTENT, '')`. Every mutation auto-persists.
- `versions: Version[]` — managed by `useVersions()`, also backed by `useLocalStorage` under `STORAGE_KEYS.VERSIONS`.

The only subtle piece is `src/components/Editor.tsx`: it is a contenteditable `<div>` bound to `content` via a **ref-synced, uncontrolled** pattern. It writes `innerHTML` only when the incoming `content` prop differs from the DOM's current `innerHTML`. This is deliberate — binding `innerHTML` on every keystroke would move the caret to the start. The trade-off: external callers (clear, restore a version) *must* go through `setContent` so the effect re-syncs the DOM.

Bold/Italic use `document.execCommand` (via `src/utils/formatCommand.ts`). This is deprecated but still the lightest way to get inline formatting on a contenteditable surface and is intentional for scope. Toolbar buttons use `onMouseDown` + `preventDefault` so clicking them does not blur the editor and drop the selection.

Word count always derives from `content` at render time (`htmlToText` → `countWords` in `src/utils/wordCount.ts`) — do not add a separate word-count state.

## Repo conventions (enforced)

These come from the user's global rules and this project's layout — follow them when adding code:

- **Reusable helpers live in `src/utils/`**. Do not inline a helper in a component if any other file could use it.
- **No raw string/int literals in comparisons or keys**. Add a named constant in `src/constants/` and import it. Existing constants:
  - `STORAGE_KEYS` (`src/constants/storageKeys.ts`) — all `localStorage` keys go here.
  - `FORMAT_COMMAND` (`src/constants/formatCommands.ts`) — `execCommand` names.
  - `UI_LABEL` / `UI_PROMPT` (`src/constants/ui.ts`) — user-visible strings.
- **CHANGELOG required**: after any behavior change, append an entry to `CHANGELOG.md` at the top of the file in the format already established (date heading, `### Added/Fixed/Changed/Removed` sections, one line per change, omit empty sections).

## Persistence details

- Storage layer is `src/utils/storage.ts` (`readJSON`/`writeJSON`/`removeKey`) — all `localStorage` access must go through it so quota/parse errors are handled uniformly. Do not call `localStorage.*` directly from components or hooks.
- Editor content is stored as an HTML string (not plain text), because formatting is part of the content.
- A `Version` is `{ id, name, content, createdAt }`. IDs are generated in `src/hooks/useVersions.ts`; treat them as opaque.
