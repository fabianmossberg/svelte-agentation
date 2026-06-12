---
title: Gate: Toolbar MVP done-when holds
labels: phase:2, type:test, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-01-annotations-controller, p2-02-picker-controller, p2-03-markers-controller, p2-04-port-icons, p2-05-port-primitives, p2-06-annotation-popup, p2-07-annotation-marker, p2-08-settings-panel, p2-09-page-toolbar-component, p2-10-toolbar-styles, p2-11-props-exports, p2-12-mvp-integration
---
## Goal

Verify PLAN.md Phase 2's done-when statement: "in the playground, the full annotate → output → copy loop matches upstream behavior side-by-side, with annotations surviving reload." This issue is the checklist run, executed against the playground and upstream's demo from the pinned baseline, and the sign-off that closes the phase.

## Upstream reference

Behavior baseline: `upstream/package/src/components/page-toolbar-css/index.tsx` (4709 LOC) running via the upstream demo app from the pinned clone (`/tmp/agentation`, v3.0.2 per `UPSTREAM.md`). No new code is ported in this issue.

## Acceptance criteria

Side-by-side run (our playground vs upstream demo, same interactions):

- [ ] Activate toolbar (click and Cmd/Ctrl+Shift+F), hover an element: highlight rect matches upstream's targeting.
- [ ] Click → popup → submit comment: numbered marker appears with enter animation; a second annotation gets number 2.
- [ ] Edit an annotation via its marker, save: comment updates; cancel leaves it untouched.
- [ ] Delete one annotation: exit animation plays and remaining markers renumber, matching upstream's choreography.
- [ ] Clear all: staggered exit, badge clears.
- [ ] Copy: markdown for the same interactions is structurally identical to upstream's (same sections/fields at the default detail level; React-only fields absent/empty as designed in Phase 1).
- [ ] Reload the playground mid-session: annotations and markers reappear at correct positions (including one on a fixed element).
- [ ] Keyboard shortcuts `P`/`H`/`C`/`X`/Escape behave identically, including typing guards.
- [ ] Pause animations freezes a playground animation while toolbar UI keeps animating; resume restores it.

Repo state:

- [ ] All Phase 2 PLAN.md checkboxes are ticked and every `phase:2` issue except this gate is closed.
- [ ] `pnpm test`, `pnpm build`, and publint pass on `main`; PORTING.md covers every Phase 2 file/line-range mapping.
- [ ] The side-by-side run is documented (screenshots or recording) in this issue before closing.

## Out of scope

- Fixing any deviations found — file `type:compat` issues (they outrank feature work per CONTRIBUTING) and block this gate on them via `status:blocked` rather than patching inside the gate PR.
- Multi-select, text-selection, draw mode, detail-level UI — Phase 3 scope, excluded from the side-by-side.

## Notes

PLAN.md Phase 2 done-when: "in the playground, the full annotate → output → copy loop matches upstream behavior side-by-side, with annotations surviving reload."
