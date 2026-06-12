---
title: Gate: Phase 0 — Scaffold done-when holds
labels: phase:0, type:test, agent:ok
milestone: Phase 0 — Scaffold
depends_on: p0-01-scaffold-package, p0-02-mirror-lib-layout, p0-03-playground-route, p0-04-license-copyright-line
---
## Goal

Verify PLAN.md Phase 0's done-when — "`pnpm build` produces a publishable
(unpublished) package and the playground renders" — holds end-to-end from a
clean checkout, and close out the phase by ticking every remaining Phase 0
checkbox (including the upstream-pin checkbox, whose artifacts — UPSTREAM.md
and `scripts/upstream.sh` — predate the other issues and only need
verification).

## Upstream reference

n/a (gate). `scripts/upstream.sh` + `UPSTREAM.md` pin
`benjitaylor/agentation@8158a97c10c37e577b0a6e2d3175d143918216cd` (v3.0.2).

## Acceptance criteria

- [ ] From a fresh clone: `pnpm install --frozen-lockfile` then `pnpm build`
      exit 0; publint reports no errors.
- [ ] `pnpm pack --dry-run` (or `npm pack --dry-run`) lists a sane publishable
      file set: packaged lib output + package.json + README + LICENSE, and no
      `src/routes/` playground code. Nothing is published.
- [ ] `pnpm dev` serves the playground and the demo page renders without
      console errors or hydration warnings.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint` all pass locally; CI is green on
      `main` with the guarded steps active (scaffold detected).
- [ ] `./scripts/upstream.sh` runs clean and checks out the pinned commit
      recorded in UPSTREAM.md.
- [ ] `LICENSE` carries both upstream's and our copyright lines; README
      attribution section present.
- [ ] All five Phase 0 checkboxes in PLAN.md are ticked (tick the
      "Pin the upstream baseline" checkbox here after verifying the script,
      if no earlier PR did).

## Out of scope

- Fixing anything substantive found during verification — file a follow-up
  `phase:0` issue (or reopen the relevant one) instead of growing this PR.
- Any Phase 1 porting work.

## Notes

- This gate blocks all `phase:1` issues per CONTRIBUTING.md ("a `phase:N`
  issue should not start while `phase:N-1`'s gate issue is open").
- UPSTREAM.md, `scripts/upstream.sh`, `.github/workflows/ci.yml`, and
  `LICENSE` existed before the Phase 0 issues — this gate verifies rather
  than creates them.
