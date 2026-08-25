# AGENTS.md

Omarchy (Quickshell) bar-widget plugin: a two-tab panel (Verse of the Day,
Bible reader/search). Fully offline; all data bundled.

## The #1 gotcha: working copy ≠ installed copy

The repo at `~/Desktop/Omarchy/Bible/` is the source. The running plugin lives
at `~/.config/omarchy/plugins/bible/`. Editing the repo does nothing until you
sync and restart:

```sh
cp <changed files> ~/.config/omarchy/plugins/bible/
omarchy restart shell && omarchy-shell bible open
```

`omarchy restart shell` may transiently report "not responding" — retry the
`open` once. The panel opens on the last-used tab; there is no IPC to switch
internal tabs. quickshell logs: `/run/user/1000/quickshell/by-id/<id>/log.log`.

## Architecture

- `BarWidget.qml` — bar entry point (book glyph button + IPC). Loads `Panel.qml`
  via a `Loader` and injects `bar`/`anchorItem`/`hostWidget`/`service` into it.
- `Panel.qml` (~1900 lines) — the whole UI (sidebar, search, the reader,
  state persistence); where almost all UI work happens. Reusable UI components
  live in `components/` (NavItem, NavButton, InPanelDropdown, PositionBar,
  ReaderHeader, CopyFeedback, TestamentButton, SearchField, TranslationDropdown,
  StateFile, Tooltip).
- `components/` — reusable QML UI components extracted from `Panel.qml`.
- `ReaderModel.js` — translation-agnostic reader model (book/chapter/verse
  logic, state persistence). `.pragma library` + `.import "search.js" as Search`.
  Key helpers: `verseObjectsFor` (uses a `bookById` WeakMap cache),
  `firstNonOmittedVerseAfter` (daily-verse fallback), `resolveText`,
  `parsePlace` (delegates to search.js).
- `References.js` — `randomReference(seed, bible)`: deterministic FNV-1a pick
  of a non-omitted verse from a bible. The KJV canon is the daily-verse pick
  universe.
- `search.js` — reference parsing + word search + autocomplete. **Loaded three
  ways**: `Qt.include` in `SearchWorker.js`, `.import` in `ReaderModel.js`, and
  `vm` in the node tests. Therefore it must stay Qt-free and must NOT contain
  `.pragma`/`.import` directives (the tests strip those lines). Holds
  `fileUrlToPath`, `parseBarePlace`, `forEachVerse`, and a memoized lowercase
  search index.
- `SearchWorker.js` — WorkerScript wrapper; caches the bible object in its
  global scope after the first message so later searches send only the query.
- `Service.qml` — supplies `todayKey` (a date string that rolls at midnight via
  SystemClock) plus a `todayReference` that `Panel.qml` writes back with the
  resolved daily-verse reference (for the bar tooltip).
- `data/*.json` — 5 translations (dr, cpdv, kjv, web, bsb).

## Data model

Each bible file: `{ translation, books: [{ id, name, testament, chapters:
[[verse|null, ...]] }] }`. Chapters are 0-indexed in the array but callers pass
1-based chapter numbers (`chapters[chapter - 1]`). Omitted verses are `null` in
the data files; `ReaderModel` also treats empty string as omitted. Canons differ
(dr/cpdv = 73 books Catholic; kjv/web/bsb = 66 Protestant).

## Verification (run before claiming anything works)

```sh
omarchy plugin validate .
qmllint -I "$OMARCHY_PATH/shell" Panel.qml Service.qml   # BarWidget.qml exits 255 — known Quickshell tooling limitation, not a regression
node tests/test_canon.js    # ReaderModel + search.js tests
node tests/test_bibles.js   # validates data/*.json structure
node --check search.js SearchWorker.js References.js
```

`ReaderModel.js` fails `node --check` on `.pragma library` — expected, not an
error. Tests load JS via `vm` after stripping the `.pragma`/`.import` lines.

## Conventions

- **Domain namespaces**: functions are prefixed `bible*` /
  `verseOfDay*` (e.g. `bibleGoTo`, `verseOfDayCopy`). Keep this.
- **Library files** (`search.js`, `ReaderModel.js`) mark module-private helpers
  with a leading `_` (`_collapse`, `_BOOK_ALIASES`, `_textMatchesQuery`).
  `Panel.qml` does not use the `_` prefix.
- **Reference parsing lives in `search.js`** (`parsePlace`, `bookByName`,
  `_BOOK_ALIASES`), not `ReaderModel.js`. `ReaderModel.parsePlace` delegates to
  it. Add book aliases there.
- **Translation default is `dr`** (hardcoded in `Panel.qml`). The manifest
  `schema`/`defaults` blocks were removed — there is NO external settings
  config; translation changes only via the in-panel dropdown, persisted to
  `bible-state.json`.
- **State files** under `~/.local/state/omarchy/settings/`: `bible-state.json`
  (per-translation reading position + `selectedTranslation` + `verseOfDay`),
  `bible-tab-state.json` (last tab, defaults Verse).
- **Copy-to-clipboard** uses `copyToClipboard(text)` helper; clipboard content
  carries `Source: https://github.com/ronald2wing/Omarchy-Bible` (see
  `sourceUrl`), feedback strings do not.
- **No new dependencies** without explicit user justification. Prefer
  prompt/config changes over new tooling.

## Gotchas

- `Panel.qml` `onTextChanged` handlers must reference the TextField's own
  `text` property, not a component-internal id (a `field`/`searchField`
  ReferenceError silently kills the search trigger).
- The bible reader (`bibleVerseList`) is a virtualized `ListView`; scroll-to-center
  uses `positionViewAtIndex(idx, ListView.Center)`. The bible reader's model
  is `ReaderModel.verseObjectsFor(...)`.
- `highlightQuery` uses RichText; the result title and body both call it.
- The search worker has a stale-response guard (`msg.translation !==
  root.translation || msg.query !== root.query`); preserve it.
- Clicking the reader header title/subtitle or blank space below the last
  verse/paragraph clears search focus (TapHandlers call
  `keyCatcher.forceActiveFocus()`).
