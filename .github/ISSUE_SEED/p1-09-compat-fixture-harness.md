---
title: Compat fixture harness proving byte-identical markdown at all 4 detail levels
labels: phase:1, type:test, agent:ok
milestone: Phase 1 — Portable core
depends_on: p1-07-port-generate-output
---
## Goal

A two-part harness proves output parity with the pinned upstream: (1) a
fixture GENERATION script that feeds committed `Annotation[]` fixture inputs
to upstream's own `generate-output.ts` (run from `upstream/` via `tsx`) and
writes the resulting markdown per detail level into `tests/fixtures/`; (2) a
vitest test that feeds the identical inputs to our `generateOutput` and
asserts byte-for-byte equality with those fixtures at all four detail levels
(compact / standard / detailed / forensic).

## Upstream reference

- `upstream/package/src/utils/generate-output.ts` (129 LOC) — executed
  directly by the generation script; never re-implemented.
- `upstream/package/src/types.ts` (109 LOC) — the `Annotation` shape the
  fixture inputs must satisfy.

## Acceptance criteria

- [ ] Fixture inputs committed (e.g. `tests/fixtures/annotations.json`):
      at least an empty array, a minimal annotation, and a maximal set
      exercising `selectedText` (both under and over the 30-char compact
      truncation), `boundingBox`, `nearbyText` (with and without
      `selectedText` to hit the suppression rule), `cssClasses`,
      `computedStyles`, `accessibility`, `nearbyElements`, `fullPath`,
      `isMultiSelect`, and the React-only `sourceFile` /
      `reactComponents` (set in fixtures to prove the output logic ports,
      even though our toolbar never populates them).
- [ ] Generation script (e.g. `scripts/generate-fixtures.ts`, run as a
      package.json script) imports
      `upstream/package/src/utils/generate-output.ts` via `tsx`, runs in
      Node (no `window`, so output is deterministic: viewport "unknown",
      no URL/user-agent/timestamp in the forensic environment block), and
      writes one markdown file per detail level into `tests/fixtures/`.
- [ ] Generation is deterministic: running the script twice produces zero
      git diff.
- [ ] `tests/fixtures/` outputs carry a generated-file header comment and
      the rule from CONTRIBUTING.md (never hand-edit; regenerate by script)
      is stated in the script and fixture README.
- [ ] `tests/compat.test.ts` runs in vitest's `node` environment (not
      jsdom, so our side also sees no `window`), feeds the same inputs to
      `src/lib/utils/generate-output.ts`, and asserts strict string equality
      against each fixture at all four detail levels; green via `pnpm test`.
- [ ] PORTING.md row updated ((new) compat fixtures → `tests/fixtures/` +
      `tests/compat.test.ts`, status done).
- [ ] PLAN.md checkbox ticked (Phase 1, "Compatibility fixture test").

## Out of scope

- Comparing toolbar-produced annotations end-to-end (Phase 3's done-when
  covers interaction-level parity; this issue compares the generator only).
- Server/MCP protocol compatibility tests (Phase 4, `COMPAT.md`).
- Hand-tuning fixture markdown to make tests pass — a mismatch here is a
  `type:compat` bug in our port, never a fixture problem.

## Notes

Upstream's `generate-output.ts` imports the two enums from the 4.7k-line
React toolbar component, but only in type positions, so `tsx` (esbuild)
elides the import and the file runs in Node without React. If a future
upstream version turns that into a value import, document the workaround in
the script (e.g. a tsconfig path alias for the toolbar module). The
generation script must run against the pinned baseline in `upstream/`
(`./scripts/upstream.sh`, see UPSTREAM.md) — never against a floating clone.
