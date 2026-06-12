---
title: Scaffold the SvelteKit library package and turn CI's guarded steps green
labels: phase:0, type:infra, agent:ok
milestone: Phase 0 — Scaffold
---
## Goal

Create the publishable SvelteKit library package at the repo root — pnpm,
`@sveltejs/package`, `svelte@^5`, TypeScript (strict), vitest + jsdom,
publint, eslint + prettier — named `svelte-agentation`. The CI workflow
(`.github/workflows/ci.yml`) already exists and guards every build step on
the presence of `package.json`; this issue is what makes those guarded steps
activate and pass, so do not touch the workflow itself unless a step is
provably wrong.

## Upstream reference

n/a (infra). For naming/metadata inspiration only: `upstream/package/package.json`
(upstream uses `"sideEffects": false`, `"files": ["dist"]`, vitest + jsdom —
we mirror the spirit with SvelteKit-native tooling, not the React toolchain).

## Acceptance criteria

- [ ] `package.json` at repo root with `"name": "svelte-agentation"`, a
      `"packageManager"` field pinning pnpm, and scripts `dev`, `test`,
      `check`, `lint`, `build` (the exact names CI runs).
- [ ] Dependencies at current latest versions: `svelte@^5`, `@sveltejs/kit`,
      `@sveltejs/package`, `vite`, `typescript` (strict mode on), `vitest` +
      `jsdom`, `publint`, `svelte-check`, eslint + prettier.
- [ ] `pnpm build` runs `svelte-package` + `publint` and exits 0 with no
      publint errors (publishable but NOT published).
- [ ] `pnpm check` (svelte-check + tsc) passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` runs vitest (jsdom environment) and at least one smoke test
      passes.
- [ ] `pnpm-lock.yaml` committed; `pnpm install --frozen-lockfile` succeeds
      (CI uses it).
- [ ] CI on the PR detects the scaffold (`Detect scaffold` step outputs
      `exists=true`) and all guarded steps are green.
- [ ] PLAN.md Phase 0 checkbox "Create a SvelteKit library package" ticked.

## Out of scope

- The `src/lib/` upstream-mirroring layout (p0-02) beyond whatever minimal
  `src/lib/index.ts` the template generates.
- Playground page content (p0-03).
- LICENSE changes (p0-04) — the existing `LICENSE` file stays as-is here.
- Modifying `.github/workflows/ci.yml`, `scripts/upstream.sh`, or
  `UPSTREAM.md` — they already exist and are correct.
- Porting any upstream code (Phase 1).
- Publishing to npm (Phase 5, human-gated).

## Notes

- Read `.github/workflows/ci.yml` first: it runs `pnpm check`, `pnpm lint`,
  `pnpm test`, `pnpm build` on Node 22 with pnpm caching — script names must
  match exactly.
- CLAUDE.md "Tech conventions" and "Commands" sections define the expected
  toolchain (Node >= 22, `pnpm build` = svelte-package + publint).
- Scaffold with the current `sv` CLI (`npx sv create`) library template
  rather than hand-rolling config; prefer latest stable versions throughout.
