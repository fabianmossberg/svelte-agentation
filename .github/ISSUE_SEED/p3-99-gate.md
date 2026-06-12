---
title: "Gate: Phase 3 — Advanced annotations done-when holds"
labels: phase:3, type:test, agent:ok
milestone: Phase 3 — Advanced annotations
depends_on: p3-01-drag-multi-select, p3-02-cmd-shift-click-multi-select, p3-03-text-selection-annotations, p3-04-draw-mode-canvas, p3-05-draw-strokes-output, p3-06-output-detail-settings
---
## Goal

Verify PLAN.md Phase 3's done-when statement: *"an annotation created in our
toolbar serializes to markdown indistinguishable from upstream's for the
same interaction."* This gate runs the verification across every Phase 3
interaction type and all four detail levels, and closes the phase.

## Upstream reference

- `upstream/package/src/utils/generate-output.ts` (129 LOC) — the
  serialization contract for all annotation kinds
- `upstream/package/src/components/page-toolbar-css/index.tsx` — lines
  2955–3090 (Drawings section contract)
- `upstream/package/src/types.ts` (109 LOC) — `Annotation` fields exercised
  this phase: `isMultiSelect` (21), `elementBoundingBoxes` (26–31),
  `selectedText` (13), `drawingIndex` (25)

## Acceptance criteria

- [ ] Compat fixture suite includes annotations with `isMultiSelect`
      (drag-created), `elementBoundingBoxes` (cmd+shift+click-created),
      `selectedText`, and `drawingIndex`, and asserts byte-identical
      markdown against upstream's `generateOutput` at all 4 detail levels
- [ ] Drawings-section parity test passes: standalone strokes produce
      text-identical descriptions to upstream's logic for the same stroke
      data and sampled elements
- [ ] Side-by-side playground check against upstream for each interaction —
      single click, drag multi-select, cmd+shift+click multi-select,
      text-selection click, draw stroke — yields structurally identical
      markdown (environment-dependent forensic fields such as URL, user
      agent, and timestamp excepted); result noted in the gate issue
- [ ] Detail-level setting changes the copied output through the toolbar
      exactly as upstream (verified at all 4 levels)
- [ ] All four Phase 3 checkboxes in PLAN.md are ticked
- [ ] All other Phase 3 issues are closed and CI is green on `main`

## Out of scope

- Server sync of the new annotation fields (Phase 4)
- Design mode and demo mode (Phases 6 / 5)
- Fixing any parity deviation found: file it as `type:compat` (it outranks
  feature work per CONTRIBUTING.md) and block this gate on it

## Notes

- Never hand-edit `tests/fixtures/` — regenerate from upstream by script
  (CONTRIBUTING.md compat guardrails).
