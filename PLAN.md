# Plan: svelte-agentation

A Svelte 5 port of [`benjitaylor/agentation`](https://github.com/benjitaylor/agentation),
100% compatible with its annotation schema, markdown output, and MCP/server
protocol. Decision rationale lives in [RESEARCH.md](RESEARCH.md).

Strategy decisions already taken:

- Direct port of upstream (no fork of `sv-agentation`), mirroring upstream's
  `package/src` file layout so upstream releases apply as diffs.
- Keep the **PolyForm Shield 1.0.0** license with full attribution (we reuse
  upstream code verbatim where portable).
- Contact Benji Taylor **after** the MVP is built, before publishing to npm.
- Reference baseline: upstream `agentation@3.0.2`.

---

## Phase 0 — Scaffold

- [x] Pin the upstream baseline: add `UPSTREAM.md` recording the commit hash
      of `benjitaylor/agentation` we port from (`8158a97`, v3.0.2; cloned
      locally via `./scripts/upstream.sh`). Every later phase references
      this snapshot.
- [x] Create a SvelteKit library package (pnpm, `@sveltejs/package`,
      `svelte@^5`, TypeScript, vitest + jsdom, publint). Package name:
      `svelte-agentation`.
- [x] `src/lib/` mirrors upstream `package/src/`:
      `types.ts`, `utils/`, `components/`, `index.ts`.
- [x] Playground route (`src/routes/`) with a realistic demo page to annotate
      — used for manual testing throughout.
- [x] Add `LICENSE` (PolyForm Shield 1.0.0, upstream copyright + ours),
      attribution section in README.

**Done when:** `pnpm build` produces a publishable (unpublished) package and
the playground renders.

## Phase 1 — Portable core (verbatim port)

Port these upstream files with minimal changes, keeping paths and exported
names identical:

- [x] `types.ts` — the `Annotation` schema (~25 fields). Also move
      `OutputDetailLevel` and `ReactComponentMode` here (upstream leaks them
      from the toolbar component; flagged in RESEARCH.md).
- [x] `utils/element-identification.ts` — element naming, DOM paths, shadow
      DOM traversal, nearby text/elements, computed styles, a11y info.
- [x] `utils/storage.ts` — localStorage persistence, sync markers, sessions.
- [x] `utils/freeze-animations.ts` — timer/RAF/CSS animation pause.
- [x] `utils/screenshot.ts` — DOM-to-canvas capture + drawing strokes.
- [x] `utils/sync.ts` — fetch client for the server protocol (sessions,
      annotations, actions).
- [x] `utils/generate-output.ts` — markdown generator, 4 detail levels
      (compact / standard / detailed / forensic). React-specific fields
      (`reactComponents`, `sourceFile`) remain in output logic but stay
      empty/undefined for now.
- [x] Port upstream's existing tests (`source-location.test.ts` excluded —
      React-only; not ported). Satisfied by the skip records: upstream's only
      util tests are `react-detection.test.ts` (363 LOC) and
      `source-location.test.ts` (1211 LOC), both covering skipped React-fiber
      files (PORTING.md › Tests). Every portable module instead got new
      per-module unit tests (upstream ships none). Verified by #15.
- [x] **Compatibility fixture test:** feed identical `Annotation[]` fixtures
      to our `generateOutput` and upstream's; assert byte-identical markdown
      at all 4 detail levels. (#14)

**Explicitly NOT ported:** `utils/react-detection.ts`,
`utils/source-location.ts` (React-fiber-bound; their schema fields are
optional). A Svelte equivalent is Phase 7.

**Done when:** all ported tests pass + fixture test proves output parity.

## Phase 2 — Toolbar MVP (the real work)

Rewrite upstream's `page-toolbar-css/index.tsx` (4.7k-line React monolith)
as Svelte 5. Decompose its ~30 `useState`s into runes-based controllers
(`.svelte.ts`) grouped the way the monolith groups state:

- [x] `internal/annotations.svelte.ts` — annotation list state machine
      (add → edit → delete → clear), persistence via `utils/storage`. (#16)
- [x] `internal/picker.svelte.ts` — activate/deactivate, hover tracking,
      element hit-testing (via `utils/element-identification`). (#17)
- [x] `internal/markers.svelte.ts` — marker positions, enter/exit animation
      lifecycle, scroll/resize re-positioning, fixed-element handling. (#18)
- [ ] Components (each mirrors an upstream component dir):
  - [ ] `components/page-toolbar/` — the toolbar itself, mounted to
        `document.body` (Svelte `mount()` replaces React portal).
  - [ ] `components/annotation-popup/` — comment popup (replace upstream's
        `forwardRef`/`useImperativeHandle` `.shake()` with an exported
        function / bindable).
  - [ ] `components/page-toolbar/annotation-marker/`.
  - [ ] `components/page-toolbar/settings-panel/` incl. checkbox-field.
  - [ ] Primitives: `checkbox`, `switch`, `tooltip`, `help-tooltip`,
        `icons` (pure SVG — near-verbatim).
- [ ] Styles: convert upstream SCSS modules to component `<style>` blocks,
      preserving the `:where()` zero-specificity resets, CSS variables, and
      keyframe animations. Keep `data-feedback-toolbar` attributes (the
      freeze-animations exclusion contract depends on them).
- [ ] Wire MVP features: pick element → comment → marker → edit/delete →
      clear all → generate markdown → copy to clipboard; keyboard shortcuts;
      `pauseAnimations`; localStorage persistence across reloads.
- [ ] Props: implement upstream's `AgentationProps` surface —
      `copyToClipboard`, `className`, callbacks `onAnnotationAdd`,
      `onAnnotationUpdate`, `onAnnotationDelete`, `onAnnotationsClear`,
      `onCopy`, `onSubmit`. Same names, same call signatures.
- [ ] Export `Agentation` (+ `AnnotationPopup`, utils, storage, types) from
      `index.ts` matching upstream's export list.

**Done when:** in the playground, the full annotate → output → copy loop
matches upstream behavior side-by-side, with annotations surviving reload.

## Phase 3 — Advanced annotation features

- [ ] Multi-select: drag rectangle → multiple elements per annotation
      (`isMultiSelect`, `elementBoundingBoxes`).
- [ ] Text-selection annotations (`selectedText`).
- [ ] Draw mode: strokes + screenshot composition (`drawingIndex`,
      `utils/screenshot`).
- [ ] Detail-level settings (compact → forensic) in the settings panel,
      feeding `generateOutput` exactly as upstream does.

**Done when:** an annotation created in our toolbar serializes to markdown
indistinguishable from upstream's for the same interaction.

## Phase 4 — Server sync + MCP compatibility

The payoff phase: upstream's `mcp/` server is framework-agnostic (REST + SSE,
port 4747), so we integrate against it **unchanged**.

- [ ] Props: `endpoint`, `sessionId`, `onSessionCreated`, `webhookUrl`.
- [ ] Session create/resume on activation (via ported `utils/sync.ts`).
- [ ] Push annotation add/update/delete to the server; `_syncedTo` markers.
- [ ] Listen on `GET /sessions/:id/events` (EventSource); remove/update
      annotations when an agent resolves/replies (upstream toolbar behavior).
- [ ] "Send to agent" (`onSubmit` + `requestAction`) and webhook flow.
- [ ] **End-to-end verification:** run upstream's actual MCP server from
      `/tmp/agentation/mcp`; drive the full loop — annotate in our toolbar →
      `agentation_get_pending` via MCP → `agentation_resolve` → marker
      disappears in our UI. Document the run in `COMPAT.md`.

**Done when:** the e2e loop passes against upstream's unmodified server.

## Phase 5 — Parity audit + outreach + release

- [ ] Prop-by-prop audit against upstream `AgentationProps` (incl. demo mode:
      `demoAnnotations`, `demoDelay`, `enableDemoMode` — implement or
      document as deferred).
- [ ] Review upstream commits/releases since our pinned baseline; apply diffs.
- [ ] README: install, usage, prop docs, compatibility statement, attribution
      to Benji Taylor and a credit to `sv-agentation`.
- [ ] **Contact Benji Taylor** — show the built package, COMPAT.md, license
      stance; ask for his blessing (cite upstream issue #50 for non-React
      demand). Wait for response before npm publish.
- [ ] Notify SikandarJODD (courtesy heads-up, no toes stepped on).
- [ ] Publish to npm as `svelte-agentation`.

## Phase 6 — Design mode (post-release)

Upstream's `design-mode/` (~4k LOC): palette, rearrange, skeletons, spatial
math. Port `spatial.ts` / `section-detection.ts` / `output.ts` logic
(~60–80% portable), rewrite the three UI overlays in Svelte. Emits
`kind: "placement" | "rearrange"` annotations per the schema.

## Phase 7 — Svelte component detection (research)

Equivalent of upstream's `reactComponents` / `sourceFile`: Svelte exposes no
runtime component metadata, so this likely needs a Vite plugin / preprocessor
injecting `data-` attributes at dev time. Separate research spike; the schema
fields are optional, so this never blocks compatibility.

---

## Ongoing: upstream sync process

After each upstream release: `git -C agentation-upstream pull`, diff
`package/src` against our pinned baseline, apply changes (verbatim files take
the diff directly; toolbar changes are re-implemented), re-run the fixture
and e2e compat tests, bump baseline in `UPSTREAM.md`.
