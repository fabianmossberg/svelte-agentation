---
title: Port utils/screenshot.ts verbatim
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p0-01-scaffold-package
---
## Goal

`src/lib/utils/screenshot.ts` is a verbatim copy of upstream's drawing
screenshot module: it captures a DOM region to canvas via the optional
`modern-screenshot` peer dependency (dynamic import, cached probe), falls
back to stroke-only canvas rendering when the dep is absent, and composites
drawing strokes on top (`captureDomRegion`, `captureDrawingStrokes`,
`isDomCaptureAvailable`). Phase 3's draw mode consumes it.

## Upstream reference

- `upstream/package/src/utils/screenshot.ts` (276 LOC; no internal imports —
  only the dynamic `import("modern-screenshot")`). Exports:
  `isDomCaptureAvailable` (line 31), `captureDomRegion` (91),
  `captureDrawingStrokes` (194).

## Acceptance criteria

- [ ] File copied verbatim:
      `diff upstream/package/src/utils/screenshot.ts src/lib/utils/screenshot.ts`
      is empty.
- [ ] `modern-screenshot` declared the same way upstream's `package.json`
      declares it (optional peer dependency), so consumers without it get the
      graceful fallback, not an install error.
- [ ] Ported tests pass: new vitest (jsdom) unit tests cover
      `isDomCaptureAvailable` caching (probe runs once), the
      fallback path of `captureDrawingStrokes` with a stubbed 2D canvas
      context (jsdom has no real canvas — mock `HTMLCanvasElement.prototype.getContext`),
      and `captureDomRegion` behavior when the module is unavailable; green
      via `pnpm test`.
- [ ] PORTING.md row updated (`utils/screenshot.ts`, mode `verbatim`, status
      ported, no divergences).
- [ ] PLAN.md checkbox ticked (Phase 1, `utils/screenshot.ts`).

## Out of scope

- Draw-mode UI, stroke capture interaction, `drawingIndex` wiring (Phase 3).
- Adding `modern-screenshot` as a hard dependency or bundling it.
- Visual/pixel assertions — jsdom cannot rasterize; test control flow, not
  pixels.

## Notes

Check `upstream/package/package.json` for the exact `peerDependenciesMeta`
declaration of `modern-screenshot` and mirror it.
