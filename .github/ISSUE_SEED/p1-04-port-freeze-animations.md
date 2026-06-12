---
title: Port utils/freeze-animations.ts verbatim
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p0-01-scaffold-package
---
## Goal

`src/lib/utils/freeze-animations.ts` is a verbatim copy of upstream's
animation freezer: it monkey-patches `setTimeout` / `setInterval` /
`requestAnimationFrame` (installed as an import side effect, state parked on
`window` to survive HMR), injects CSS that pauses animations/transitions
except inside agentation UI, pauses WAAPI animations and videos, and exposes
`freeze()` / `unfreeze()` plus the `original*` escape hatches the toolbar
must use for its own timers.

## Upstream reference

- `upstream/package/src/utils/freeze-animations.ts` (266 LOC, zero imports).
  Key surface: `EXCLUDE_ATTRS = ["data-feedback-toolbar",
  "data-annotation-popup", "data-annotation-marker"]` (lines 15–19),
  `originalSetTimeout` / `originalSetInterval` /
  `originalRequestAnimationFrame` (144–146), `freeze()` (157),
  `unfreeze()` (205).

## Acceptance criteria

- [ ] File copied verbatim:
      `diff upstream/package/src/utils/freeze-animations.ts src/lib/utils/freeze-animations.ts`
      is empty.
- [ ] Ported tests pass: new vitest (jsdom) unit tests verify that after
      `freeze()` patched `setTimeout`/RAF callbacks are queued (not run),
      `originalSetTimeout` still fires, `unfreeze()` flushes the queues and
      removes the injected `feedback-freeze-styles` style element, and the
      injected CSS contains the three `data-*` exclusion attributes; green
      via `pnpm test`.
- [ ] PORTING.md row updated (`utils/freeze-animations.ts`, mode `verbatim`,
      status ported, no divergences).
- [ ] PLAN.md checkbox ticked (Phase 1, `utils/freeze-animations.ts`).

## Out of scope

- Renaming or extending `EXCLUDE_ATTRS` — Phase 2 components must adopt
  these exact `data-feedback-toolbar` etc. attributes; the contract is
  defined here and must stay byte-identical.
- A "cleaner" install mechanism than the import side effect — verbatim
  includes the side effect.
- Toolbar `pauseAnimations` wiring (Phase 2).

## Notes

Because patching happens on import, tests should import the module inside
the test (or reset the `__agentation_freeze` window state between tests) to
keep vitest workers deterministic.
