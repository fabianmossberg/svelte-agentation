---
title: Prop-by-prop parity audit of AgentationProps against upstream
labels: phase:5, type:test, agent:ok
milestone: Phase 5 — Parity audit + release
depends_on: p4-99-gate, p5-01-demo-mode-props
---
## Goal

Prove that our exported `Agentation` component accepts upstream's full
`AgentationProps` surface — same names, same types, same call signatures,
same defaults — and that every prop is either implemented and verified or
explicitly documented as deferred. The deliverable is an audit table
committed to the repo plus a compile-time parity test that keeps the surface
from drifting after release.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 lines
  total): `PageFeedbackToolbarCSSProps` and the `AgentationProps` alias at
  lines 282–319 (15 props: `demoAnnotations`, `demoDelay`, `enableDemoMode`,
  `onAnnotationAdd`, `onAnnotationDelete`, `onAnnotationUpdate`,
  `onAnnotationsClear`, `onCopy`, `onSubmit`, `copyToClipboard`, `endpoint`,
  `sessionId`, `onSessionCreated`, `webhookUrl`, `className`); defaults at
  lines 325–339 (`demoDelay = 1000`, `enableDemoMode = false`,
  `copyToClipboard = true`).
- `upstream/package/src/index.ts` (50 lines): the public type exports
  (`AgentationProps`, `DemoAnnotation`) at line 18.

## Acceptance criteria

- [ ] An audit table (in COMPAT.md, or a new section the PR justifies)
      lists all 15 upstream props with: type, default, our status
      (implemented / deferred), and the verifying test or issue link.
- [ ] Every prop is either implemented or carries a documented-deferred row
      with a linked follow-up issue — no "unknown" rows.
- [ ] A compile-time parity test asserts that every field of upstream's
      `AgentationProps` (name, type, optionality) is accepted by our
      component's props type with an identical signature. The upstream type
      must be sourced from the pinned tree (via `./scripts/upstream.sh`) or
      a script-generated fixture — never hand-copied (CONTRIBUTING compat
      guardrail).
- [ ] Defaults verified equal to upstream: `demoDelay` 1000,
      `enableDemoMode` false, `copyToClipboard` true.
- [ ] Callback call signatures verified by existing or new unit tests
      (argument types and order match upstream's JSDoc'd contracts).
- [ ] PLAN.md Phase 5 checkbox "Prop-by-prop audit against upstream
      `AgentationProps` …" ticked.

## Out of scope

- Fixing behavioral deviations discovered by the audit — file each as its
  own `type:compat` issue (highest-priority label) and link it from the
  audit table.
- Markdown-output and schema parity (already covered by the Phase 1/3
  fixture tests).
- Auditing exports beyond props (the export list is checked in p5-04's
  README work and the Phase 2 export issue).

## Notes

- Upstream's `package/AGENTS.md` calls the callback props "public
  contracts" whose signatures only change with a major version — our parity
  test encodes the same promise.
- `className` lands on the toolbar container for positioning/z-index
  overrides; verify it is applied to the same element role as upstream, not
  just accepted silently.
