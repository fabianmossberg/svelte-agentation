---
title: Add server-sync props and connection status to the toolbar
labels: phase:4, type:feature, agent:ok
milestone: Phase 4 — Server sync + MCP
depends_on: p2-99-gate
---
## Goal

The `Agentation` component accepts upstream's server-sync prop surface —
`endpoint`, `sessionId`, `onSessionCreated`, `webhookUrl` — with identical
names, types, and JSDoc semantics, and maintains a
`disconnected | connecting | connected` connection status backed by a 10-second
`GET /health` poll, shown as the MCP indicator dot on the toolbar. This is the
plumbing every other Phase 4 issue hangs off; no annotation traffic flows yet.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - Prop declarations: lines 303–313 (`onSubmit` L303, `endpoint` L307,
    `sessionId` L309, `onSessionCreated` L310–311, `webhookUrl` L312–313);
    destructuring lines 334–339.
  - Connection state: lines 585–592 (`connectionStatus`, initial value
    `"connecting"` when `endpoint` is set, else `"disconnected"`); line 625
    (`prevConnectionStatusRef`).
  - Health-check effect: lines 956–977 (`GET ${endpoint}/health`, immediate
    check then every 10,000 ms; non-OK or thrown → `"disconnected"`).
  - MCP indicator rendering: lines 3809–3815 (hidden when no `endpoint` or
    status is `"disconnected"`; status-keyed CSS class); connection-driven
    toolbar sizing at lines 3245 and 3333.
- `upstream/mcp/README.md` — Health section (`GET /health`, `GET /status`).

## Acceptance criteria

- [ ] `AgentationProps` gains `endpoint?: string`, `sessionId?: string`,
      `onSessionCreated?: (sessionId: string) => void`, `webhookUrl?: string`
      with upstream's exact names and signatures (no renames).
- [ ] With no `endpoint` prop, behavior is byte-for-byte unchanged from
      Phase 2: no fetches to `/health`, no indicator rendered.
- [ ] With `endpoint` set, status starts at `connecting`, flips to `connected`
      on an OK `GET /health`, and to `disconnected` on failure; re-checked
      every 10 s (matching upstream's interval).
- [ ] MCP indicator dot renders on the toolbar with upstream's
      show/hide rules (hidden when disconnected or while settings are open)
      and status-keyed styling.
- [ ] Vitest coverage: health poll transitions (mocked `fetch`) for
      connect, disconnect, and recovery.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` pass.
- [ ] PLAN.md Phase 4 checkbox "Props: `endpoint`, `sessionId`,
      `onSessionCreated`, `webhookUrl`" ticked.

## Out of scope

- Session create/resume (p4-02-session-create-resume).
- Any annotation POST/PATCH/DELETE traffic (p4-03-push-annotation-crud).
- SSE listening (p4-04-sse-agent-resolve).
- Webhook firing and the send button — `webhookUrl` is accepted and stored
  but not yet acted on (p4-05-send-to-agent-webhooks).

## Notes

- RESEARCH.md §1 "MCP server: framework-agnostic already": the server speaks
  plain REST + SSE on port 4747, so this phase integrates against it
  unchanged.
- Reuse `connectionStatus` naming verbatim; the reconnect-resync logic in
  p4-02 reads the previous status the way upstream's
  `prevConnectionStatusRef` does.
