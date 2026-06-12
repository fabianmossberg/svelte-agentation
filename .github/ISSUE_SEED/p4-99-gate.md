---
title: Gate: Server sync + MCP done-when holds
labels: phase:4, type:test, agent:ok
milestone: Phase 4 — Server sync + MCP
depends_on: p4-01-server-sync-props, p4-02-session-create-resume, p4-03-push-annotation-crud, p4-04-sse-agent-resolve, p4-05-send-to-agent-webhooks, p4-06-e2e-upstream-mcp
---
## Goal

Confirm PLAN.md Phase 4's done-when statement — "the e2e loop passes against
upstream's unmodified server" — holds on `main` with all Phase 4 issues
merged, and close out the phase.

## Upstream reference

n/a (gate issue; the protocol surface under audit is
`upstream/package/src/utils/sync.ts` (149 LOC) and `upstream/mcp/` —
see the individual Phase 4 issues).

## Acceptance criteria

- [ ] On a fresh checkout of `main`, the COMPAT.md procedure re-executes
      successfully against upstream's unmodified MCP server at the
      UPSTREAM.md commit: annotate in our toolbar →
      `agentation_get_pending` returns the annotation →
      `agentation_resolve` → marker disappears in our UI without reload.
- [ ] The toolbar with `endpoint` set survives the offline path: stop the
      server, annotations still work locally; restart it, reconnect resync
      pushes them and the loop above still passes for one of them.
- [ ] COMPAT.md exists at the repo root and reflects the run on current
      `main` (commit hash, commands, observations).
- [ ] No open `type:compat` issues for the server protocol
      (REST endpoints, SSE events, payload fields).
- [ ] All Phase 4 PLAN.md checkboxes are ticked and every Phase 4 issue in
      this milestone is closed.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` pass on `main`.

## Out of scope

- New functionality — if a gap is found, file it (as `type:compat` if the
  protocol deviates) and block this gate on it rather than fixing inline.
- Phase 5 parity-audit items (demo mode props, upstream diff review,
  README/outreach).

## Notes

- PLAN.md Phase 4 "Done when: the e2e loop passes against upstream's
  unmodified server."
- The offline/reconnect criterion exercises upstream's stated design
  ("Falls back gracefully to local-only mode on network errors",
  `utils/sync.ts` lines 5–8) end to end — it is part of the protocol
  contract, not an extra feature.
