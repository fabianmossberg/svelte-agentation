---
title: Remove markers live when an agent resolves or dismisses annotations (SSE)
labels: phase:4, type:feature, agent:ok
milestone: Phase 4 — Server sync + MCP
depends_on: p4-02-session-create-resume
---
## Goal

While a session is active, the toolbar holds an `EventSource` on
`GET ${endpoint}/sessions/${sessionId}/events` and reacts to
`annotation.updated` events exactly like upstream: when the payload status is
`resolved` or `dismissed`, the matching marker plays its exit animation and
the annotation is removed from local state — so an agent calling
`agentation_resolve` makes the marker disappear in the browser without a
reload.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  SSE effect lines 979–1043 — `EventSource` construction (L983–985),
  `removedStatuses = ["resolved", "dismissed"]` (L987), the
  `annotation.updated` listener (L1037), feedback-annotation branch with
  150 ms exit animation (L1019–1030), and cleanup
  (`removeEventListener` + `close`, L1039–1042). The `kind === "placement"`
  and `kind === "rearrange"` branches (L996–1018) are design mode — skip
  with a `// DIVERGENCE(upstream):` note until Phase 6.
- `upstream/mcp/src/server/http.ts` (1,006 LOC): SSE endpoint
  `GET /sessions/:id/events` lines 528–601 (content-type, event replay,
  subscription).
- `upstream/mcp/src/server/events.ts` (249 LOC): event bus / payload shape.
- `upstream/mcp/src/types.ts` (213 LOC): event-type names lines 104–111
  (`annotation.created|updated|deleted`, `session.*`, `action.requested`).

## Acceptance criteria

- [ ] An `EventSource` is opened only when `endpoint`, mount, and a current
      session ID are all present, and is closed (and the listener removed)
      on teardown or session change — no leaked connections across
      navigations.
- [ ] On `annotation.updated` with payload status `resolved` or `dismissed`,
      the marker exit animation runs and the annotation leaves state after
      150 ms, matching upstream timing; persisted storage no longer contains
      it.
- [ ] Other statuses (e.g. `acknowledged`) and unparseable event data are
      ignored without errors (upstream swallows parse errors, lines
      1032–1034).
- [ ] Events for unknown annotation IDs are a no-op.
- [ ] Vitest coverage with a mocked/stubbed `EventSource`: resolve removes,
      dismiss removes, acknowledge is ignored, malformed JSON is ignored,
      teardown closes the connection.
- [ ] Manual check: with the real server from `upstream/mcp` running,
      `PATCH /annotations/:id` with `{"status":"resolved"}` via curl removes
      the marker in the playground without reload.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` pass.
- [ ] PLAN.md Phase 4 checkbox "Listen on `GET /sessions/:id/events`
      (EventSource)" ticked.

## Out of scope

- Placement/rearrange event branches (design mode, Phase 6) — mark the gap
  with `// DIVERGENCE(upstream):` and a PORTING.md note.
- Rendering agent replies/threads in the UI (upstream 3.0.2 toolbar does not
  render `thread` either; only removal on resolve/dismiss).
- The global `GET /events` stream — the toolbar only uses the per-session
  stream.

## Notes

- jsdom has no `EventSource`; inject or globally stub a minimal fake that
  can dispatch named events for the unit tests.
- The server replays missed events on connect (http.ts lines 566–574) —
  the handler must therefore be idempotent for already-removed IDs.
