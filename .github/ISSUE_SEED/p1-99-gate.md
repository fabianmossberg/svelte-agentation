---
title: Gate: Phase 1 — Portable core done-when holds
labels: phase:1, type:test, agent:ok
milestone: Phase 1 — Portable core
depends_on: p1-01-port-types, p1-02-port-element-identification, p1-03-port-storage, p1-04-port-freeze-animations, p1-05-port-screenshot, p1-06-port-sync, p1-07-port-generate-output, p1-08-port-utils-barrel, p1-09-compat-fixture-harness
---
## Goal

Verify Phase 1's done-when — "all ported tests pass + fixture test proves
output parity" — holds on `main` with every Phase 1 issue closed, and that
the bookkeeping (PORTING.md, PLAN.md) matches reality. This issue ships no
features; it closes only when every checkbox below is independently
re-verified.

## Upstream reference

n/a (gate issue; the per-file references live in p1-01 through p1-09).

## Acceptance criteria

- [ ] `pnpm test` is green on `main`, including the unit tests added for all
      eight ported files (`types.ts`, the six utils, the barrel).
- [ ] `tests/compat.test.ts` passes: our `generateOutput` output is
      byte-identical to the upstream-generated fixtures at all four detail
      levels (compact / standard / detailed / forensic).
- [ ] Re-running the fixture generation script produces zero git diff
      (fixtures are current against the pinned upstream baseline in
      UPSTREAM.md).
- [ ] Verbatim ports are diff-clean: `diff` against
      `upstream/package/src/utils/` is empty for
      `element-identification.ts`, `storage.ts`, `freeze-animations.ts`,
      `screenshot.ts`, `sync.ts`; `types.ts`, `generate-output.ts`, and
      `utils/index.ts` differ only at their documented
      `// DIVERGENCE(upstream)` sites.
- [ ] Every divergence comment in `src/lib/` has a matching PORTING.md row,
      and all "Utils & types" rows show status ported with the planned mode
      (verbatim/adapted); `react-detection.ts`, `source-location.ts`, and
      their tests remain recorded as skipped.
- [ ] PLAN.md Phase 1: all checkboxes ticked, including "Port upstream's
      existing tests" — verified that upstream's only util tests
      (`utils/react-detection.test.ts`, 363 LOC;
      `utils/source-location.test.ts`, 1211 LOC) cover skipped React-fiber
      files, so that checkbox is satisfied by the skip records plus the new
      per-module unit tests (tick it with a one-line note).
- [ ] `pnpm build` still produces a publishable package (publint passes) —
      Phase 0's done-when has not regressed.

## Out of scope

- Any new functionality or refactoring — discrepancies found here become
  new issues (`type:compat` if output deviates) rather than fixes inside
  the gate PR.
- Phase 2 toolbar work, even "quick wins".

## Notes

This gate is the precondition for starting `phase:2` issues (see
CONTRIBUTING.md issue lifecycle). If any criterion fails, file the fix as a
separate issue, link it here, and keep the gate open until it lands.
