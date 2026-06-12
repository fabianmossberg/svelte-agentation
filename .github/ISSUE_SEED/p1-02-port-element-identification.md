---
title: Port utils/element-identification.ts verbatim
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p0-01-scaffold-package
---
## Goal

`src/lib/utils/element-identification.ts` is a verbatim copy of upstream's
element-identification module: element naming (`identifyElement`), DOM paths
(`getElementPath`, `getFullElementPath`), shadow DOM traversal
(`closestCrossingShadow`, `isInShadowDOM`, `getShadowHost`), nearby
text/elements, computed-style snapshots (standard/detailed/forensic), and
accessibility info — the data source for almost every `Annotation` field.

## Upstream reference

- `upstream/package/src/utils/element-identification.ts` (615 LOC, zero
  imports — fully self-contained). 16 exported functions, e.g.
  `identifyElement` (line 103), `getElementPath` (62), `getNearbyText` (221),
  `getNearbyElements` (310), `getComputedStylesSnapshot` (391),
  `getForensicComputedStyles` (514), `getAccessibilityInfo` (560),
  `getFullElementPath` (586).

## Acceptance criteria

- [ ] File copied verbatim:
      `diff upstream/package/src/utils/element-identification.ts src/lib/utils/element-identification.ts`
      is empty (no DIVERGENCE comments needed).
- [ ] Ported tests pass: new vitest (jsdom) unit tests cover at least
      `identifyElement`, `getElementPath`, the three shadow-DOM helpers,
      `getNearbyText`, `getElementClasses`, and `getAccessibilityInfo`
      against constructed DOM trees (incl. one shadow-root case); green via
      `pnpm test`.
- [ ] PORTING.md row updated (`utils/element-identification.ts`, mode
      `verbatim`, status ported, no divergences).
- [ ] PLAN.md checkbox ticked (Phase 1, `utils/element-identification.ts`).

## Out of scope

- Any behavior change, even where jsdom's `getComputedStyle` returns less
  than a real browser — tests adapt to the function, not vice versa.
- Toolbar integration (Phase 2 `picker.svelte.ts` consumes this).
- React component / source-file detection (skipped files; Phase 7).

## Notes

Upstream ships no tests for this file (its only util tests cover the two
skipped React-fiber modules), so the unit tests written here are new. jsdom
computed styles are sparse; prefer asserting structure/containment over exact
style values.
