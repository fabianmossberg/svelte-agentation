---
title: AgentationProps surface and index.ts export parity
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-09-page-toolbar-component
---
## Goal

Give the toolbar upstream's public API: the `AgentationProps` type with identical names and signatures, the Phase 2 subset wired (`copyToClipboard`, `className`, and the six callbacks), and `src/lib/index.ts` exporting the same surface as upstream's `index.ts` — so `import { Agentation } from "svelte-agentation"` is a drop-in of `import { Agentation } from "agentation"`.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` L282–319 — `DemoAnnotation`, `PageFeedbackToolbarCSSProps` (all 15 fields with doc comments), `AgentationProps` alias; L321–341 — destructuring with defaults (`copyToClipboard = true`, `demoDelay = 1000`).
- Callback call sites: `onAnnotationAdd` (inside L2590–2688), `onAnnotationDelete` (L2698–2753), `onAnnotationUpdate` (L2815–2855), `onAnnotationsClear` (L2867–2942), `onCopy` (inside L2943–3143), `onSubmit` (L3144–3215 — wired in Phase 4, declared now); `className` applied at L3569.
- `upstream/package/src/index.ts` — 50 LOC: `Agentation` + `PageFeedbackToolbarCSS`, `DemoAnnotation`/`AgentationProps` types, `AnnotationPopupCSS` + its prop/handle types, `export * from "./components/icons"`, named utils from `element-identification`, `loadAnnotations`/`saveAnnotations`/`getStorageKey`, `Annotation` type.
- `upstream/package/src/components/page-toolbar-css/index.test.tsx` — 138 LOC: prop-acceptance and `Annotation`-shape tests to port.

## Acceptance criteria

- [ ] `AgentationProps` (and `PageFeedbackToolbarCSSProps`, `DemoAnnotation`) are declared with every upstream field, name-identical, signature-identical (React types translated; `className` stays `className`, not `class` — `// DIVERGENCE(upstream)` note explaining Svelte usage).
- [ ] Wired in Phase 2: `copyToClipboard` (default `true`), `className`, `onAnnotationAdd`, `onAnnotationUpdate`, `onAnnotationDelete`, `onAnnotationsClear`, `onCopy` — each fires at the same lifecycle moment as its upstream call site (e.g. `onAnnotationDelete` fires with the deleted annotation when removal is committed, not when the exit animation starts).
- [ ] Declared but inert until later phases, documented in the props doc comments: `endpoint`, `sessionId`, `onSessionCreated`, `webhookUrl`, `onSubmit` (Phase 4); `demoAnnotations`, `demoDelay`, `enableDemoMode` (Phase 5 audit).
- [ ] `src/lib/index.ts` matches upstream `index.ts` export-for-export (`Agentation`, `PageFeedbackToolbarCSS`, `AnnotationPopupCSS` + types, icons `export *`, the named `element-identification` utils, the storage trio, `Annotation`); no extra public exports beyond what upstream ships.
- [ ] Ported tests pass: upstream `index.test.tsx` adapted to `@testing-library/svelte` (prop acceptance, `copyToClipboard` default, `Annotation` shape), plus a test asserting each wired callback fires once with the right payload; `pnpm test` green.
- [ ] `pnpm build` + publint pass; the package's public types compile in a fresh consumer snippet (`svelte-check` on the playground using the public import).
- [ ] PORTING.md rows updated (`index.ts`, props block, `index.test.tsx`).
- [ ] PLAN.md Props checkbox and Export checkbox ticked.

## Out of scope

- Implementing server sync, webhook, demo mode behavior behind the inert props — Phases 4/5.
- Re-export structure for internal controllers (`internal/` stays private).

## Notes

CONTRIBUTING "Compat guardrails": never rename an upstream-mirrored export, prop, or field — this issue is where that contract becomes enforceable; consider a test that diffs our export names against a fixture list generated from upstream's `index.ts`.
