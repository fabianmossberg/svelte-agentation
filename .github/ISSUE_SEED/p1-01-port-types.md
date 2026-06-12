---
title: Port types.ts, absorbing OutputDetailLevel and ReactComponentMode
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p0-01-scaffold-package
---
## Goal

`src/lib/types.ts` carries the upstream `Annotation` schema (the compat
contract: ~25 fields incl. protocol fields, `kind`, `placement`, `rearrange`),
plus `Session` / `ThreadMessage` types — identical names and shapes — and
additionally hosts `OutputDetailLevel` and `ReactComponentMode`, which
upstream leaks from the toolbar component (see RESEARCH.md). Every other
Phase 1 port imports types from here.

## Upstream reference

- `upstream/package/src/types.ts` (109 LOC) — port in full.
- `upstream/package/src/components/page-toolbar-css/index.tsx` lines 142–144 —
  `export type OutputDetailLevel = "compact" | "standard" | "detailed" | "forensic"`
  and `export type ReactComponentMode = "smart" | "filtered" | "all" | "off"` —
  move these two type aliases into our `types.ts`.

## Acceptance criteria

- [ ] `src/lib/types.ts` exports `Annotation`, `AnnotationIntent`,
      `AnnotationSeverity`, `AnnotationStatus`, `Session`, `SessionStatus`,
      `SessionWithAnnotations`, `ThreadMessage` with shapes byte-compatible
      with upstream (no renamed/dropped/retyped fields, incl. the React-only
      optional fields `reactComponents` and `sourceFile` and the local-only
      `_syncedTo`).
- [ ] `OutputDetailLevel` and `ReactComponentMode` are exported from
      `types.ts`, each marked with a `// DIVERGENCE(upstream): moved from
      components/page-toolbar-css` comment.
- [ ] Ported tests pass: a vitest type/shape test that assigns an
      upstream-shaped fixture object (all optional fields populated) to our
      `Annotation` type compiles and runs green via `pnpm test`.
- [ ] `pnpm build` (svelte-package) still succeeds.
- [ ] PORTING.md row updated (`types.ts`, mode `adapted`, divergence noted).
- [ ] PLAN.md checkbox ticked (Phase 1, `types.ts`).

## Out of scope

- Porting any `utils/` file (separate issues).
- Re-exporting types from the package `index.ts` export list (Phase 2 wires
  the public export surface).
- Any schema "improvements" — field names and optionality are frozen by the
  compat contract.

## Notes

RESEARCH.md section 1: `types.ts` "IS the compat contract". PORTING.md plans
this file as `adapted` solely because of the two absorbed enums; everything
else stays verbatim.
