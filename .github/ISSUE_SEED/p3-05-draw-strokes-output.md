---
title: Describe draw strokes in copied output (Drawings section + drawingIndex)
labels: phase:3, type:feature, agent:ok
milestone: Phase 3 — Advanced annotations
depends_on: p3-04-draw-mode-canvas
---
## Goal

When output is generated with standalone draw strokes present, append a
`**Drawings:**` section that classifies each stroke's gesture
(circle / box / underline / arrow / drawing), samples the page elements
beneath it (hiding the draw canvas during hit-testing), and describes it
with element names and page region — text-identical to upstream. Strokes
linked to an annotation via `drawingIndex` are skipped (their info lives in
the annotation), and clear/copy enablement accounts for strokes.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC),
  inside the copy/output flow (not in `generate-output.ts`):
  - 2955–3090 — the stroke-description block:
    - 2970–2974 — collect `linkedDrawingIndices` from annotations'
      `drawingIndex`; skip those strokes
    - 2976–2978 — temporarily hide the draw canvas so `elementFromPoint`
      hits real page elements (restored after)
    - 2988–2991 — viewport-coordinate conversion (fixed strokes already
      viewport coords; others document coords minus `scrollY`)
    - 3011–3035 — gesture classification: closed-loop circle vs box
      (edge-time heuristic), flat underline, arrow, generic drawing
    - 3037–3071 — sample elements along the stroke, dedupe names, compute
      page region
    - 3072–3085 — description assembly:
      `Arrow/Drawing near **<names>** (region: <region>)` /
      `Drawing at <region>`, emitted under `\n**Drawings:**\n` as a
      numbered list
  - 2871 — clear-all guard counts strokes
  - 2964 — output is still produced when there are strokes but no
    annotations
- `upstream/package/src/types.ts` — line 25 (`drawingIndex?: number`)
- `upstream/package/src/utils/generate-output.ts` (129 LOC) — unchanged;
  the Drawings section is appended after its output, exactly as upstream

## Acceptance criteria

- [ ] Gesture classification and description logic ported into a
      testable helper (pure function over strokes + an injectable
      element-sampling function), preserving upstream's thresholds and
      wording verbatim
- [ ] Unit tests cover each gesture class (circle vs box vs underline vs
      arrow vs generic) and the `near **names** (region: ...)` /
      `at <region>` description forms, asserting exact strings
- [ ] Copying with standalone strokes appends the `**Drawings:**` numbered
      section after the annotation markdown, matching upstream output
      text-identically for the same strokes/DOM
- [ ] Strokes referenced by an annotation's `drawingIndex` are excluded
      from the standalone section
- [ ] Strokes with fewer than 2 points are skipped
- [ ] The draw canvas is hidden during element sampling and restored
      afterwards
- [ ] Copy works (and produces only the Drawings section under the page
      header) when strokes exist but annotations don't; Clear all clears
      both
- [ ] PORTING.md row added (extraction of inline monolith logic into a
      helper, plus any other deliberate divergence)
- [ ] PLAN.md Phase 3 "Draw mode" checkbox ticked (completes the work
      started in p3-04)

## Out of scope

- Stroke capture / canvas rendering (p3-04-draw-mode-canvas)
- The design-mode/wireframe branches of upstream's copy flow
  (`generateDesignOutput`, `generateRearrangeOutput`, `wireframeOnly`) —
  Phase 6
- Any change to `utils/generate-output.ts`
- Attaching screenshots to the markdown output (upstream 3.0.2 does not)

## Notes

- Upstream 3.0.2 never sets `drawingIndex` on annotations (the only
  consumer is this skip-list, index.tsx:2973); implement the skip contract
  so linked strokes behave identically once a producer exists.
- This block lives in the monolith's `copyOutput`/send flow — in our port
  it belongs with the Phase 2 output/copy controller, not in the ported
  `generate-output.ts`.
