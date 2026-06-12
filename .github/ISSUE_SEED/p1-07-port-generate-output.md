---
title: Port utils/generate-output.ts with enums imported from types.ts
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p1-01-port-types
---
## Goal

`src/lib/utils/generate-output.ts` produces the markdown that agents consume
— `generateOutput(annotations, pathname, detailLevel)` with the four detail
levels (compact / standard / detailed / forensic) — byte-identical to
upstream. The only change is the import: `OutputDetailLevel` and
`ReactComponentMode` come from our `types.ts` instead of the React toolbar
component (`adapted` per PORTING.md). React-specific fields (`sourceFile`,
`reactComponents`) keep their output logic; they simply stay
empty/undefined until Phase 7.

## Upstream reference

- `upstream/package/src/utils/generate-output.ts` (129 LOC). Lines 1–5 are
  the import block to adapt (upstream imports the two enums from
  `../components/page-toolbar-css`); lines 7–25 export
  `OUTPUT_TO_REACT_MODE` and `OUTPUT_DETAIL_OPTIONS`; lines 27–129 are
  `generateOutput` — port these byte-identically.

## Acceptance criteria

- [ ] `diff upstream/package/src/utils/generate-output.ts src/lib/utils/generate-output.ts`
      shows only the import-block change, marked
      `// DIVERGENCE(upstream): enums imported from ../types (upstream leaks
      them from the toolbar component)`.
- [ ] Exports `generateOutput`, `OUTPUT_TO_REACT_MODE`,
      `OUTPUT_DETAIL_OPTIONS` under unchanged names.
- [ ] Ported tests pass: new vitest unit tests cover all four detail levels
      on a populated annotation, the empty-array early return (`""`), the
      compact 30-char `selectedText` truncation, the `nearbyText`-suppressed-
      by-`selectedText` rule, and the `sourceFile`/`reactComponents` lines
      appearing when those fields are set; green via `pnpm test`.
- [ ] Tests that exercise the no-`window` branches (viewport "unknown",
      forensic environment block without URL/UA/timestamp) run in vitest's
      `node` environment, matching how the Phase 1 compat fixtures are
      generated.
- [ ] PORTING.md row updated (`utils/generate-output.ts`, mode `adapted`,
      divergence: import source).
- [ ] PLAN.md checkbox ticked (Phase 1, `utils/generate-output.ts`).

## Out of scope

- The cross-implementation fixture comparison — that is
  p1-09-compat-fixture-harness; this issue only needs our own unit tests.
- Populating `sourceFile`/`reactComponents` (Phase 7) or any output-format
  change whatsoever (`type:compat` territory).
- Settings-panel UI for detail levels (Phase 3).

## Notes

RESEARCH.md calls this file "~95% portable; it only leaks two enum types
from the toolbar component that belong in `types.ts`". Output formatting,
including whitespace, heading levels, and the final `.trim()`, is the compat
contract — resist all cleanup.
