---
title: Research Svelte equivalents for reactComponents/sourceFile detection
labels: phase:7, type:research, agent:ok
milestone: Phase 7 — Component detection
depends_on: p5-99-gate
---
## Goal

A written research conclusion, committed as
`docs/svelte-component-detection.md`, answering: can a Svelte 5 app populate
the optional `Annotation.reactComponents` and `Annotation.sourceFile` schema
fields the way upstream populates them from React fibers — and if so, how.
The document must (a) spec upstream's behavior precisely enough to act as a
parity target, (b) establish what Svelte actually exposes at dev/run time by
experiment in the playground, (c) evaluate candidate mechanisms (dev-mode
`__svelte_meta`, a Vite plugin / preprocessor injecting `data-` attributes,
devtools hooks), and (d) end with a build / don't-build recommendation,
effort estimate, and proposed field formats that keep `generateOutput`
byte-compatible.

## Upstream reference

- `upstream/package/src/utils/react-detection.ts` (704 LOC) —
  `getReactComponentName(element, config)` walks the fiber `return` chain
  (found via `__reactFiber$*` element keys), collecting up to
  `maxComponents` (default 6) display names within `maxDepth` (30). Modes
  `"all" | "filtered" | "smart"` (skip lists lines 75–142, DOM-class
  correlation 241–305), minified-name skipping (604–610), WeakMap caching
  for `all` mode only (360–367). Returns
  `{ path: "<App> <Layout> <Button>" (outermost→innermost), components: [innermost→outermost] }`.
- `upstream/package/src/utils/source-location.ts` (904 LOC) —
  `getSourceLocation(element)` reads fiber `_debugSource` (React 16–18,
  lines 284–314), React 19 fallbacks (322–377), then a stack-trace probe
  that invokes the component under a throwing hooks-dispatcher proxy
  (573–630); `cleanSourcePath` strips webpack/turbopack/http prefixes
  (534–567); `formatSourceLocation` emits `path` / `vscode://` forms
  (739–758); plus `findNearestComponentSource`, `getComponentHierarchy`.
- `upstream/package/src/types.ts` lines 23–24 — the two optional schema
  fields this spike targets (`reactComponents?: string`,
  `sourceFile?: string`, dev mode only).
- `upstream/package/src/utils/generate-output.ts` lines 58, 93–97, 104–108
  — how the fields surface in markdown (`**Source:**`, `**React:**`, and
  the compact-level ` (sourceFile)` suffix).
- `upstream/package/src/components/page-toolbar-css/index.tsx` lines
  99–144 and 181 — `identifyElementWithReact`,
  `ReactComponentMode = "smart" | "filtered" | "all" | "off"` derived from
  the output detail level; lines 1701–1702 and 2059–2060 — where detection
  results are written into annotations.
- Behavior oracles (not ported, per Phase 1):
  `utils/react-detection.test.ts` (363 LOC),
  `utils/source-location.test.ts` (1211 LOC).

## Acceptance criteria

- [ ] `docs/svelte-component-detection.md` merged to `main`, containing all
      four parts: upstream behavioral spec (inputs, outputs, modes,
      filtering, caching, dev-vs-prod) with upstream line references;
      Svelte 5 runtime/dev-time facts verified in the playground (e.g.
      inspect `__svelte_meta` on dev-mode DOM nodes), not just quoted from
      docs; at least three candidate approaches evaluated with pros/cons
      (dev/prod availability, SSR, bundler coupling, maintenance); a
      recommendation with effort estimate and proposed formats matching
      upstream (`"<App> <Dashboard> <Card>"` path string for
      `reactComponents`; `file:line[:col]` string for `sourceFile`).
- [ ] The doc states how each approach maps onto upstream's
      `ReactComponentMode` settings (`smart`/`filtered`/`all`/`off`) or why
      a given mode has no Svelte equivalent.
- [ ] Every claim about Svelte internals is backed by a code reference
      (svelte / vite-plugin-svelte source) or a reproducible playground
      experiment recorded in the doc.
- [ ] A "compatibility statement" section confirms that leaving both fields
      unset remains schema-valid and byte-identical to upstream output for
      fixtures without those fields (cite the Phase 1 fixture-parity test).
- [ ] If the recommendation is "build": the doc lists draft follow-up
      issues (title + one-line scope each). No implementation code is
      merged from this issue either way.
- [ ] PLAN.md Phase 7 section gains a pointer to the conclusion doc (no
      other PLAN.md changes).

## Out of scope

- Implementing any chosen mechanism (Vite plugin, preprocessor, runtime
  walker) — that is follow-up work seeded from the doc's recommendation.
- Porting `react-detection.ts` / `source-location.ts` or their tests —
  React-fiber-bound, explicitly excluded in Phase 1.
- Changes to `types.ts`, `generate-output.ts`, or toolbar code.
- A PORTING.md row (nothing is ported here).

## Notes

- RESEARCH.md §1 "React-only features" states the hypothesis to
  confirm/refute: Svelte attaches no public runtime component metadata, so
  this likely needs a Vite/preprocess plugin injecting data attributes at
  dev time.
- Leads worth checking: Svelte's dev-mode `__svelte_meta` on created DOM
  nodes (vite-plugin-svelte's inspector uses it to map elements to
  file/line — the closest analogue of React's `_debugSource`); the
  svelte-inspector source; `sv-agentation`'s `openSourceOnClick` /
  `vscodeScheme` features (study only, never copy — CONTRIBUTING.md compat
  guardrails); upstream's `vscode://` formatting in `formatSourceLocation`
  for output-shape parity.
- Both fields are optional: nothing in Phases 0–6 blocks on this, and a
  well-argued "don't build" is an acceptable conclusion.
