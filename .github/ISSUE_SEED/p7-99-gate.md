---
title: Gate: Svelte component detection done-when holds
labels: phase:7, type:test, agent:ok
milestone: Phase 7 — Component detection
depends_on: p7-01-svelte-component-detection-spike
---
## Goal

Verify that Phase 7 as a whole holds. PLAN.md's Phase 7 has no explicit
"Done when" line; its implicit one — "the research spike produced a written,
evidence-backed conclusion in docs/ on how (or whether) to give Svelte apps
the equivalent of upstream's `reactComponents`/`sourceFile` detection,
without introducing any compatibility drift" — is decomposed below. Close
this issue only when every box is verified against the merged state of
`main` and the live tracker, not against PR claims.

## Upstream reference

- `upstream/package/src/utils/react-detection.ts` (704 LOC) and
  `upstream/package/src/utils/source-location.ts` (904 LOC) — the behaviors
  the conclusion doc must have specified as its parity target.
- `upstream/package/src/types.ts` lines 23–24 — the optional fields whose
  unset-stays-compatible status this gate re-checks.

## Acceptance criteria

- [ ] `docs/svelte-component-detection.md` is on `main` and contains all
      four required parts from p7-01: upstream behavioral spec with line
      references, playground-verified Svelte 5 facts, at least three
      evaluated approaches with pros/cons, and a recommendation with effort
      estimate plus proposed field formats.
- [ ] Spot-check at least three of the doc's Svelte-internals claims by
      re-running the recorded experiment or following the cited source
      reference; all three hold.
- [ ] The doc's `ReactComponentMode` mapping and compatibility statement
      sections exist and are internally consistent with the recommendation.
- [ ] Full test suite (including the Phase 1 fixture-parity tests) is green
      on `main` with `reactComponents`/`sourceFile` still unset — the spike
      merged no implementation code and introduced no output drift.
- [ ] If the recommendation is "build": the follow-up issues listed in the
      doc exist on the tracker with phase/type/agent labels. If "don't
      build": the limitation is recorded where users will see it (README
      compatibility section or PLAN.md Phase 7 note).
- [ ] PLAN.md Phase 7 section links the conclusion doc.

## Out of scope

- Judging whether the recommendation is *right* — this gate verifies
  completeness, evidence, and consistency, not the verdict.
- Implementing detection (follow-up issues own that).
- Phase 6 (design mode) work — Phases 6 and 7 are independent post-release
  tracks.

## Notes

- Phase 7 explicitly never blocks compatibility (the schema fields are
  optional), so the only compat criterion here is the no-drift check via
  the existing fixture-parity suite.
- "Exists on the tracker" is agent-verifiable via
  `gh issue list --label phase:7` / label inspection.
