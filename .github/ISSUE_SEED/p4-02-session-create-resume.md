---
title: Create or resume a server session and sync local annotations on connect
labels: phase:4, type:feature, agent:ok
milestone: Phase 4 — Server sync + MCP
depends_on: p4-01-server-sync-props
---
## Goal

When `endpoint` is set, the toolbar establishes a session exactly like
upstream: join the `sessionId` prop or the localStorage-stored session for the
current pathname (server annotations are authoritative, unsynced locals are
merged up), or create a fresh session via `POST /sessions` and fire
`onSessionCreated`. Local annotations carry `_syncedTo` markers so nothing is
double-uploaded, and a reconnect after an outage re-syncs anything the server
is missing.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - Session-init effect: lines 755–954 — join path (getSession, authoritative
    merge, `saveAnnotationsWithSyncMarker`), invalid-session fallback
    (`clearSessionId` then create), create path (createSession,
    `onSessionCreated?.(session.id)`, cross-page sync of annotations lacking
    `_syncedTo` via `loadAllAnnotations`, one session per other page).
  - Reconnect resync effect: lines 1045–1129 (fires on
    disconnected→connected transition; diffs local vs server IDs, re-uploads,
    saves with sync marker).
- `upstream/package/src/utils/sync.ts` (149 LOC): `createSession` L26,
  `getSession` L44, `syncAnnotation` L63.
- `upstream/package/src/utils/storage.ts` (308 LOC): `loadAllAnnotations`
  L53, `saveAnnotationsWithSyncMarker` L97, `loadSessionId` L255,
  `saveSessionId` L264, `clearSessionId` L273.
- `upstream/package/src/types.ts` (109 LOC): protocol fields lines 54–68
  (`sessionId`, `url`, `_syncedTo` L68); `Session` /
  `SessionWithAnnotations` lines 83–97.
- `upstream/mcp/README.md` — Sessions section (`POST /sessions`,
  `GET /sessions/:id`).

## Acceptance criteria

- [ ] Session init runs once per mount when `endpoint` is set, with
      upstream's precedence: `sessionId` prop > stored session ID > create
      new.
- [ ] Joining an existing session makes server annotations authoritative and
      uploads only local annotations missing from the server (matching
      upstream's filter at lines 782–789), then persists with
      `saveAnnotationsWithSyncMarker`.
- [ ] A stale/unknown stored session ID is cleared and a new session is
      created (no crash, warning logged like upstream).
- [ ] Creating a session fires `onSessionCreated(session.id)` and stores the
      ID per pathname; annotations with a `_syncedTo` marker are never
      re-uploaded.
- [ ] Network failure during init degrades to local-only mode (status
      `disconnected`, annotations still work — upstream lines 943–950).
- [ ] Reconnect (disconnected → connected) re-syncs local annotations absent
      from the server, recreating the session if it expired.
- [ ] Vitest coverage with mocked `fetch`: join, join-with-merge,
      stale-session fallback, create + `onSessionCreated`, offline fallback,
      reconnect resync.
- [ ] Manual check against the real server: `pnpm dev` +
      `agentation-mcp server` from `upstream/mcp`, session visible via
      `GET /sessions`.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` pass.
- [ ] PLAN.md Phase 4 checkbox "Session create/resume on activation" ticked.

## Out of scope

- Per-annotation add/update/delete sync from the toolbar handlers
  (p4-03-push-annotation-crud) — this issue only syncs at session
  init/reconnect time.
- SSE listening (p4-04-sse-agent-resolve).
- Webhooks (p4-05-send-to-agent-webhooks).

## Notes

- `utils/sync.ts` and `utils/storage.ts` were ported verbatim in Phase 1 —
  call them, do not reimplement fetch logic in the controller.
- Upstream's cross-page sync (lines 863–941) creates separate sessions for
  other pages' unsynced annotations; keep that behavior, it is observable by
  the MCP server (`agentation_list_sessions`).
