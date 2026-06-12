---
title: Publish svelte-agentation to npm
labels: phase:5, type:infra, agent:needs-human
milestone: Phase 5 — Parity audit + release
depends_on: p5-02-prop-parity-audit, p5-03-upstream-diff-review, p5-04-package-readme, p5-05-contact-benji-taylor, p5-06-notify-sikandarjodd
---
## Goal

The first public release of `svelte-agentation` lands on npm: version
chosen and recorded, package metadata complete and correct, tarball
contents verified, published by a human with npm account access (after
Benji Taylor's response per p5-05), and the published artifact proven to
work in a fresh SvelteKit app.

## Upstream reference

n/a (release infra). The published artifact's compatibility claims trace to
the UPSTREAM.md pin and COMPAT.md, both linked from the README (p5-04).

## Acceptance criteria

- [ ] First version decided (e.g. `1.0.0` to signal upstream-3.0.2 parity,
      or `0.x` for a soft launch) and the rationale recorded in the PR that
      bumps `package.json`.
- [ ] `package.json` metadata complete: name `svelte-agentation`, license
      `PolyForm-Shield-1.0.0`, `repository`, `description`, `keywords`
      (agentation, svelte, annotations, mcp, …), `peerDependencies`
      `svelte: ^5`, correct `exports`/`svelte` fields.
- [ ] `pnpm build` clean; `publint` and `svelte-package` report no errors;
      `pnpm pack` tarball inspected and contains `dist/`, `LICENSE`
      (PolyForm Shield with upstream copyright + ours), `README.md` — and
      no playground routes, fixtures, or `upstream/` content.
- [ ] A human runs `npm publish --access public` (with 2FA/OTP); the
      version, time, and publishing account are noted in this issue.
- [ ] Post-publish smoke test: a fresh SvelteKit app installs the published
      version from the registry, renders `<Agentation />`, and completes
      annotate → markdown → copy.
- [ ] README install instructions match the published name and version.
- [ ] PLAN.md Phase 5 checkbox "Publish to npm as `svelte-agentation`"
      ticked.

## Out of scope

- CI-automated release pipelines, changesets, or npm provenance setup
  (worthwhile follow-up `type:infra` issues, not blockers for v1).
- Announcements/promotion (Svelte Discord, Reddit, etc.).
- Any code or behavior changes — if the smoke test fails, file the bug and
  block this issue on it rather than fixing inline.

## Notes

- p5-05 is a hard gate by decision, not just dependency-graph convention:
  PLAN.md says "Wait for response before npm publish".
- The repo currently has no npm org/account decision recorded — the
  publishing human should confirm name availability (`npm view
  svelte-agentation`) before the version-bump PR, and note the outcome
  here.
