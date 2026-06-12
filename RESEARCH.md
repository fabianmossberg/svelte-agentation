# Research: Path to a Svelte Agentation

Date: 2026-06-12. Sources: `benjitaylor/agentation` @ 3.0.2 and
`SikandarJODD/sv-agentation` @ 0.4.0, both cloned and read at source level,
plus open-issue review on both repos.

## 1. Upstream architecture (`benjitaylor/agentation`)

~17.8k LOC library (`package/src`): ~11k in React `.tsx`, ~6.9k plain `.ts`.

### Portable verbatim (~1.2–1.5k LOC, zero React imports)

| File | Role |
|---|---|
| `utils/element-identification.ts` | Element naming, DOM paths, shadow DOM traversal, nearby text/elements, computed styles, a11y info |
| `utils/storage.ts` | localStorage persistence, sync markers, session/design-state storage |
| `utils/freeze-animations.ts` | Pauses timers/RAF/CSS animations during annotation |
| `utils/sync.ts` | Pure-`fetch` client for the server protocol (sessions, annotations, actions) |
| `utils/screenshot.ts` | DOM-to-canvas capture + drawing strokes |
| `types.ts` | The `Annotation` schema (~25 fields) — this IS the compat contract |
| `components/icons.tsx` | Pure SVG, trivially convertible |

`utils/generate-output.ts` (markdown output, 4 detail levels:
compact/standard/detailed/forensic) is ~95% portable; it only leaks two enum
types from the toolbar component that belong in `types.ts`.

### React-bound, needs rewriting as Svelte components (~9.5k LOC)

- `page-toolbar-css/index.tsx` — **4,709-line monolith**: ~30 `useState`s,
  ~20 effects, portals to `document.body`. The annotation state machine,
  multi-select drag, marker animation lifecycle, and SSE listening all live
  inline here. A Svelte 5 rewrite (runes + `.svelte.ts` controllers) is the
  bulk of the port; estimated 2.5–3k LOC of new code.
- `design-mode/` — ~4k LOC (palette, rearrange, skeletons, spatial math).
  The geometry/spatial logic (~500 LOC) is extractable; UI must be rewritten.
- `annotation-popup-css/` (~300), settings panel, small primitives.

### React-only features (skippable for MVP — schema fields are optional)

- `react-detection.ts` (705 LOC) walks React fibers → `reactComponents` field.
- `source-location.ts` (~200 LOC) reads fiber `_debugSource` → `sourceFile`
  field (dev mode only). A Svelte equivalent would be new work (Svelte
  attaches no public runtime component metadata; likely needs a Vite/preprocess
  plugin injecting data attributes). Park for v2.

### MCP server: framework-agnostic already

`mcp/` is an HTTP server (port 4747) + MCP tools + SQLite, talking to the
toolbar via plain REST + SSE (`POST /sessions/:id/annotations`,
`GET /sessions/:id/events`, `PATCH /annotations/:id`, …). **A Svelte toolbar
that reuses `sync.ts` and speaks this protocol gets MCP, sessions, webhooks,
and agent resolve/reply flows for free, unchanged.** This is the strongest
argument for strict schema compatibility.

### Churn

Fast API movement Jan–Mar 2026 (1.4 → 2.x → 3.0 in two months), quiet since
3.0.2 (2026-03-25). Repo still active (pushes June 2026). Syncing is a real
but bounded commitment.

## 2. `SikandarJODD/sv-agentation` assessment

- **Independent clean reimplementation, not a translation.** Different
  function names, algorithms, and file structure throughout; README credits
  "highly inspired by Agentation.com". Its MIT license is legitimate.
- Good engineering: Svelte 5 runes, `.svelte.ts` controllers, ~9.5k LOC,
  2.7k LOC of tests, shadow DOM support, active (v0.4.0, June 2026).
- **~65% feature parity, ~0% API compatibility — by design, not by gap:**
  - Different props (no `endpoint`/`sessionId`/`webhookUrl`/`onSubmit`;
    extra `keyBindings`, `vscodeScheme`, `openSourceOnClick`, …).
  - Different output: wraps annotations in an `AgentationExportPayload`
    object with different field names (`targetSummary` vs `element`, …).
    An agent/MCP consumer of upstream output cannot consume it.
  - Missing: MCP/server sync, webhooks, sessions, design mode, screenshot,
    demo mode, component detection.
- Maintainer's reply on [#14 "Parity with Agentation v3?"](https://github.com/SikandarJODD/sv-agentation/issues/14)
  reads as "building my own tool," not "tracking upstream."

**Implication:** making sv-agentation 100% agentation-compatible means
replacing its schema, output, props, and storage — i.e. gutting the very
code a fork would be for. The only part a fork preserves is its Svelte UI
shell, which is also the part we must reshape around upstream's state machine
anyway. And being MIT, it cannot absorb upstream's PolyForm-Shield-licensed
utils — a fork mixing the two could not be offered back for merging.

## 3. License

Upstream is **PolyForm Shield 1.0.0** (use/modify/distribute allowed;
competing products forbidden). Decision taken: a Svelte port is accepted
risk; keep the PolyForm Shield license, attribute clearly, and ask Benji
Taylor for a blessing. Note this makes our code MIT-incompatible, so code
cannot flow from us into sv-agentation (ideas can).

## 4. Adjacent prior art (from upstream issue #50)

- [`YeomansIII/agent-ui-annotation`](https://github.com/YeomansIII/agent-ui-annotation) —
  web-components implementation claiming React/Vue/Svelte/vanilla support.
- [`onllm-dev/onUI`](https://github.com/onllm-dev/onUI) — browser extension
  (Chrome/Edge/Firefox) with a local MCP server; this is the "bonus" chrome
  extension idea, already existing.

Neither is agentation-schema-compatible (quick check only); both are worth a
short look before building the bonus goals, not blockers for the Svelte port.

## 5. Conclusion

**Build `svelte-agentation` as a direct port of upstream, mirroring its file
structure** (the README's "create our own version" option, heavily seeded by
upstream code):

1. Lift the portable core verbatim: `types.ts`, `element-identification`,
   `storage`, `freeze-animations`, `sync`, `screenshot`, `generate-output`
   (with the two stray enums moved into types). Keep upstream paths/names so
   every upstream release diffs cleanly onto our tree — this is what makes
   "follow upstream changes" cheap.
2. Rewrite the toolbar as Svelte 5 components: runes-based state controllers
   in `.svelte.ts` mirroring the monolith's state groups (annotations,
   markers, multi-select, sync), components for toolbar/markers/popup/settings.
   Borrow *patterns* (not code) from sv-agentation's runes architecture.
3. Speak the upstream MCP/server protocol via the lifted `sync.ts` —
   instant compatibility with their MCP server, webhooks, and skills.
4. Skip for v1: design mode, demo mode, `reactComponents`/`sourceFile`
   detection (fields stay optional/empty — output remains schema-valid).
   v2: design mode; v3: a Svelte component-detection equivalent.
5. Don't fork sv-agentation; credit it, watch it, and share findings with
   the maintainer. Revisit cooperation if he ever pivots to upstream parity.

Why not fork sv-agentation: the fork would keep ~the UI shell and discard the
data layer, while inheriting an API we'd immediately break — the worst of
both sync burdens (compatible with neither upstream's diffs nor his).

### Next steps

- [ ] Email/issue to Benji Taylor: intent, license stance, ask for blessing
      (and ideally a `agentation-core` extraction upstream — issue #50 shows
      demand for Vue too).
- [ ] Scaffold SvelteKit library package mirroring `package/src` layout.
- [ ] Port the portable core + types; add round-trip schema tests against
      upstream's output fixtures.
- [ ] Build toolbar MVP (annotate → markers → markdown output → copy +
      `endpoint` sync).
- [ ] Verify against the real upstream MCP server end-to-end.
