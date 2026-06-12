---
title: Resolve demo-mode props — implement demoAnnotations/demoDelay/enableDemoMode or document as deferred
labels: phase:5, type:feature, agent:ok
milestone: Phase 5 — Parity audit + release
depends_on: p3-99-gate
---
## Goal

Upstream's `Agentation` accepts three demo-mode props (`demoAnnotations`,
`demoDelay`, `enableDemoMode`) that auto-activate the toolbar and replay
scripted annotations — the last remaining gap in our `AgentationProps`
surface after Phase 4. PLAN.md allows "implement or document as deferred";
this issue makes that decision and executes it, so the prop-parity audit
(p5-02) can close with zero undecided props. The upstream implementation is
~50 LOC of timer logic plus a small exported type, so implementing is the
preferred outcome.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 lines
  total): `DemoAnnotation` type and the three props at lines 282–291,
  defaults `demoDelay = 1000` / `enableDemoMode = false` at lines 326–328,
  demo replay effect at lines 1143–1195 (activates toolbar at
  `demoDelay - 200` ms, then adds one annotation per entry at 300 ms
  intervals, ids prefixed `demo-`, skipped entirely when annotations already
  exist).
- `upstream/package/src/index.ts` (50 lines): exports the `DemoAnnotation`
  type (line 18).

## Acceptance criteria

- [ ] Decision (implement vs. defer) stated in the PR description with a
      one-paragraph rationale.
- [ ] **If implemented:** with `enableDemoMode` and a non-empty
      `demoAnnotations`, the toolbar auto-activates after `demoDelay - 200`
      ms and adds one annotation per entry at `demoDelay + index * 300` ms,
      populating the same fields as upstream (id prefix `demo-`, `x`/`y`
      from the element rect, `comment`, `element`, `elementPath`,
      `selectedText`, `boundingBox`, `nearbyText`, `cssClasses`); no demo
      annotations are added when annotations already exist, and pending
      timers are cleaned up on destroy.
- [ ] **If implemented:** `DemoAnnotation` is exported from `src/lib/index.ts`
      exactly as upstream's `index.ts` exports it, and a vitest (fake
      timers) covers the activation/sequencing/skip-when-nonempty behavior.
- [ ] **If deferred:** the three props are documented as deferred in the
      README compatibility section, and a follow-up issue is filed and
      linked.
- [ ] PORTING.md row updated (the `components/page-toolbar-css/index.tsx`
      row: demo mode implemented, or divergence noted as deferred).
- [ ] Existing test suite still green.

## Out of scope

- The rest of the prop-parity audit (p5-02 owns the full surface).
- Demo content for the playground or docs site.
- Design-mode demos (Phase 6).

## Notes

- Upstream schedules demo timers with `originalSetTimeout` (captured before
  `utils/freeze-animations.ts` patches timers) — mirror that, or demo replay
  breaks while animations are frozen.
- RESEARCH.md lists demo mode among the features `sv-agentation` lacks; it
  was explicitly skipped for v1 in the RESEARCH.md conclusion, which is why
  the deferral path remains acceptable here.
