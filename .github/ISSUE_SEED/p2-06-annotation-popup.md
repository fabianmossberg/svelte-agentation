---
title: Rewrite annotation-popup as a Svelte component (shake via exported function, not forwardRef)
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-04-port-icons, p1-99-gate
---
## Goal

Rewrite upstream's comment popup as `src/lib/components/annotation-popup/` — the textarea card shown when creating or editing an annotation, with submit/cancel/delete actions, focus management that bypasses focus traps, and the invalid-submit shake. React's `forwardRef`/`useImperativeHandle` `.shake()` handle becomes an exported function on the component instance (or a `$bindable`), per PLAN.

## Upstream reference

- `upstream/package/src/components/annotation-popup-css/index.tsx` — 300 LOC:
  - L14–25 — `focusBypassingTraps` (blocks focus-trap libs while focusing the textarea).
  - L31–60 — `AnnotationPopupCSSProps` (element, timestamp, selectedText, computedStyles, placeholder, initialValue, submitLabel, onSubmit, onCancel, onDelete, position…).
  - L62–65 — `AnnotationPopupCSSHandle` with `shake()`; L71, L135–147 — `forwardRef` + `useImperativeHandle` exposing it; L99, L130, L136–143 — shake timer using `originalSetTimeout`.
- `upstream/package/src/components/annotation-popup-css/styles.module.scss` — 437 LOC (incl. `.shake` keyframes, enter/exit transitions).
- Usage sites to stay compatible with: `upstream/package/src/components/page-toolbar-css/index.tsx` L629–630 (`popupRef`/`editPopupRef`), L4519–4560 (pending popup), L4648–4709 (edit popup with `onDelete`).

## Acceptance criteria

- [ ] `src/lib/components/annotation-popup/` exports the popup component with a props surface matching upstream `AnnotationPopupCSSProps` names/semantics (TypeScript prop names identical; React-specific types translated).
- [ ] `shake()` is callable from the parent without refs-as-props React idioms: exported instance function (documented) — repeated invalid submits restart the shake animation, matching upstream timer behavior (uses `originalSetTimeout`).
- [ ] Focus lands in the textarea on open via a port of `focusBypassingTraps` (L14–25); Escape triggers `onCancel`, Cmd/Ctrl+Enter (and the upstream submit button) trigger `onSubmit` with the comment text.
- [ ] Empty-comment submit shakes instead of submitting (upstream behavior).
- [ ] `styles.module.scss` (437 LOC) converted into the component `<style>` with shake/enter/exit keyframes preserved; popup root keeps `data-feedback-toolbar`.
- [ ] Tests pass: render, type-and-submit, cancel, delete-button presence when `onDelete` given, shake on empty submit (fake timers); `pnpm test` green.
- [ ] PORTING.md row updated.
- [ ] PLAN.md checkbox `components/annotation-popup/` ticked.

## Out of scope

- Mounting/positioning the popup inside the toolbar overlay — p2-09.
- The public `AnnotationPopupCSS` export name from `index.ts` — p2-11 (component file just needs to be exportable under that name).
- Multi-select / draw-mode placeholder variants beyond passing `placeholder` through — Phase 3.

## Notes

PLAN explicitly calls out replacing `forwardRef`/`useImperativeHandle` `.shake()` with "an exported function / bindable" — in Svelte 5, `export function shake()` inside the component plus `let popup = $state<ReturnType<typeof Popup>>()` at the call site is the closest idiom.
