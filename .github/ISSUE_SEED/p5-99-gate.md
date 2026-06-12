---
title: Gate: Parity audit + outreach + release done-when holds
labels: phase:5, type:test, agent:ok
milestone: Phase 5 — Parity audit + release
depends_on: p5-01-demo-mode-props, p5-02-prop-parity-audit, p5-03-upstream-diff-review, p5-04-package-readme, p5-05-contact-benji-taylor, p5-06-notify-sikandarjodd, p5-07-npm-publish
---
## Goal

Verify that Phase 5 as a whole holds: the package is published on npm with
an audited, drift-protected prop surface, a current upstream baseline,
consumer-grade docs, and both upstream's author and the sv-agentation
maintainer informed. PLAN.md's Phase 5 has no explicit "Done when" line;
this gate decomposes its implicit one — "released, compatible, and
above-board" — into checkable criteria. Close this issue only when every
box below is verified against the live state (npm registry, merged main,
issue records), not against PR claims.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` lines
  282–319 — the `AgentationProps` surface the audit gate-checks.
- The UPSTREAM.md pin table — the baseline the diff-review gate-checks.

## Acceptance criteria

- [ ] Every prop of upstream's `AgentationProps` (15 props incl. the three
      demo-mode props) is implemented or documented as deferred in the
      merged audit table; the compile-time parity test from p5-02 is in CI
      and green.
- [ ] The demo-mode decision (p5-01) is reflected consistently in code,
      PORTING.md, the audit table, and the README — no contradictions.
- [ ] Upstream commits since the UPSTREAM.md pin have been reviewed; the
      pin table reflects the baseline actually released against; full test
      suite incl. fixture-parity tests is green on `main`.
- [ ] The README on `main` (and inside the published tarball) covers
      install, usage, the full prop table, the compatibility statement
      (with COMPAT.md and UPSTREAM.md links), and attribution to Benji
      Taylor plus the sv-agentation credit.
- [ ] Benji Taylor was contacted and his response (or the documented
      no-response policy) is recorded in p5-05 **before** the publish
      timestamp in p5-07.
- [ ] SikandarJODD heads-up sent and recorded in p5-06.
- [ ] `npm view svelte-agentation version` returns the released version,
      and the p5-07 fresh-install smoke test is documented as passing
      against the registry artifact.
- [ ] All six Phase 5 checkboxes in PLAN.md are ticked.

## Out of scope

- Fixing anything found wanting — reopen or file the specific issue
  (deviations from upstream get `type:compat`); this gate only verifies.
- Phase 6 (design mode) and Phase 7 (component detection) work.
- Post-release announcements or upstream-sync scheduling.

## Notes

- Verification of the npm-published artifact is agent-doable (`npm view`,
  fresh install in a temp dir); only the publish itself needed a human.
- The ordering check (outreach response recorded before publish) is the one
  criterion most easily lost in a squash-merge — check issue comment
  timestamps in p5-05 against the publish note in p5-07.
