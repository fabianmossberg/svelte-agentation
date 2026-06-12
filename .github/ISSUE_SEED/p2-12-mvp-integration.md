---
title: Wire the MVP loop — annotate → markdown → copy, keyboard shortcuts, pause animations, reload persistence
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-10-toolbar-styles, p2-11-props-exports
---
## Goal

Connect everything into upstream's end-to-end MVP behavior: pick element → comment → marker → edit/delete → clear all → generate markdown → copy to clipboard, plus the keyboard shortcuts, the pause-animations toggle, and annotations surviving a page reload — all verified hands-on in the playground.

## Upstream reference

`upstream/package/src/components/page-toolbar-css/index.tsx`:

- L2943–3143 — `copyOutput`: builds the display URL, calls `generateOutput(annotations, displayUrl, settings.outputDetail)`, honors `copyToClipboard`, fires `onCopy`, sets the `copied` status state (L404), and honors `autoClearAfterCopy` (skip the draw-strokes and design branches — Phases 3/6).
- L3365–3509 — keyboard shortcuts: Escape cascade (close popup/deactivate, L3375–3401), Cmd/Ctrl+Shift+F toggle (L3404–3412), `P` pause/resume (L3419), `H` hide/show markers (L3440), `C` copy (L3449), `X` clear all (L3458); typing guard (L3368–3373). `L` (layout) and `S` (send) stay unwired — Phases 6/4.
- L1642–1661 — `freezeAnimations`/`unfreezeAnimations`/`toggleFreeze` delegating to the ported `utils/freeze-animations.ts`; L1786–1792 — unfreeze on unmount safety.
- L680–719 + L1221–1235 — load/save giving reload persistence (already in p2-01; verified end-to-end here).
- L526–543 — `hideTooltipsUntilMouseLeave` choreography used by every button/shortcut.

## Acceptance criteria

- [ ] Playground manual loop works and is documented (gif or step list in the PR): activate → hover highlight → click element → popup → submit comment → numbered marker → right-click/click marker to edit → save → delete → clear all (staggered) → copy markdown.
- [ ] Copy uses the ported `generateOutput` with the live `settings.outputDetail`, writes to the clipboard when `copyToClipboard`, fires `onCopy(markdown)`, shows the copied status state, and honors `autoClearAfterCopy` (L2943–3143 minus draw/design branches).
- [ ] Keyboard shortcuts behave per upstream incl. guards: Escape cascade, Cmd/Ctrl+Shift+F, `P`, `H` (only with annotations), `C` (only with annotations), `X` (only with annotations); none fire while typing in inputs/textareas/contenteditable.
- [ ] Pause-animations button + `P` freeze/unfreeze page animations via `utils/freeze-animations.ts`; toolbar UI itself keeps animating (`data-feedback-toolbar` exclusion); page unfreezes if the component unmounts while frozen.
- [ ] Annotations survive a full page reload in the playground: markers reappear at correct positions (scrolling and fixed) with the saved comments.
- [ ] Integration tests pass (vitest + jsdom): copy flow fires `onCopy` and clipboard mock, shortcut guards, freeze toggle calls into freeze-animations; `pnpm test` green.
- [ ] PORTING.md row updated (copyOutput + shortcuts line ranges → new locations).
- [ ] PLAN.md "Wire MVP features" checkbox ticked.

## Out of scope

- Markdown content correctness beyond what Phase 1's fixture test already guarantees (`generateOutput` is ported and parity-tested; this issue only feeds it correctly).
- Draw-stroke descriptions and design-output sections of `copyOutput` (L2969–3040 area) — Phases 3/6.
- `S` send-to-webhook shortcut and `sendState` UI — Phase 4.
- Demo mode (L1143–1196) — Phase 5 audit.

## Notes

PLAN's done-when for the phase rides on this issue: "full annotate → output → copy loop matches upstream behavior side-by-side, with annotations surviving reload." Test against upstream's demo app running from the pinned `/tmp/agentation` clone for the side-by-side.
