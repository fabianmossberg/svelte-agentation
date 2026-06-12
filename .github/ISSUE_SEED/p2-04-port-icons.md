---
title: Port components/icons.tsx (pure SVG) to Svelte
labels: phase:2, type:port, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p0-01-scaffold-package
---
## Goal

Port upstream's icon set — pure SVG with no React logic beyond props — to `src/lib/components/icons/`, keeping every export name identical so the toolbar, markers, popup, and settings panel can import them exactly as upstream does, and so `index.ts` can re-export `*` like upstream's.

## Upstream reference

- `upstream/package/src/components/icons.tsx` — 1073 LOC. Plain SVG function components (e.g. `IconListSparkle`, `IconTrash`, `IconEdit`, `IconPlus`, `IconXmark`, `IconHelp`, `IconLayout`) plus animated two-state icons (`IconPausePlayAnimated`, `IconEyeAnimated`) that toggle CSS classes.
- `upstream/package/src/components/icon-transitions.module.scss` — 51 LOC, transition classes used by the animated icons.

## Acceptance criteria

- [ ] Every component exported from upstream `icons.tsx` exists with the identical export name (Svelte components, one file per icon or a structure that still allows `export * from "./components/icons"`).
- [ ] Animated icons (`IconPausePlayAnimated`, `IconEyeAnimated`) accept the same state props (`isPaused`, `isOpen`) and reproduce the transitions from `icon-transitions.module.scss`.
- [ ] `size`/`className`-style props behave as upstream (default sizes preserved).
- [ ] Tests pass: a smoke test renders every exported icon and asserts an `<svg>` with the upstream viewBox; `pnpm test` green.
- [ ] PORTING.md row updated for `components/icons.tsx` + `icon-transitions.module.scss`.
- [ ] PLAN.md: `icons` marked done inside the Primitives checkbox (tick the full checkbox only if checkbox/switch/tooltip/help-tooltip are already merged).

## Out of scope

- Any component that *uses* the icons (toolbar, markers, popup, settings) — later issues.
- Restyling, renaming, or pruning "unused" icons — keep the full set so upstream diffs apply cleanly.

## Notes

RESEARCH.md §1 lists `components/icons.tsx` under "portable verbatim … trivially convertible". JSX attribute casing (`strokeWidth` → `stroke-width`, `className` → `class`) is the bulk of the mechanical work.
