# Upstream baseline

We port from a pinned commit of
[`benjitaylor/agentation`](https://github.com/benjitaylor/agentation) so that
every port task, fixture, and compatibility claim references one immutable
tree. Upstream publishes no git tags; the pin is a commit hash.

| | |
|---|---|
| Repository | https://github.com/benjitaylor/agentation |
| Pinned commit | `8158a97c10c37e577b0a6e2d3175d143918216cd` |
| Commit date | 2026-06-06 |
| Package version at pin | `agentation@3.0.2` (`package/package.json`) |
| npm release matching pin | 3.0.2 (published 2026-03-25; repo HEAD carries post-release docs/fix commits) |
| License at pin | PolyForm Shield 1.0.0 |

## Getting the source

```bash
./scripts/upstream.sh
```

Clones (or updates) the repo into `./upstream/` (gitignored) and checks out
the pinned commit. The script reads the hash from this file — the table above
is the single source of truth.

Library source lives at `upstream/package/src/`; the MCP server at
`upstream/mcp/` (used unchanged for Phase 4 e2e verification).

## Updating the baseline (the upstream-sync process)

Do this deliberately, as its own `type:compat` issue — never as a side effect
of feature work:

1. `git -C upstream fetch origin && git -C upstream log <old-pin>..origin/HEAD -- package/src mcp`
   — review what changed.
2. Pick the new pin (prefer the commit matching an npm release).
3. Apply changes: verbatim-ported files take the upstream diff directly;
   rewritten components get their changes re-implemented in Svelte.
4. Regenerate compat fixtures from the new pin; run the full test suite and
   the Phase 4 e2e loop.
5. Update the table above (hash, date, version) and the PORTING.md rows that
   changed, in the same PR.
