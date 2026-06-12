---
title: "Draw mode: stroke canvas, mode lifecycle, and screenshot composition"
labels: phase:3, type:feature, agent:ok
milestone: Phase 3 — Advanced annotations
depends_on: p2-99-gate
---
## Goal

Implement draw mode: a full-viewport canvas overlay on which the user draws
freehand strokes (stored as `{ id, points, color, fixed }`, document
coordinates unless fixed), with a complete mode lifecycle — enter/exit,
Escape exits, entering layout mode exits, element picking suspended while
drawing, stroke-hover cursor, Clear-all wipes strokes — plus a screenshot
composition helper built on the already-ported `utils/screenshot.ts`
(`captureDomRegion` / `captureDrawingStrokes`).

## Upstream reference

Honesty note: in pinned upstream 3.0.2 draw mode is **dormant** — the state
and canvas exist, but the toolbar button is commented out
(*"Draw mode disabled for now"*, index.tsx:3652–3671), no keyboard shortcut
activates it, and nothing ever adds strokes (`setDrawStrokes` only clears,
index.tsx:2911). The stroke-capture interaction is new Svelte work guided by
the dormant plumbing and the stroke shape consumed by the output code.

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - 486–497 — draw state: `isDrawMode`, `drawStrokes`
    (`{ id, points, color, fixed }`), `hoveredDrawingIdx`, canvas/refs
  - 1830–1836 — `data-drawing-hover` attribute on `documentElement` while
    hovering a stroke
  - 1840, 1928, 2127 — picker/click/drag handlers all bail while
    `isDrawMode` is true
  - 2910–2913 — Clear all wipes strokes and the canvas
  - 2989–2991 — coordinate contract: fixed strokes are viewport coords,
    others document coords (converted with `scrollY` when consumed)
  - 3385–3389, 3429 — Escape exits draw mode; entering layout mode ("L")
    exits draw mode
  - 3652–3671 — the commented-out toolbar button (IconPencil, "D" shortcut
    label, `data-active`)
  - 3727, 3786 — Copy/Clear buttons stay enabled when only strokes exist
  - 4175–4181 — `<canvas>` JSX: outside the overlay, `data-feedback-toolbar`,
    fades with marker visibility
- `upstream/package/src/components/page-toolbar-css/styles.module.scss` —
  `.drawCanvas` (line 2058)
- `upstream/package/src/utils/screenshot.ts` (276 LOC) —
  `isDomCaptureAvailable` (31), `captureDomRegion` (91),
  `captureDrawingStrokes` (194). Not imported anywhere in upstream 3.0.2
  `src/` — it is a standalone utility we wire up here.
- `upstream/package/src/types.ts` — line 25 (`drawingIndex`, consumed in
  p3-05)

## Acceptance criteria

- [ ] Draw controller (`.svelte.ts`) holds strokes in upstream's exact shape
      `{ id: string; points: {x,y}[]; color: string; fixed: boolean }`,
      document coordinates unless `fixed` (viewport coords), color from the
      current annotation color setting
- [ ] Canvas overlay carries `data-feedback-toolbar`, sits outside the
      interactive overlay, and fades in/out with marker visibility
      (index.tsx:4179)
- [ ] In draw mode, pointer down/move/up captures a stroke and renders it on
      the canvas; strokes stay anchored to page content when scrolling
      (fixed strokes stay anchored to the viewport)
- [ ] While draw mode is active, element picking / annotation click / drag
      multi-select are suspended (handlers gate on draw mode, mirroring
      index.tsx 1840/1928/2127)
- [ ] Escape exits draw mode (before deactivating the toolbar); entering
      layout mode exits draw mode; deactivating the toolbar exits draw mode
- [ ] Hovering a stroke sets `data-drawing-hover` on `document.documentElement`
      and removes it on leave
- [ ] Clear all removes all strokes and clears the canvas; Copy and Clear
      buttons are enabled when strokes exist even with zero annotations
- [ ] Screenshot composition helper exposed from the draw controller using
      `utils/screenshot` (`captureDomRegion` with strokes composited,
      `captureDrawingStrokes` fallback); unit-tested with a mocked
      `modern-screenshot` module, including the not-installed fallback path
- [ ] Toolbar button state matches upstream 3.0.2 (button not shown —
      upstream has it commented out); draw mode is reachable via the
      exported controller and a playground-only toggle for manual testing;
      this is recorded as a PORTING.md row
- [ ] Unit tests for the controller (mode transitions, stroke capture,
      coordinate conversion) pass

## Out of scope

- Describing strokes in the generated markdown and `drawingIndex` linking
  (p3-05-draw-strokes-output)
- Re-enabling the draw button in the public toolbar UI ahead of upstream
- Any change to `utils/screenshot.ts` itself (ported in Phase 1)
- Eraser/undo or stroke colors beyond the annotation color (not in upstream)

## Notes

- PLAN.md: "Draw mode: strokes + screenshot composition (`drawingIndex`,
  `utils/screenshot`)" — this issue covers capture + composition; p3-05
  covers output.
- Keep the stroke shape and coordinate contract exact: the p3-05 output
  logic (ported from index.tsx 2968–3090) consumes it as-is.
