---
title: Verify annotate → get_pending → resolve e2e against upstream's unmodified MCP server, documented in COMPAT.md
labels: phase:4, type:test, agent:ok
milestone: Phase 4 — Server sync + MCP
depends_on: p4-03-push-annotation-crud, p4-04-sse-agent-resolve
---
## Goal

Prove protocol compatibility end-to-end: run upstream's actual MCP server
(pinned baseline, zero modifications), annotate in our toolbar, fetch the
annotation through the real MCP tool `agentation_get_pending`, resolve it
with `agentation_resolve`, and watch the marker disappear in our UI without a
reload. The verified run — exact commands, upstream commit, observed payloads
— is documented in a new `COMPAT.md`, which becomes the repo's standing proof
of server compatibility.

## Upstream reference

- `upstream/mcp/README.md` (172 lines) — CLI (`agentation-mcp server`,
  port 4747, `--mcp-only`, `AGENTATION_STORE=memory`), MCP tools table,
  HTTP API summary.
- `upstream/mcp/src/server/mcp.ts` (748 LOC): `agentation_get_pending`
  definition L156 / handler L552; `agentation_resolve` definition L196 /
  handler L582.
- `upstream/mcp/src/server/http.ts` (1,006 LOC): REST routes + SSE streams
  the toolbar talks to.
- `upstream/mcp/src/cli.ts` (328 LOC): server startup.
- Toolbar side under test: the Phase 4 sync code paths (see
  p4-02/p4-03/p4-04 issues).

## Acceptance criteria

- [ ] Upstream's MCP server is built and started from the pinned
      `upstream/` clone (commit per UPSTREAM.md) with **no source
      modifications** — the run notes include the commit hash and the exact
      start command.
- [ ] Full loop verified with the playground (`pnpm dev`, `endpoint` set to
      `http://localhost:4747`):
  - [ ] Creating an annotation in our toolbar produces a session and a
        pending annotation on the server.
  - [ ] `agentation_get_pending` (called through the MCP stdio interface,
        not just REST) returns that annotation with our field values
        (`comment`, `element`, `elementPath`, `status: "pending"`).
  - [ ] `agentation_resolve` on that ID flips its status and the marker
        disappears in the browser without reload (SSE path).
- [ ] `COMPAT.md` created at the repo root documenting: upstream commit +
      server version, commands to reproduce, each loop step with the
      observed request/response or tool output, date of the run, and any
      deviations found (expected: none).
- [ ] Any deviation discovered is filed as a separate `type:compat` issue
      and linked from COMPAT.md rather than silently worked around.
- [ ] A repeatable script or documented procedure exists so the run can be
      re-executed after upstream syncs (see PLAN.md "Ongoing: upstream sync
      process").
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` pass.
- [ ] PLAN.md Phase 4 checkbox "End-to-end verification" ticked.

## Out of scope

- Automating the loop in CI (worthwhile, but a follow-up — this issue's
  deliverable is the verified, documented run plus a reproduction path).
- Webhook delivery verification (`agentation_watch_annotations`,
  `action.requested`) — may be noted in COMPAT.md as optional extras but is
  not required for the loop.
- Testing against a modified or mocked server — the point is the unmodified
  upstream binary.

## Notes

- PLAN.md references `/tmp/agentation/mcp`; the pinned clone at
  `upstream/mcp` (via `./scripts/upstream.sh`) is the same source at the
  same commit — use it so the run is tied to UPSTREAM.md.
- `AGENTATION_STORE=memory` keeps the run hermetic (no `~/.agentation/
  store.db` pollution).
- Driving MCP over stdio can be done with a minimal MCP client script or by
  registering the server with a local agent (`claude mcp add agentation --
  npx agentation-mcp server`); capture the actual tool-call output for
  COMPAT.md either way.
