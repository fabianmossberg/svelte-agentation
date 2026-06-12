---
title: Push annotation add/update/delete/clear to the server with ID reconciliation
labels: phase:4, type:feature, agent:ok
milestone: Phase 4 — Server sync + MCP
depends_on: p4-02-session-create-resume
---
## Goal

Every annotation mutation in the toolbar mirrors to the server the way
upstream does it: new annotations get the protocol fields (`sessionId`,
`url`, `status: "pending"`) and are POSTed non-blockingly, with the local ID
swapped for the server-assigned ID on response; edits PATCH the comment;
deletes and clear-all DELETE on the server. All server calls are
fire-and-forget with logged warnings — the local-first UX never blocks on the
network.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - `addAnnotation`: lines 2590–2687 — protocol fields spread (lines
    2616–2627), non-blocking `syncAnnotation` + server-ID reconciliation
    incl. the animated-markers set swap (lines 2653–2678).
  - `deleteAnnotation`: lines 2698–2752 — server delete at lines 2724–2732.
  - `updateAnnotation` (edit submit): lines 2815–2852 — `PATCH` with
    `{ comment }` only.
  - `clearAll`: lines 2867–2941 — bulk per-annotation deletes (ignore the
    placement/rearrange shadow-map cleanup; that is design mode, Phase 6).
- `upstream/package/src/utils/sync.ts` (149 LOC): `syncAnnotation` L63,
  `updateAnnotation` L84, `deleteAnnotation` L105.
- `upstream/package/src/types.ts`: protocol fields lines 54–68.
- `upstream/mcp/README.md` — Annotations section
  (`POST /sessions/:id/annotations`, `PATCH /annotations/:id`,
  `DELETE /annotations/:id`).

## Acceptance criteria

- [ ] New annotations include `sessionId`, `url`, and `status: "pending"`
      only when `endpoint` and a current session exist (upstream lines
      2616–2627); without an endpoint the annotation object is unchanged
      from Phase 2.
- [ ] Add syncs via `syncAnnotation`; if the server returns a different ID,
      the local annotation (and its marker-animation bookkeeping) is updated
      to the server ID.
- [ ] Edit syncs `{ comment }` via PATCH; delete and clear-all issue
      DELETEs for each affected annotation.
- [ ] Every server call is non-blocking: a failing/slow server never delays
      marker UI, callbacks, or localStorage persistence; failures log
      `[Agentation]`-prefixed warnings like upstream.
- [ ] Local persistence uses the sync-marker path so re-init does not
      re-upload already-synced annotations.
- [ ] Vitest coverage with mocked `fetch`: add with ID reconciliation, add
      while offline (no protocol fields leak), edit PATCH body, delete,
      clear-all fan-out, server-failure resilience.
- [ ] Manual check against the real server from `upstream/mcp`: add/edit/
      delete in the playground are reflected by `GET /sessions/:id`.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` pass.
- [ ] PLAN.md Phase 4 checkbox "Push annotation add/update/delete to the
      server; `_syncedTo` markers" ticked.

## Out of scope

- Design-mode placement/rearrange shadow annotations (upstream lines
  1338–1505) — Phase 6.
- Webhook firing on add/update/delete (p4-05-send-to-agent-webhooks).
- Reacting to server-sent events (p4-04-sse-agent-resolve).

## Notes

- The ID-reconciliation branch is the subtle part: upstream swaps IDs inside
  both the annotations array and the `animatedMarkers` set (lines
  2657–2673). Our markers controller from Phase 2 must expose an equivalent
  rename operation or the marker animation state desyncs.
- `_syncedTo` is local-only and stripped before sending (see
  `types.ts` line 67–68 comment and storage's sync-marker helper).
