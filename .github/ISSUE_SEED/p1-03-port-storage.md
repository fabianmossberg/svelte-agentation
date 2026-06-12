---
title: Port utils/storage.ts verbatim
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p1-01-port-types
---
## Goal

`src/lib/utils/storage.ts` is a verbatim copy of upstream's localStorage
layer: per-pathname annotation persistence with 7-day retention, sync markers
(`_syncedTo`), design-mode placement/rearrange/wireframe state, session-id
storage, and the toolbar-hidden flag. This is what makes annotations survive
reloads (Phase 2) and powers server-sync bookkeeping (Phase 4).

## Upstream reference

- `upstream/package/src/utils/storage.ts` (308 LOC; single import:
  `type { Annotation } from "../types"`). 21 exported functions, e.g.
  `getStorageKey` (line 14), `loadAnnotations` (18), `saveAnnotations` (31),
  `loadAllAnnotations` (53), `saveAnnotationsWithSyncMarker` (97),
  `getUnsyncedAnnotations` (114), `loadSessionId` (255),
  `loadToolbarHidden` (288).

## Acceptance criteria

- [ ] File copied verbatim:
      `diff upstream/package/src/utils/storage.ts src/lib/utils/storage.ts`
      is empty (the `../types` relative import resolves unchanged in our
      mirrored layout).
- [ ] Ported tests pass: new vitest (jsdom) unit tests cover save/load/clear
      round-trips, the `feedback-annotations-` key prefix, retention expiry
      of stale entries, `loadAllAnnotations` across multiple pathnames, sync
      markers (`saveAnnotationsWithSyncMarker` + `getUnsyncedAnnotations` +
      `clearSyncMarkers`), session-id store, and toolbar-hidden flag; green
      via `pnpm test`.
- [ ] PORTING.md row updated (`utils/storage.ts`, mode `verbatim`, status
      ported, no divergences).
- [ ] PLAN.md checkbox ticked (Phase 1, `utils/storage.ts`).

## Out of scope

- The upstream TODO about a `StorageAdapter` abstraction — do not implement
  it; verbatim means keeping the TODO comment too.
- Design-mode callers of the placement/rearrange/wireframe functions
  (Phase 6) — the functions ship now, unused.
- Wiring storage into toolbar state (Phase 2 `annotations.svelte.ts`).

## Notes

Storage keys and the JSON shape persisted are part of the compat surface: a
page annotated with upstream and reopened with our toolbar (or vice versa)
should read the same localStorage entries.
