---
title: Gate: Design mode done-when holds
labels: phase:6, type:test, agent:ok
milestone: Phase 6 — Design mode
depends_on: p6-01-port-design-mode-logic, p6-02-design-mode-ui-overlays, p6-03-design-output-integration
---
## Goal

Verify Phase 6 as a whole. PLAN.md's Phase 6 paragraph has no explicit
"Done when" line; its implicit one — logic ported, the three UI overlays
rewritten in Svelte, and design work emitting
`kind: "placement" | "rearrange"` annotations per the schema with
upstream-indistinguishable output — is decomposed below. Close only when
every box is verified against merged `main` and a live playground run, not
against PR claims. Phase 6's umbrella issues may have been re-decomposed
since seeding; this gate covers whatever issue set replaced them.

## Upstream reference

- `upstream/package/src/components/design-mode/` — 9 files, 7,454 LOC total
  (4 logic `.ts` = 1,768; 4 UI `.tsx` = 4,000; SCSS = 1,686).
- `upstream/package/src/types.ts` lines 33–52 — the `kind` / `placement` /
  `rearrange` schema contract this phase must satisfy.

## Acceptance criteria

- [ ] `types.ts`, `section-detection.ts`, `spatial.ts`, `output.ts` under
      `src/lib/components/design-mode/` each `diff` clean against upstream
      (or carry documented `// DIVERGENCE(upstream):` markers with
      PORTING.md rows).
- [ ] Playground run: design-mode toggle → palette drag-place → skeleton
      resize/snap → rearrange section reordering all work side-by-side with
      upstream's demo behavior; placements survive a reload; markers and
      design mode never show simultaneously.
- [ ] A placement and a rearrange interaction performed in our toolbar each
      produce an annotation whose `kind` and structured `placement` /
      `rearrange` fields validate against upstream `types.ts` lines 33–52.
- [ ] Design/rearrange fixture-parity tests (p6-03) are in CI and green:
      byte-identical markdown vs upstream's generator at all 4 detail
      levels.
- [ ] Full test suite green on `main` via `pnpm test`; `pnpm build` still
      produces a publishable package with no new public exports beyond
      upstream's surface.
- [ ] PORTING.md has a row for every `design-mode/` file (verbatim or
      rewrite); PLAN.md Phase 6 section fully ticked.

## Out of scope

- Fixing anything found wanting — file the specific issue (output/schema
  deviations get `type:compat`); this gate only verifies.
- Phase 7 (Svelte component detection) work.
- Publishing the release that includes design mode (follows the ongoing
  upstream-sync/release process, not this gate).

## Notes

- The side-by-side check needs upstream's example app running from the
  pinned `/tmp/agentation` clone — same approach as the Phase 2 gate.
- RESEARCH.md §1 flags design mode's geometry logic as the portable core
  and the overlays as rewrite-only; the gate's diff-clean criterion applies
  to the four `.ts` modules, never the `.svelte` rewrites.
