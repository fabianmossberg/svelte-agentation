---
title: Annotations controller — add/edit/delete/clear state machine with localStorage persistence
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p1-99-gate
---
## Goal

Create `src/lib/internal/annotations.svelte.ts`, a Svelte 5 runes controller that owns the annotation list and its lifecycle (add → edit → delete → clear all), persisting through the ported `utils/storage.ts`. This extracts the first of the monolith's three state groups so the toolbar component (later issue) consumes a small, tested API instead of ~10 `useState`s.

## Upstream reference

`upstream/package/src/components/page-toolbar-css/index.tsx` (4709 LOC total), specifically:

- L343 — `annotations` state; L374–403 — `pendingAnnotation` shape; L418–425 — `editingAnnotation` (+ target-element tracking).
- L265–268 — `isRenderableAnnotation` helper.
- L680–719 — mount-and-load effect (loads annotations via `loadAnnotations`).
- L1221–1235 — save-annotations effect (persists on change, preserving sync markers).
- L2590–2688 — `addAnnotation`; L2689–2697 — `cancelAnnotation`.
- L2698–2753 — `deleteAnnotation` (incl. `deletedIndex` / renumber bookkeeping handoff).
- L1877–1925 — `startEditingAnnotation`; L2815–2855 — `updateAnnotation`; L2856–2866 — `cancelEditAnnotation`.
- L2867–2942 — `clearAll`.

Also `upstream/package/src/utils/storage.ts` (ported in Phase 1) for `loadAnnotations` / `saveAnnotations` / `getStorageKey`.

## Acceptance criteria

- [ ] `src/lib/internal/annotations.svelte.ts` exports a controller with reactive state (`$state`/`$derived`) covering: annotation list, pending annotation, editing annotation, and derived `visibleAnnotations` (renderable filter mirroring upstream L265–268, L3510–3518).
- [ ] API covers `add`, `cancelPending`, `startEdit`, `update`, `cancelEdit`, `remove`, `clearAll`, mirroring upstream handler semantics (e.g. `update` only changes `comment`, as upstream L2820 does).
- [ ] Annotations persist to localStorage via the ported `utils/storage.ts` (same storage key as upstream) on every mutation, and load on init — no direct `localStorage` calls in the controller.
- [ ] Controller exposes callback hooks (or accepts an options object) so a later issue can wire `onAnnotationAdd` / `onAnnotationUpdate` / `onAnnotationDelete` / `onAnnotationsClear` without modifying the controller.
- [ ] Unit tests (vitest + jsdom) cover the full add → edit → delete → clear cycle including persistence round-trip; all tests pass.
- [ ] No animation/timing state in this controller (exit animations belong to the markers controller).
- [ ] PORTING.md row updated (maps the monolith line ranges above to this file).
- [ ] PLAN.md checkbox `internal/annotations.svelte.ts` ticked.

## Out of scope

- Marker animation/exit lifecycle (`exitingMarkers`, `deletingMarkerId`, `renumberFrom`) — p2-03.
- Server sync, `_syncedTo` markers beyond what `utils/storage.ts` already preserves — Phase 4.
- Multi-select / text-selection / drawing annotation creation — Phase 3 (the controller stores whatever `Annotation` it is given, so the schema fields already exist).
- The popup UI and props wiring.

## Notes

RESEARCH.md §1 sizes the monolith rewrite at 2.5–3k LOC of new code grouped by state cluster; this controller is the "annotation state machine" cluster. Borrow *patterns* (not code) from sv-agentation's runes controllers per RESEARCH.md §5.
