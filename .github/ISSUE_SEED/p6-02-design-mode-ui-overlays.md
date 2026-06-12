---
title: Rewrite the design-mode UI overlays in Svelte 5 (canvas, palette, rearrange, skeletons)
labels: phase:6, type:feature, agent:ok
milestone: Phase 6 — Design mode
depends_on: p6-01-port-design-mode-logic
---
## Goal

The three design-mode overlays and their skeleton renderer exist as Svelte 5
components under `src/lib/components/design-mode/`, wired into the toolbar:
a design-mode toggle activates the placement canvas (drag/resize/snap of
component skeletons), the component palette (66-type grid with drag-to-place),
and rearrange mode (detected page sections, drag reordering). Placements
persist across reloads via the Phase 1 storage functions. This is a rewrite
(runes + `.svelte.ts` state where it helps), not a port — borrow patterns
from the Phase 2 toolbar decomposition.

## Upstream reference

- `upstream/package/src/components/design-mode/index.tsx` (823 LOC) —
  `DesignMode` canvas overlay: 8-handle resize, `computeSnap` guides
  (`SNAP_THRESHOLD` 5px), multi-select, drag lifecycle callbacks, inline
  `AnnotationPopupCSS` for placement notes.
- `upstream/package/src/components/design-mode/palette.tsx` (944 LOC) —
  `DesignPalette` (line 758), `ComponentGrid` (648), `PaletteIconSvg` (22).
- `upstream/package/src/components/design-mode/rearrange.tsx` (1,060 LOC) —
  `RearrangeOverlay` (line 135) over `detectPageSections` results, tracking
  `originalRect`/`currentRect` per section.
- `upstream/package/src/components/design-mode/skeletons.tsx` (1,173 LOC) —
  `Skeleton` (line 1159): wireframe preview per `ComponentType`.
- `upstream/package/src/components/design-mode/styles.module.scss`
  (1,686 LOC) — convert to component `<style>` blocks as in Phase 2.
- Toolbar integration points:
  `upstream/package/src/components/page-toolbar-css/index.tsx`
  (`isDesignMode` line 438, `canvasPurpose` 447, marker suppression 652,
  `closeDesignMode` 1616, Escape handling 1630).

## Acceptance criteria

- [ ] Svelte components mirroring the four upstream file names exist under
      `src/lib/components/design-mode/`, mounted/unmounted by the toolbar
      like upstream (markers hidden while design mode is active; Escape and
      the toolbar button close it; exit animations preserved).
- [ ] Playground parity with upstream side-by-side: open palette → drag a
      component onto the page → skeleton placed at drop point with default
      size; placements movable and resizable with snap guides; rearrange
      mode lists detected sections and supports drag reordering; dark mode
      respected.
- [ ] Placements survive a reload via `loadDesignPlacements` /
      `saveDesignPlacements` / `clearDesignPlacements` (ported in Phase 1,
      `src/lib/utils/storage.ts` lines 144–167 upstream).
- [ ] Converted styles keep `data-feedback-toolbar` attributes (the
      freeze-animations exclusion contract) and the keyframe animations.
- [ ] Vitest tests for the extracted interaction logic (snap math,
      placement add/move/resize/delete, section reorder) pass via
      `pnpm test`.
- [ ] PORTING.md rows updated (mode `rewrite`) for all four `.tsx` files and
      the SCSS module.
- [ ] PLAN.md Phase 6 updated to record this item done.

## Out of scope

- Markdown output and `kind: "placement" | "rearrange"` annotation emission
  (p6-03) — overlays only manage in-page state here.
- Blank-canvas/wireframe output options (p6-03 owns how `canvasPurpose` and
  `wireframePurpose` reach the generator).
- New public exports from `src/lib/index.ts`.

## Notes

- Coarse umbrella issue (~4,000 LOC of upstream `.tsx` + 1,686 SCSS):
  re-decompose into one issue per overlay when Phase 6 starts.
- Upstream's `index.tsx` imports `originalSetTimeout` from
  `utils/freeze-animations` and reuses `annotation-popup-css` — our Phase 1
  util and Phase 2 popup map 1:1.
