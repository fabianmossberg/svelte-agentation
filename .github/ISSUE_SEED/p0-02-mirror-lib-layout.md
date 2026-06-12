---
title: Lay out src/lib mirroring upstream package/src (types.ts, utils/, components/, index.ts)
labels: phase:0, type:infra, agent:ok
milestone: Phase 0 — Scaffold
depends_on: p0-01-scaffold-package
---
## Goal

Establish the `src/lib/` directory tree that mirrors upstream's
`package/src/` layout — `types.ts`, `utils/`, `components/`, `index.ts` — so
every Phase 1 port lands at the exact path PORTING.md maps it to and upstream
releases apply as clean diffs. Stubs only: no upstream code is copied in this
issue.

## Upstream reference

Layout reference only (content is ported in later phases):

- `upstream/package/src/index.ts` — 50 LOC; the export list our `index.ts`
  will eventually mirror (Phase 2 owns export parity).
- `upstream/package/src/types.ts` — 109 LOC (ported in Phase 1).
- `upstream/package/src/utils/` — ported file-by-file in Phase 1.
- `upstream/package/src/components/` — rewritten in Svelte in Phase 2+.

## Acceptance criteria

- [ ] `src/lib/index.ts` exists and is the package entry (`package.json`
      exports resolve to its packaged output); it may export nothing
      meaningful yet but must compile.
- [ ] `src/lib/types.ts` exists as a stub with a comment pointing at the
      Phase 1 port issue (no upstream content copied).
- [ ] `src/lib/utils/` and `src/lib/components/` directories exist and are
      tracked by git (placeholder file per directory is acceptable).
- [ ] The tree matches the "Layout" section of CLAUDE.md for the paths that
      exist at this phase.
- [ ] `pnpm build`, `pnpm check`, `pnpm lint`, `pnpm test` still pass.
- [ ] PLAN.md Phase 0 checkbox "`src/lib/` mirrors upstream `package/src/`"
      ticked.

## Out of scope

- Copying or adapting any upstream source (Phase 1 issues own `types.ts` and
  each `utils/` file; PORTING.md rows stay "not started").
- `src/lib/internal/` runes controllers — those are Phase 2's addition.
- Matching upstream's `index.ts` export list — impossible before the ports
  exist; Phase 2 owns it.

## Notes

- CONTRIBUTING.md compat guardrail: never rename an upstream-mirrored path —
  the stub filenames created here are already contractual.
- Keep stubs minimal so Phase 1 PRs are clean "stub → ported file" diffs.
