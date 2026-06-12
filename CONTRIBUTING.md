# Contributing & workflow

This project is developed agentically: most issues are written so that a
coding agent (or a human) can pick one up cold and finish it in a single
focused session. This document is the contract that makes that work.

## Issue lifecycle

```
PLAN.md phase → seed file (.github/ISSUE_SEED/) → GitHub issue → branch → PR → review → merge → PLAN.md checkbox ticked
```

1. **Created.** Issues are generated from PLAN.md via seed files in
   `.github/ISSUE_SEED/` and created by `scripts/bootstrap-github.py`.
   Ad-hoc issues (bugs found along the way) use the issue templates and the
   same labels.
2. **Picked.** An issue is workable when every issue listed under its
   "Blocked by" section is closed and it carries `agent:ok`. Work phases in
   order (a `phase:N` issue should not start while `phase:N-1`'s gate issue
   is open) unless the issue says otherwise.
3. **Worked.** Branch `issue/<number>-<slug>` off `main`. One issue = one
   PR = one reviewable unit. If an issue turns out too big, split it into a
   new issue rather than growing the PR.
4. **Reviewed.** CI must be green. Address every reviewer/CodeRabbit inline
   comment **in its thread** (see "Review etiquette" below).
5. **Merged.** Squash-merge. The PR must tick the corresponding PLAN.md
   checkbox and update PORTING.md when applicable — that keeps PLAN.md the
   single progress dashboard.

## Issue anatomy

Every issue body has these sections (templates enforce them):

- **Goal** — one paragraph, outcome-oriented.
- **Upstream reference** — exact `upstream/package/src/…` paths (and line
  ranges where useful). Run `./scripts/upstream.sh` first if `upstream/` is
  missing.
- **Acceptance criteria** — checkboxes; must be objectively verifiable
  (tests pass, fixture parity, playground behavior).
- **Out of scope** — what NOT to do, to keep PRs small.
- **Blocked by** — links added automatically by the bootstrap script from
  seed `depends_on`.

## Labels

| Label | Meaning |
|---|---|
| `phase:0` … `phase:7` | PLAN.md phase (also mirrored by milestones) |
| `type:infra` | tooling, CI, repo plumbing |
| `type:port` | verbatim/adapted port of an upstream file |
| `type:feature` | Svelte rewrite of upstream behavior (new code) |
| `type:test` | test-only work, incl. compat fixtures |
| `type:compat` | compatibility bug — output/schema/protocol deviates from upstream |
| `type:docs` | documentation |
| `type:research` | spike with a written conclusion as the deliverable |
| `agent:ok` | safe for an agent to execute end-to-end |
| `agent:needs-human` | requires human action (outreach, npm publish, account access) |
| `status:blocked` | blocked on something outside the dependency graph |

Milestones map 1:1 to PLAN.md phases: `Phase 0 — Scaffold` …
`Phase 7 — Component detection`.

`type:compat` is the highest-priority label in the repo: if our output or
protocol deviates from upstream, that bug outranks feature work.

## Branch, commit, PR conventions

- Branch: `issue/<number>-<short-slug>` (e.g. `issue/12-port-storage`).
- Commits: imperative subject line; body explains *why* when not obvious.
- PR title: `<what> (closes #N)`; PR description follows the template —
  including the **compat impact** section, which is never deleted.
- Reference issues in text as `#N <issue title>` so they're clickable.
- Keep diffs reviewable: target < 500 changed lines per PR; ported verbatim
  files may exceed this (they're reviewed against upstream instead — say so
  in the PR description and include the upstream path).

## Pre-commit hook

`pnpm install` points git at `.githooks/` (via the `prepare` script), so a
`pre-commit` hook runs `pnpm lint` — the same `prettier --check` + `eslint`
gate CI runs — before each commit. This catches formatting/lint failures
locally instead of after a PR's CI run. Fix issues with `pnpm format`, or
bypass intentionally with `git commit --no-verify`.

## Review etiquette (CodeRabbit and humans)

Reply to **every** actionable inline comment inside that comment's thread —
not as a new top-level comment:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments --jq '.[] | {id, path, line}'
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies -f body="…"
```

State what was done: fixed (with commit hash), or skipped (one-line reason),
or invalid (explain why). Leave the "Resolve" action to a human.

## Compat guardrails for every contribution

- Never hand-edit `tests/fixtures/` — regenerate from upstream by script.
- Never rename an upstream-mirrored export, prop, field, or path.
- Every deliberate divergence from upstream code:
  `// DIVERGENCE(upstream): <reason>` + a PORTING.md row.
- Never copy code from `SikandarJODD/sv-agentation` (MIT → our PolyForm
  Shield direction is fine to *study*, not to *copy*).

## Bootstrap (one-time / idempotent)

```bash
python3 scripts/bootstrap-github.py          # labels + milestones + issues from seeds
python3 scripts/bootstrap-github.py --dry-run  # print what would happen
```

The script records created issues in `.github/.issue-map.json` (committed),
so re-running never duplicates. See `.github/ISSUE_SEED/README.md` for the
seed file format.
