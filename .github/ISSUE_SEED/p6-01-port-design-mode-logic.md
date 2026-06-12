---
title: Port design-mode logic modules (types, section-detection, spatial)
labels: phase:6, type:port, agent:ok
milestone: Phase 6 — Design mode
depends_on: p5-99-gate
---
## Goal

`src/lib/components/design-mode/` gains the three framework-free logic
modules that everything else in design mode builds on: the component
registry + placement/rearrange types, the page-section detector used by
rearrange mode, and the spatial-context engine (nearby elements, alignment,
layout groups, page layout, CSS-context formatting) that powers design
output. These are plain TypeScript with zero React imports — port verbatim,
mirroring upstream paths so upstream diffs apply cleanly.

## Upstream reference

- `upstream/package/src/components/design-mode/types.ts` (306 LOC; no
  imports) — `ComponentType` union (66 types), `DesignPlacement`,
  `DEFAULT_SIZES`, `COMPONENT_REGISTRY`, `COMPONENT_MAP`, `CanvasPurpose`,
  `WireframeOptions`, `DetectedSection`, `RearrangeState`.
- `upstream/package/src/components/design-mode/section-detection.ts`
  (266 LOC) — `generateSelector` (line 57), `labelSection` (103),
  `detectPageSections` (160), `captureElement` (232). Imports `./types` and
  `../../utils/element-identification` (ported in Phase 1).
- `upstream/package/src/components/design-mode/spatial.ts` (755 LOC; imports
  only `./section-detection`) — `getSpatialContext` (line 136),
  `formatSpatialLines` (319), `formatPositionSummary` (369), `detectGroups`
  (418), `analyzeLayoutPatterns` (489), `getPageLayout` (606),
  `getElementCSSContext` (697), `formatCSSPosition` (726).

## Acceptance criteria

- [ ] All three files copied into `src/lib/components/design-mode/` with
      `diff` against upstream empty (relative imports resolve unchanged in
      our mirrored layout); any unavoidable change carries a
      `// DIVERGENCE(upstream):` comment.
- [ ] Ported tests pass: upstream ships no design-mode tests, so new vitest
      (jsdom) unit tests cover `detectPageSections`/`generateSelector`/
      `labelSection` on a fixture DOM, `getSpatialContext` geometry
      (above/below/left/right, alignment, out-of-bounds), and
      `detectGroups`/`analyzeLayoutPatterns`; green via `pnpm test`.
- [ ] PORTING.md rows updated (three rows, mode `verbatim`).
- [ ] PLAN.md Phase 6 updated to record this item done (add the checkbox if
      the section has not been decomposed into checkboxes yet).

## Out of scope

- `design-mode/output.ts` (p6-03) and the `.tsx` UI overlays (p6-02).
- Exporting anything design-mode from `src/lib/index.ts` — upstream's
  `index.ts` exposes no design-mode symbols; design mode stays internal.
- The design-mode storage functions — already ported with `utils/storage.ts`
  in Phase 1.

## Notes

- Coarse umbrella issue: re-decompose into per-file issues when Phase 6
  starts if a single PR would exceed reviewable size.
- RESEARCH.md §1 estimates the extractable geometry/spatial logic at
  ~500 LOC; the real verbatim surface here is 1,327 LOC across three files.
