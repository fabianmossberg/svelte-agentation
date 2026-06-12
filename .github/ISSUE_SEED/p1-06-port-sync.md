---
title: Port utils/sync.ts verbatim
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p1-01-port-types
---
## Goal

`src/lib/utils/sync.ts` is a verbatim copy of upstream's pure-`fetch` client
for the Agentation server protocol: session listing/creation/fetch,
annotation create/update/delete, and agent action requests. This file is the
entire client side of Phase 4's MCP/server compatibility — porting it
unchanged is what makes upstream's unmodified server work with our toolbar.

## Upstream reference

- `upstream/package/src/utils/sync.ts` (149 LOC; single import:
  `type { Annotation, Session, SessionWithAnnotations } from "../types"`).
  Exports: `listSessions` (line 15), `createSession` (26), `getSession` (46),
  `syncAnnotation` (63), `updateAnnotation` (84), `deleteAnnotation` (105),
  `ActionResponse` (118), `requestAction` (133).

## Acceptance criteria

- [ ] File copied verbatim:
      `diff upstream/package/src/utils/sync.ts src/lib/utils/sync.ts`
      is empty (the `../types` relative import resolves unchanged).
- [ ] Ported tests pass: new vitest unit tests with a mocked `fetch` assert,
      for every exported function, the exact URL path, HTTP method, headers,
      and JSON body shape sent, plus the graceful-failure return value on
      network error (the module's local-only fallback contract); green via
      `pnpm test`.
- [ ] PORTING.md row updated (`utils/sync.ts`, mode `verbatim`, status
      ported, no divergences).
- [ ] PLAN.md checkbox ticked (Phase 1, `utils/sync.ts`).

## Out of scope

- SSE/`EventSource` listening on `GET /sessions/:id/events` — that lives in
  the toolbar, not this file (Phase 4).
- Toolbar props (`endpoint`, `sessionId`, `webhookUrl`) and session lifecycle
  wiring (Phase 4).
- Running a real server in tests (the e2e run against upstream's MCP server
  is a Phase 4 deliverable).

## Notes

RESEARCH.md section 1 ("MCP server: framework-agnostic already"): reusing
this file as-is gets MCP, sessions, webhooks, and resolve/reply flows for
free. The mocked-fetch tests double as documentation of the REST protocol.
