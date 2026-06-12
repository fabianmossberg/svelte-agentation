# svelte-agentation — agent instructions

Svelte 5 port of [benjitaylor/agentation](https://github.com/benjitaylor/agentation)
("the visual feedback tool for agents"), 100% compatible with upstream's
annotation schema, markdown output, and MCP/server protocol.

## Read first

| Doc | What it answers |
|---|---|
| [PLAN.md](PLAN.md) | The phased roadmap. All issues derive from it; checkboxes track progress. |
| [RESEARCH.md](RESEARCH.md) | Why we port upstream directly instead of forking sv-agentation; license rationale. |
| [UPSTREAM.md](UPSTREAM.md) | The pinned upstream commit we port from, and how to update it. |
| [PORTING.md](PORTING.md) | File-by-file ledger: port mode, status, and every divergence from upstream. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Issue/PR workflow: how work is created, picked, branched, reviewed. |

## Non-negotiables — compatibility IS the product

1. **Schema compat:** the `Annotation` type, the markdown output (all 4 detail
   levels), and the server protocol (`utils/sync.ts` REST + SSE) must match
   upstream exactly. React-only fields (`reactComponents`, `sourceFile`) stay
   in the schema, optional and unpopulated.
2. **Mirror upstream:** file paths under `src/lib/` mirror upstream's
   `package/src/`; exported names are never renamed. If upstream's name is
   ugly, it stays ugly — that's the compat contract and what makes upstream
   releases apply as diffs.
3. **Verbatim files stay diff-minimal.** Files ported verbatim (see
   PORTING.md) must stay as close to upstream as possible. No reformatting,
   no "improvements", no added abstractions. Every deliberate divergence gets
   a `// DIVERGENCE(upstream):` comment at the site plus a PORTING.md entry.
4. **Never hand-edit compat fixtures.** Files under `tests/fixtures/` are
   generated from the pinned upstream source by script. If a fixture test
   fails, the port is wrong — fix the port, not the fixture.
5. **Don't port** `utils/react-detection.ts` or `utils/source-location.ts`
   (React-fiber-bound; Svelte equivalent is PLAN.md Phase 7).
6. **License:** PolyForm Shield 1.0.0 with upstream attribution. Never change
   the license, never strip copyright headers, never copy code from
   MIT-licensed `sv-agentation` (license directions are incompatible —
   patterns may be studied, code may not be copied).

## Upstream reference

Run `./scripts/upstream.sh` once per machine — it clones the pinned baseline
into `./upstream/` (gitignored) and checks out the commit recorded in
UPSTREAM.md. All porting work reads from `upstream/package/src/…`. If
`upstream/` is missing, run the script before starting any port task.

## Layout

```
src/lib/                  mirrors upstream package/src/
  index.ts                same export list as upstream
  types.ts                Annotation schema + output enums
  utils/                  ported verbatim (see PORTING.md)
  components/             Svelte rewrites of upstream React components
  internal/               runes controllers (.svelte.ts) — our addition,
                          decomposing upstream's toolbar monolith state
src/routes/               playground app for manual testing (not published)
tests/fixtures/           generated compat fixtures — never hand-edited
scripts/                  upstream.sh, bootstrap-github.py, fixture generation
upstream/                 pinned upstream clone (gitignored)
```

## Tech conventions

- **Svelte 5 runes only**: `$state`, `$derived`, `$effect`, `$props`,
  `$bindable`. No legacy stores, no `$:` statements, no `export let`. Shared
  state machines live in `internal/*.svelte.ts` controllers.
- **TypeScript strict.** Types come from `types.ts`; do not redeclare
  upstream types locally.
- **Tests: vitest** (jsdom environment for DOM utils, real browser via
  Playwright only where jsdom can't represent the behavior). Ported files
  keep upstream's tests, adapted minimally.
- **Styles:** upstream SCSS modules become scoped `<style>` blocks in the
  owning component. Preserve the `:where()` zero-specificity resets, CSS
  custom properties, and keyframe names. Toolbar DOM must keep the
  `data-feedback-toolbar` / `data-agentation-*` attributes — the
  freeze-animations exclusion contract depends on them.
- **Toolbar mounting:** the toolbar renders into `document.body` (Svelte
  `mount()` replaces upstream's React portal). Everything must be SSR-safe:
  guard `window`/`document` access (upstream utils already do — keep it).
- **pnpm** (repo standard; `packageManager` field is authoritative once
  scaffolded). Node ≥ 22.

## Commands

Pre-scaffold (Phase 0 not merged yet) these don't exist; after scaffold:

| Command | What |
|---|---|
| `pnpm install` | install deps |
| `pnpm dev` | playground at localhost with the toolbar mounted |
| `pnpm test` | vitest run (includes compat fixture tests) |
| `pnpm check` | svelte-check + tsc |
| `pnpm lint` | eslint + prettier check |
| `pnpm build` | svelte-package + publint |
| `./scripts/upstream.sh` | clone/update pinned upstream into `upstream/` |

## Porting procedure (Phase 1 file ports)

1. Read the upstream file at `upstream/package/src/<path>` in full.
2. Copy it to `src/lib/<path>`. Keep names, order, comments.
3. Remove React-only imports/branches only if PLAN.md says so; mark each
   removal with `// DIVERGENCE(upstream): <why>`.
4. Port the matching upstream test file; add fixture tests where the issue
   asks for them.
5. Update PORTING.md (mode, status, divergences) in the same PR.
6. Tick the matching PLAN.md checkbox in the same PR.

## Working on an issue

Branch `issue/<number>-<slug>` off `main`; one issue = one PR; PR title
references the issue (`Closes #N`). Full lifecycle, labels, and review rules:
CONTRIBUTING.md. Issues labeled `agent:needs-human` (outreach, publishing)
are never executed autonomously.

## Definition of done (every PR)

- `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` all pass locally and in CI.
- Compat fixture tests untouched and green (or regenerated by script with the
  regeneration command quoted in the PR description).
- PORTING.md and PLAN.md updated when the PR ports or completes something.
- Playground still works (`pnpm dev`, annotate → output → copy by hand or via
  the Playwright MCP server).
