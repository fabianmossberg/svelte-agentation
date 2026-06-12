---
title: Rewrite annotation-marker components (AnnotationMarker, PendingMarker, ExitingMarker)
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-04-port-icons, p1-99-gate
---
## Goal

Rewrite the numbered marker badge components as `src/lib/components/page-toolbar/annotation-marker/`: the persistent `AnnotationMarker` (number ⇄ edit/delete icon on hover, staggered enter, exit/renumber animations), the `PendingMarker` shown while the popup is open, and the `ExitingMarker` ghost used during delete animations.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/annotation-marker/index.tsx` — 190 LOC:
  - L5 — `MarkerClickBehavior` (`"edit" | "delete"`).
  - L11–30 — `AnnotationMarkerProps` (annotation, globalIndex, layerIndex/layerSize for stagger delays, isExiting/isClearing/isAnimated/isHovered/isDeleting/isEditingAny, renumberFrom, markerClickBehavior, tooltipStyle, hover/click/contextmenu callbacks).
  - L32–143 — `AnnotationMarker` (multi-select green vs accent color, hover state swaps number for `IconEdit`/`IconXmark`).
  - L145–174 — `PendingMarker`; L176–190 — `ExitingMarker`.
- `upstream/package/src/components/page-toolbar-css/annotation-marker/styles.module.scss` — 199 LOC (enter/exit/renumber keyframes, hover transitions).
- Consumption contract: `upstream/package/src/components/page-toolbar-css/index.tsx` L4183–4265 (two layers: scrolling and fixed), L4510–4519 (`PendingMarker` with `y - scrollY` for non-fixed).

## Acceptance criteria

- [ ] `src/lib/components/page-toolbar/annotation-marker/` exports `AnnotationMarker`, `PendingMarker`, `ExitingMarker` with prop names matching upstream (translated to Svelte 5 `$props`).
- [ ] Marker displays `globalIndex + 1`, renumbers with animation when `renumberFrom` is set below its index, and uses the green multi-select color when `annotation.isMultiSelect` (color logic from upstream L53–57).
- [ ] Hover swaps number → edit or delete icon according to `markerClickBehavior`, and fires `onHoverEnter`/`onHoverLeave`/`onClick`/`onContextMenu` like upstream.
- [ ] Staggered enter and exit animations honor `layerIndex`/`layerSize` delays and the `isAnimated`/`isExiting`/`isClearing`/`isDeleting` flags from the markers controller (timings per `styles.module.scss`).
- [ ] SCSS module (199 LOC) converted to component `<style>`; markers carry `data-feedback-toolbar` (so freeze-animations excludes them — `upstream/package/src/utils/freeze-animations.ts` L16).
- [ ] Tests pass: render with index, hover icon swap, renumber class application; `pnpm test` green.
- [ ] PORTING.md row updated.
- [ ] PLAN.md checkbox `components/page-toolbar/annotation-marker/` ticked.

## Out of scope

- Layer placement, scroll math, and which markers render where — p2-03 (state) and p2-09 (composition).
- Marker hover *tooltips* showing the comment (positioned via the toolbar's tooltip-position helper, monolith L3519–3564) — p2-09.

## Notes

Keep the three components in one `index` module like upstream so the dir diff stays 1:1.
