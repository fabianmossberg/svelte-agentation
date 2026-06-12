---
title: Toolbar style parity — convert the page-toolbar SCSS module preserving resets, variables, keyframes
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-09-page-toolbar-component
---
## Goal

Convert upstream's main toolbar stylesheet — the largest SCSS module in the package — into the Svelte toolbar's styles so the MVP is visually indistinguishable from upstream: zero-specificity `:where()` resets, the `--agentation-*` CSS variable system, dark/light theming via `data-agentation-theme`, accent colors via `data-agentation-accent`, and every keyframe animation the shell/markers/overlay rely on.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/styles.module.scss` — 2223 LOC: toolbar morph (collapsed/expanded/entrance/hiding), button tooltips + shortcut chips, badge, markers layer, overlay/hover-highlight, multi/single-select outlines, draw canvas, status states (copied/cleared/sending), keyframes.
- `upstream/package/src/components/page-toolbar-css/index.tsx` L3565–3566 — theme/accent/root data attributes the selectors key off; L206–231 — injected `agentation-color-tokens` (delivered in p2-08, must compose with these styles).
- `upstream/package/src/utils/freeze-animations.ts` L16 — `data-feedback-toolbar` is the exclusion selector freeze-animations depends on: every styled toolbar element must keep it.

## Acceptance criteria

- [ ] All selectors used by the Phase 2 toolbar (shell, buttons, tooltips, badge, markers layer, overlay, hover highlight, popup positioning wrappers) are converted from `styles.module.scss` into component `<style>` blocks (or a shared stylesheet imported by the toolbar) with computed styles matching upstream for the MVP surface.
- [ ] `:where()` zero-specificity resets are preserved verbatim where upstream uses them — host-page CSS with low specificity must still not leak in, and our styles must not win specificity wars they don't win upstream.
- [ ] All `--agentation-*` custom properties keep their upstream names and values; dark/light theme switches via `data-agentation-theme`, accent via `data-agentation-accent` (composing with p2-08's injected color tokens).
- [ ] Every keyframe animation reachable in Phase 2 (toolbar morph/entrance, badge fade, marker enter/exit/renumber stagger, status transitions) is ported with upstream durations/easings.
- [ ] `data-feedback-toolbar` remains on every toolbar-owned element after styling refactors (grep the rendered DOM in a test) — the freeze-animations exclusion contract.
- [ ] Side-by-side check in the playground vs upstream's demo (same page, both toolbars screenshotted in collapsed, expanded, marker-hover, popup-open states) recorded in the PR description.
- [ ] `pnpm build` succeeds and publint passes (no SCSS toolchain leaking into the published package).
- [ ] PORTING.md row updated for `page-toolbar-css/styles.module.scss`.
- [ ] PLAN.md Styles checkbox ticked.

## Out of scope

- Styles for design mode, draw canvas active-mode, multi-select outlines beyond static port (their features land in Phases 3/6 — port the rules, don't wire them).
- settings-panel/popup/marker SCSS — already converted in p2-06/07/08; this issue only reconciles shared variables/resets they depend on.

## Notes

CSS-module class names (`styles.toolbar` etc.) become Svelte-scoped classes; where upstream class names are part of an observable contract (none known besides data attributes), keep the data attributes as the stable hooks. Document any `:global()` escape hatches with `// DIVERGENCE(upstream):`.
