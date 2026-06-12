# Porting ledger

One row per upstream source file. This is the authoritative record of what
has been ported, how, and where we deviate. Update it in the same PR as the
code change. Upstream paths are relative to `upstream/package/src/`; ours to
`src/lib/`.

**Modes**

- `verbatim` — copied as-is; must stay diff-minimal against upstream.
- `adapted` — copied with documented divergences (each one has a
  `// DIVERGENCE(upstream):` comment at the site and a note here).
- `rewritten` — reimplemented in Svelte; upstream file is the behavioral spec.
- `skipped` — deliberately not ported (say why).
- `deferred` — planned for a later phase (link the phase).

## Utils & types

| Upstream | Ours | Mode | Status | Divergences |
|---|---|---|---|---|
| `types.ts` | `types.ts` | adapted | not started | will absorb `OutputDetailLevel` + `ReactComponentMode` from the toolbar component (upstream leaks them; see RESEARCH.md) |
| `utils/element-identification.ts` | `utils/element-identification.ts` | verbatim | not started | — |
| `utils/storage.ts` | `utils/storage.ts` | verbatim | not started | — |
| `utils/freeze-animations.ts` | `utils/freeze-animations.ts` | verbatim | not started | — |
| `utils/screenshot.ts` | `utils/screenshot.ts` | verbatim | not started | — |
| `utils/sync.ts` | `utils/sync.ts` | verbatim | not started | — |
| `utils/generate-output.ts` | `utils/generate-output.ts` | adapted | not started | imports the two enums from `types.ts` instead of the toolbar component |
| `utils/react-detection.ts` | — | skipped | n/a | React-fiber-bound; Svelte equivalent is Phase 7 |
| `utils/source-location.ts` | — | skipped | n/a | React-fiber-bound (`_debugSource`); Svelte equivalent is Phase 7 |
| `utils/index.ts` | `utils/index.ts` | adapted | not started | drops re-exports of the two skipped files |

## Components

| Upstream | Ours | Mode | Status | Divergences |
|---|---|---|---|---|
| `components/page-toolbar-css/index.tsx` (4.7k LOC) | `components/page-toolbar/` + `internal/*.svelte.ts` | rewritten | not started | state decomposed into runes controllers (annotations / picker / markers); behavior must match |
| `components/annotation-popup-css/` | `components/annotation-popup/` | rewritten | not started | `forwardRef`/`useImperativeHandle` `.shake()` becomes an exported function/bindable |
| `components/page-toolbar-css/annotation-marker/` | `components/page-toolbar/annotation-marker/` | rewritten | not started | — |
| `components/page-toolbar-css/settings-panel/` | `components/page-toolbar/settings-panel/` | rewritten | not started | — |
| `components/checkbox/`, `switch/`, `tooltip/`, `help-tooltip/` | same paths | rewritten | not started | — |
| `components/icons.tsx` | `components/icons.ts(+.svelte)` | adapted | not started | pure SVG; near-verbatim |
| `components/design-mode/` (~4k LOC) | — | deferred | Phase 6 | spatial/section/output logic largely portable; UI rewritten |

## Tests

| Upstream | Ours | Mode | Status | Divergences |
|---|---|---|---|---|
| `utils/react-detection.test.ts` | — | skipped | n/a | tests a skipped file |
| `utils/source-location.test.ts` | — | skipped | n/a | tests a skipped file |
| `components/page-toolbar-css/index.test.tsx` | rewritten per component | rewritten | not started | — |
| (new) compat fixtures | `tests/fixtures/` + `tests/compat.test.ts` | n/a | not started | generated from pinned upstream; never hand-edited |
