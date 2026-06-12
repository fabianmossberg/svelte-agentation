---
title: Drag-rectangle multi-select creates a single multi-element annotation
labels: phase:3, type:feature, agent:ok
milestone: Phase 3 — Advanced annotations
depends_on: p2-99-gate
---
## Goal

While the toolbar is active, pressing the mouse on a non-text element and
dragging draws a selection rectangle, live-highlights every intersecting
element, and on mouseup creates one pending annotation covering all selected
elements (`isMultiSelect: true`, combined `boundingBox`, element label
`"N elements: <up to 5 names> +N more"`). Dragging over an empty region of
meaningful size (> 20×20px) falls back to an `"Area selection"` annotation.
The resulting annotation serializes to markdown identically to upstream's.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - 616–626 — drag state refs + `DRAG_THRESHOLD = 8` (all drag visuals use
    refs/direct DOM writes "to avoid re-renders")
  - 2125–2188 — mousedown handler, incl. the text-tag/contentEditable
    exclusion list (2138–2180) that keeps native text selection working
  - 2190–2399 — mousemove: drag rectangle updated via direct DOM style
    writes (2208–2218), live intersection highlights rendered into
    `highlightsContainerRef` (2376–2399)
  - 2401–2555 — mouseup: candidate selector (2420–2421), oversize/tiny
    filters (2431–2437), contained-parent filtering (2450–2456), combined
    bounds + pending annotation (2461–2515), empty-area `"Area selection"`
    path (2516–2538), cleanup (2544–2550)
  - 4695–4699 — `dragSelection` div + `highlightsContainer` JSX
- `upstream/package/src/components/page-toolbar-css/styles.module.scss` —
  `.dragSelection` (line 2079), `.highlightsContainer` (line 2112)
- `upstream/package/src/types.ts` — line 14 `boundingBox`, line 21
  `isMultiSelect`
- `upstream/package/src/utils/generate-output.ts` — lines 65–67 (forensic
  note: *"Forensic data shown for first element of selection"*)

## Acceptance criteria

- [ ] Dragging ≥ 8px (`DRAG_THRESHOLD`) from mousedown on a non-text element
      shows the selection rectangle following the cursor; rectangle and live
      highlights are updated via direct DOM writes, not reactive state
      (mirrors upstream's perf note at index.tsx:2190)
- [ ] Mousedown on the text tags listed at index.tsx:2138–2176 or on
      contentEditable elements does NOT start a drag (native text selection
      still works)
- [ ] Mouseup over ≥ 1 matched element creates a pending annotation with:
      `element` = `"N elements: <first 5 names>[ +N more]"`,
      `elementPath: "multi-select"`, `isMultiSelect: true`, combined
      `boundingBox` in document coordinates, and forensic fields
      (`fullPath`, `accessibility`, `computedStyles`, `nearbyElements`,
      `cssClasses`, `nearbyText`) taken from the first element
- [ ] Element filtering matches upstream: candidate selector
      `button, a, input, img, p, h1..h6, li, label, td, th`; elements
      > 80% viewport width AND > 50% viewport height excluded; elements
      < 10px in either dimension excluded; parents containing another
      matched element excluded; toolbar/marker UI excluded via
      `data-feedback-toolbar` / `data-annotation-marker`
- [ ] Drag over empty area > 20×20px creates the `"Area selection"`
      annotation with `elementPath: "region at (x, y)"` and
      `isMultiSelect: true`; a smaller drag creates nothing
- [ ] On mouseup/cancel, drag state resets and the highlights container is
      emptied
- [ ] Compat fixture extended: a saved drag multi-select annotation
      serializes byte-identically to upstream `generateOutput` at all 4
      detail levels (incl. the forensic multi-select note)
- [ ] Manually verified in the playground (drag across the demo page,
      comment, marker appears)
- [ ] PORTING.md row added for any deliberate divergence

## Out of scope

- Cmd+shift+click multi-select and `elementBoundingBoxes`
  (p3-02-cmd-shift-click-multi-select)
- Capturing `selectedText` (p3-03-text-selection-annotations)
- Draw mode (p3-04/p3-05)
- Any change to `utils/generate-output.ts` (ported in Phase 1; it already
  handles `isMultiSelect`)

## Notes

- RESEARCH.md ("React-bound, needs rewriting"): the multi-select drag lives
  inline in the 4,709-line monolith; this issue extracts it into the
  Phase 2 picker/overlay structure.
- Don't tick the PLAN.md multi-select checkbox yet — p3-02 completes it.
