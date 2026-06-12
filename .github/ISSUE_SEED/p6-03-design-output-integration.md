---
title: Port design-mode output generator and emit placement/rearrange annotations
labels: phase:6, type:port, agent:ok
milestone: Phase 6 — Design mode
depends_on: p6-01-port-design-mode-logic, p6-02-design-mode-ui-overlays
---
## Goal

Design-mode work serializes exactly like upstream: `output.ts` is ported
verbatim, the toolbar creates annotations with
`kind: "placement" | "rearrange"` and the structured `placement`/`rearrange`
schema fields, and the generated markdown appends the design and rearrange
sections (reference frame, spatial context, pixel→CSS translation) at all
four detail levels. Fixture parity against upstream's generator proves the
output is indistinguishable.

## Upstream reference

- `upstream/package/src/components/design-mode/output.ts` (441 LOC; imports
  `./types` and `./spatial`) — `generateDesignOutput` (line 77),
  `generateRearrangeOutput` (254), `formatReferenceFrame` (33); honors
  `OutputDetailLevel` and `blankCanvas`/`wireframePurpose` options.
- `upstream/package/src/types.ts` lines 33–52 — `kind`, `placement{}`, and
  `rearrange{}` fields (already in our `types.ts` since Phase 1).
- `upstream/package/src/components/page-toolbar-css/index.tsx` —
  `kind: "placement"` annotation creation (line 1368), `kind: "rearrange"`
  (1471), design/rearrange output appended to generated markdown
  (lines 3092–3170).

## Acceptance criteria

- [ ] `src/lib/components/design-mode/output.ts` copied verbatim
      (`diff` against upstream empty).
- [ ] Toolbar emits annotations carrying `kind: "placement"` with
      `placement: { componentType, width, height, scrollY, text? }`, and
      `kind: "rearrange"` with
      `rearrange: { selector, label, tagName, originalRect, currentRect }`
      — field names and shapes byte-identical to upstream's schema.
- [ ] Copy/submit output appends `generateDesignOutput` /
      `generateRearrangeOutput` sections exactly where upstream does, at all
      4 detail levels, including the blank-canvas/wireframe variants.
- [ ] Compatibility fixture test (extends the Phase 1 harness): identical
      `DesignPlacement[]` and `RearrangeState` fixtures fed to our generator
      and upstream's produce byte-identical markdown at all 4 detail levels;
      fixtures regenerated from upstream by script, never hand-edited.
- [ ] Ported tests pass: vitest unit tests for `generateDesignOutput` and
      `generateRearrangeOutput` (upstream ships none) green via `pnpm test`.
- [ ] PORTING.md row updated (`design-mode/output.ts`, mode `verbatim`).
- [ ] PLAN.md Phase 6 updated to record this item done.

## Out of scope

- Changes to `utils/generate-output.ts` — upstream appends design output in
  the toolbar, not inside the core generator (0 design references in that
  file); keep that separation.
- Server-sync semantics for the new kinds — placement/rearrange annotations
  flow through the existing Phase 4 sync path untouched.
- UI affordances for editing placements (p6-02).

## Notes

- `generateDesignOutput` calls `getPageLayout`/`getSpatialContext` against
  the live DOM, so byte-identical fixtures need a pinned jsdom viewport and
  DOM fixture shared with the upstream-side generation script — budget for
  that in the harness extension.
- `type:compat` outranks everything if output deviates: any diff found after
  merge is filed as `type:compat`, per CONTRIBUTING.md.
