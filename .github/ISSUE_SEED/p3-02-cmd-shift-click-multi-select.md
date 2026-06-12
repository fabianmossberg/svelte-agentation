---
title: Cmd+Shift+Click multi-select with per-element bounding boxes
labels: phase:3, type:feature, agent:ok
milestone: Phase 3 — Advanced annotations
depends_on: p3-01-drag-multi-select
---
## Goal

Cmd+Shift+Click toggles individual elements in and out of a pending
multi-select set (highlighted live); releasing the modifier keys commits the
set as one pending annotation carrying per-element `elementBoundingBoxes`
and live element references for position tracking. Hovering or editing such
an annotation re-resolves and highlights each stored box. A one-element set
degrades to a regular (non-multi-select) annotation, exactly as upstream.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - 380–425 — pending-annotation fields (`isMultiSelect` 384,
    `elementBoundingBoxes` 393–398, `multiSelectElements` 399–400) and the
    hovered/editing target-element states (413–425)
  - 505–510 — `pendingMultiSelectElements` state
  - 1663–1767 — `createMultiSelectPendingAnnotation`: single-element
    fallback (1677–1704), multi path with fresh rects, names capped at 5
    `+N more`, `elementBoundingBoxes` in document coords, position from the
    last clicked element (1705–1764)
  - 1943–1981 — cmd+shift+click toggle select/deselect inside the click
    handler
  - 2080–2123 — keyup listener: releasing the modifiers with ≥ 1 selected
    element commits the pending annotation; deactivation clears the set
  - 2755–2813 — `handleMarkerHover`: live tracking via
    `elementBoundingBoxes` centers using `elementsFromPoint`, skipping
    markers/agentation root (2767–2781)
  - 1877–1924 — `startEditAnnotation`: same live re-resolution for editing
    (1885–1895)
  - 3390–3394 — Escape clears a pending multi-select set
  - 4340–4346, 4444–4450, 4569–4575 — live highlight rendering from
    hovered/pending/editing element refs
- `upstream/package/src/types.ts` — lines 26–31 (`elementBoundingBoxes`)
- `upstream/package/src/utils/generate-output.ts` — lines 65–67 (forensic
  multi-select note)

## Acceptance criteria

- [ ] Cmd+Shift+Click on an element adds it to the pending set; clicking an
      already-selected element removes it; each selected element is
      highlighted while the set is open
- [ ] Releasing the modifier keys with ≥ 2 elements commits one pending
      annotation: `element` = `"N elements: <first 5 names>[ +N more]"`,
      `elementPath: "multi-select"`, `isMultiSelect: true`,
      `elementBoundingBoxes` (document coords, one per element), live
      element refs kept for position queries, annotation x/y from the last
      clicked element, forensic fields from the first element
- [ ] Releasing with exactly 1 element commits a regular annotation
      (no `isMultiSelect`, no `elementBoundingBoxes`) — upstream
      index.tsx:1677–1704
- [ ] Escape clears the pending set without creating an annotation
- [ ] Hovering the saved annotation's marker highlights each stored box,
      re-resolving elements at box centers via `elementsFromPoint` and
      skipping `[data-annotation-marker]` / `[data-agentation-root]`
- [ ] Right-click/edit on the marker resolves editing target elements the
      same way (index.tsx:1885–1895)
- [ ] Compat fixture extended: a cmd+shift+click annotation (incl.
      `elementBoundingBoxes`) serializes byte-identically to upstream
      `generateOutput` at all 4 detail levels
- [ ] Manually verified in the playground
- [ ] PORTING.md row added for any deliberate divergence
- [ ] PLAN.md Phase 3 "Multi-select" checkbox ticked (completes the work
      started in p3-01)

## Out of scope

- Drag-rectangle multi-select (done in p3-01-drag-multi-select)
- Text-selection capture, draw mode
- Server sync of multi-select annotations (Phase 4)

## Notes

- `elementBoundingBoxes` and `multiSelectElements` only come from this
  flow — the drag path stores a single combined `boundingBox` (verified
  against upstream 3.0.2).
- `multiSelectElements` (live refs) is a transient pending-annotation
  field, not part of the persisted `Annotation` schema in `types.ts`.
