---
title: Write the published-package README — install, usage, props, compatibility, attribution
labels: phase:5, type:docs, agent:ok
milestone: Phase 5 — Parity audit + release
depends_on: p5-02-prop-parity-audit, p5-03-upstream-diff-review
---
## Goal

Turn the repo README from a project-planning document into the README that
ships with the npm package: a Svelte developer landing on the
`svelte-agentation` npm page can install it, drop `<Agentation />` into a
SvelteKit layout, look up every prop, and understand the compatibility
promise (schema, markdown output, upstream MCP server) and the license/
attribution situation — without opening the repo.

## Upstream reference

- `upstream/package/README.md` (140 lines) — upstream's published README;
  use it as the structure/tone reference and to keep our prop documentation
  consistent with how upstream describes the same props.
- `upstream/package/src/index.ts` (50 lines) — the export list our
  documented API surface must mirror (`Agentation`, `AnnotationPopup`
  equivalent, icons, element-identification utils, storage utils,
  `Annotation` type).

## Acceptance criteria

- [ ] Install section (`npm`/`pnpm` install) and a quick-start showing
      `<Agentation />` in `+layout.svelte`, including the dev-only pattern
      (e.g. rendering it only when `import.meta.env.DEV` / `dev` from
      `$app/environment`).
- [ ] Prop documentation covers the full audited surface from p5-02 (all 15
      upstream props), with types, defaults, and one-line descriptions;
      any deferred props are marked as such with issue links.
- [ ] Compatibility statement: annotation schema, markdown output (4 detail
      levels), and server/MCP protocol are upstream-compatible; links
      COMPAT.md (Phase 4 e2e evidence) and the UPSTREAM.md pin it was
      verified against.
- [ ] Server/MCP usage section: `endpoint` pointing at upstream's MCP
      server on port 4747, with a note that the server is upstream's,
      unchanged.
- [ ] Attribution section: Agentation is created by Benji Taylor
      (agentation.com), license is PolyForm Shield 1.0.0 same as upstream,
      and a credit to `sv-agentation` (pattern reference, no code reused).
- [ ] Exported API listed and matching `src/lib/index.ts` exactly.
- [ ] `pnpm pack` tarball contains the README (verified by listing the
      tarball contents in the PR).
- [ ] PLAN.md Phase 5 checkbox "README: install, usage, prop docs,
      compatibility statement, attribution …" ticked.

## Out of scope

- A docs website or demo deployment.
- Changelog tooling/content (post-release concern).
- Recording GIFs/screenshots (a placeholder or a follow-up issue is fine).
- Rewriting CONTRIBUTING.md, RESEARCH.md, or other repo docs.

## Notes

- The current repo README (2.2K) already has the why-this-exists and
  attribution skeleton — keep the project-docs table for repo visitors, but
  the npm-consumer content must come first.
- If the package README and repo README diverge (SvelteKit packaging uses
  the root README by default), prefer one file that serves both; say so in
  the PR if you split them.
