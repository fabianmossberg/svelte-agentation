---
title: Port utils/index.ts barrel, dropping skipped re-exports
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p1-02-port-element-identification, p1-03-port-storage, p1-06-port-sync
---
## Goal

`src/lib/utils/index.ts` mirrors upstream's utils barrel so internal and
public import paths stay upstream-shaped: it re-exports
`element-identification`, `storage`, and `sync`, and drops only the
`source-location` re-export (that file is skipped as React-fiber-bound;
Phase 7 revisits a Svelte equivalent).

## Upstream reference

- `upstream/package/src/utils/index.ts` (4 LOC): re-exports
  `./element-identification`, `./storage`, `./source-location`, `./sync`.
  Note it does NOT re-export `freeze-animations`, `screenshot`, or
  `generate-output` — neither do we.

## Acceptance criteria

- [ ] `src/lib/utils/index.ts` re-exports `./element-identification`,
      `./storage`, `./sync` in upstream's order, with the dropped line
      marked `// DIVERGENCE(upstream): source-location skipped
      (React-fiber-bound; see PORTING.md)`.
- [ ] No extra re-exports added (no freeze-animations/screenshot/
      generate-output — match upstream exactly).
- [ ] Ported tests pass: a vitest smoke test imports a representative symbol
      from each re-exported module via the barrel (e.g. `identifyElement`,
      `loadAnnotations`, `createSession`) and asserts they are functions;
      green via `pnpm test`.
- [ ] PORTING.md row updated (`utils/index.ts`, mode `adapted`, divergence:
      dropped `source-location` re-export).
- [ ] PLAN.md verified: the barrel has no dedicated Phase 1 checkbox —
      confirm the six util/type checkboxes remain the accurate progress
      record and mention the barrel in the PR description instead.

## Out of scope

- The package-level `src/lib/index.ts` export list (Phase 2 matches
  upstream's `index.ts` exports when `Agentation` exists).
- Re-exporting the skipped `react-detection`/`source-location` modules or
  stubbing them.

## Notes

Keeping the barrel upstream-shaped means future upstream diffs to
`utils/index.ts` apply with at most a one-line conflict on the dropped
re-export.
