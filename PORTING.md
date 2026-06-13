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
| `types.ts` | `types.ts` | adapted | done (#6) | absorbed `OutputDetailLevel` + `ReactComponentMode` from `components/page-toolbar-css/index.tsx` (upstream leaks them; see RESEARCH.md) — each marked `// DIVERGENCE(upstream):` at the site |
| `utils/element-identification.ts` | `utils/element-identification.ts` | verbatim | done (#7) | byte-identical (`diff` empty); excluded from Prettier in `.prettierignore` to preserve upstream's 2-space/double-quote style — ESLint still lints it. New jsdom unit tests added (upstream ships none). |
| `utils/storage.ts` | `utils/storage.ts` | verbatim | done (#8) | byte-identical (`diff` empty); excluded from Prettier in `.prettierignore`. First verbatim port with an import — its extensionless `import type { Annotation } from "../types"` forced relaxing the scaffold's `NodeNext` moduleResolution to SvelteKit's default `bundler` in `tsconfig.json` (published artifact unchanged — type-only import is erased). New jsdom unit tests added (upstream ships none). |
| `utils/freeze-animations.ts` | `utils/freeze-animations.ts` | verbatim | done (#9) | byte-identical (`diff` empty); excluded from Prettier in `.prettierignore`. Zero imports; patches `setTimeout`/`setInterval`/`requestAnimationFrame` as an import side effect, state parked on `window.__agentation_freeze` to survive HMR (kept verbatim per issue #9 out-of-scope). Its `ReturnType<typeof setTimeout>` annotations clash with the `NodeJS.Timeout` overload that `@types/node` (pulled in by vitest) appends to the global `setTimeout`; accommodated **outside** the port by `src/ambient-dom-timers.d.ts`, which appends a trailing DOM `number` overload so `ReturnType` resolves to `number` (upstream's browser assumption) — see that file's header. New jsdom unit tests added (upstream ships none). |
| `utils/screenshot.ts` | `utils/screenshot.ts` | verbatim | done (#10) | byte-identical (`diff` empty); excluded from Prettier in `.prettierignore`. Its guarded dynamic `import("modern-screenshot")` (the DOM-to-canvas dep) is left **undeclared and uninstalled to mirror upstream** — which declares it nowhere — so absent consumers get the graceful stroke-only fallback, not an install error (declaring it even as an optional peer dep would make pnpm's `auto-install-peers` pull it into our tree, defeating the point). The uninstalled import would otherwise break the toolchain, accommodated **outside** the port: `src/modern-screenshot.d.ts` (minimal `domToCanvas` ambient `declare module` shim) keeps `pnpm check`/`pnpm build` from failing TS2307, and a `vite.config.ts` plugin marks the specifier external so the dev server doesn't abort on the unresolvable dynamic import (under vitest a `test.alias` → `src/test/modern-screenshot-stub.ts` makes it resolvable so `vi.mock` can drive the present/absent probe paths). Same accommodate-outside-the-port approach as `src/ambient-dom-timers.d.ts`. New jsdom unit tests added (upstream ships none). |
| `utils/sync.ts` | `utils/sync.ts` | verbatim | done (#11) | byte-identical (`diff` empty); excluded from Prettier in `.prettierignore`. Pure-`fetch` client for the server protocol; the `../types` relative import resolves unchanged. No divergences. New vitest unit tests added (upstream ships none) with a mocked global `fetch` asserting, per exported function, the exact URL/method/headers/JSON body, the parsed-JSON return, the status-bearing throw on a non-ok response, and that a network-error rejection propagates (the local-only fallback contract is the caller's, Phase 4). |
| `utils/generate-output.ts` | `utils/generate-output.ts` | adapted | done (#12) | sole divergence is the import block, marked `// DIVERGENCE(upstream):` — the two enums (`OutputDetailLevel`, `ReactComponentMode`) plus `Annotation` are imported from `../types` instead of upstream's `../components/page-toolbar-css` (upstream leaks the enums from the toolbar component; see RESEARCH.md). Everything past the imports is byte-identical to upstream (`diff <(tail -n +6 upstream/…) <(tail -n +3 src/lib/…)` empty), so the file is Prettier-excluded in `.prettierignore` like the verbatim ports; `import` became `import type` to satisfy the scaffold's `verbatimModuleSyntax` (all three names are type-only — erased from the artifact). React fields (`sourceFile`/`reactComponents`) keep their output logic, unpopulated until Phase 7. New vitest tests added (upstream ships none): a jsdom file for the window-present paths (all 4 detail levels exact-string, compact 30-char truncation, `nearbyText`-suppressed-by-`selectedText`, `sourceFile`/`reactComponents` presence/absence) and a `node`-environment file for the deterministic window-absent paths (viewport `unknown`, forensic Environment block without URL/UA/Timestamp/DPR) — matching how the Phase 1 compat fixtures are generated. |
| `utils/react-detection.ts` | — | skipped | n/a | React-fiber-bound; Svelte equivalent is Phase 7 |
| `utils/source-location.ts` | — | skipped | n/a | React-fiber-bound (`_debugSource`); Svelte equivalent is Phase 7 |
| `utils/index.ts` | `utils/index.ts` | adapted | done (#13) | sole divergence is the dropped `source-location` re-export, replaced in place by a `// DIVERGENCE(upstream):` line (React-fiber-bound; Phase 7) — `element-identification`/`storage`/`sync` re-exported in upstream's order, no extra re-exports added (upstream's barrel also omits `freeze-animations`/`screenshot`/`generate-output`). Kept upstream's double-quote/extensionless style and Prettier-excluded so upstream changes to the barrel apply as a clean diff. New vitest smoke test imports `identifyElement`/`loadAnnotations`/`createSession` through the barrel and asserts each is a function. |

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
| (none upstream) | `utils/element-identification.test.ts` | n/a (new) | done (#7) | upstream ships no test for this module; new jsdom unit tests cover identify/path/shadow/nearby/classes/a11y |
| (none upstream) | `utils/freeze-animations.test.ts` | n/a (new) | done (#9) | upstream ships no test; new jsdom unit tests cover timer/RAF queueing while frozen, `original*` bypass, unfreeze flush + style removal, and the three `data-*` exclusion attrs in the injected CSS |
| (none upstream) | `utils/screenshot.test.ts` | n/a (new) | done (#10) | upstream ships no test; new jsdom unit tests cover `isDomCaptureAvailable` once-only probe caching (positive + negative, asserted via a throwing `vi.mock` factory's call count), `captureDomRegion` null path when the dep is absent, and the `captureDrawingStrokes` fallback against a stubbed 2D context (render, `<2`-point skip, null-context, serialization-throw) — control flow only, no pixel assertions |
| `utils/react-detection.test.ts` | — | skipped | n/a | tests a skipped file |
| `utils/source-location.test.ts` | — | skipped | n/a | tests a skipped file |
| `components/page-toolbar-css/index.test.tsx` | rewritten per component | rewritten | not started | — |
| (new) compat fixtures | `tests/fixtures/` + `tests/compat.test.ts` | n/a | not started | generated from pinned upstream; never hand-edited |
