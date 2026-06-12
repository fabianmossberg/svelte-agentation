---
title: Implement webhook flow and Send-to-agent submit
labels: phase:4, type:feature, agent:ok
milestone: Phase 4 — Server sync + MCP
depends_on: p4-03-push-annotation-crud
---
## Goal

The toolbar fires upstream's webhook events (`annotation.add`,
`annotation.update`, `annotation.delete`, `annotations.clear`, `submit`) to
the configured webhook URL, and the send button implements upstream's
"send to agent" flow: generate the markdown output, fire the `onSubmit`
callback, POST the `submit` webhook (forced, bypassing the enabled toggle),
and walk the `idle → sending → sent | failed` button states with upstream's
timings.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - `fireWebhook`: lines 2557–2588 — settings URL overrides the
    `webhookUrl` prop (L2565), skip unless enabled or `force` (L2567),
    payload shape `{ event, timestamp, url, ...payload }` (L2573–2579).
  - Call sites: `annotation.add` L2642, `annotation.delete` L2721,
    `annotation.update` ~L2830, `annotations.clear` ~L2872.
  - `sendToWebhook`: lines 3144–3214 — output generation, `onSubmit(output,
    annotations)` (L3179–3182), 150 ms fade, `fireWebhook("submit", {...},
    true)` (L3191), `sent|failed` shown 2,500 ms, `autoClearAfterCopy`
    clears after 500 ms on success.
  - `sendState` state: line 405; send button rendering: lines 3743–3760;
    keyboard path: lines 3461–3499.
  - Settings keys `webhookUrl` / `webhooksEnabled`: type at line 154,
    default at line 165.
- `upstream/package/src/utils/sync.ts` (149 LOC): `requestAction` lines
  133–149 — exported but **not called** by the upstream 3.0.2 toolbar
  (verified by grep); see Notes.

## Acceptance criteria

- [ ] `fireWebhook` matches upstream: settings webhook URL takes precedence
      over the `webhookUrl` prop; no-op without a URL; respects
      `webhooksEnabled` except when forced; payload is
      `{ event, timestamp, url, ...payload }`; returns success boolean;
      failures warn and never throw.
- [ ] Add/update/delete/clear handlers fire their respective webhook events
      with the annotation payloads upstream sends.
- [ ] Send button: generates the same markdown as copy (via
      `generateOutput` at the current detail level), fires
      `onSubmit(output, annotations)` when provided, then the forced
      `submit` webhook; state sequence and timings match upstream
      (150 ms sending fade, 2,500 ms result display, 500 ms delayed
      clear-all when `autoClearAfterCopy` and success).
- [ ] Empty state (no annotations, no output) is a no-op, as upstream
      (L3157).
- [ ] Vitest coverage with mocked `fetch`: precedence of settings URL over
      prop, enabled/forced gating, payload shape per event, submit
      success/failure state transitions, `onSubmit` invocation.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` pass.
- [ ] PLAN.md Phase 4 checkbox ""Send to agent" (`onSubmit` +
      `requestAction`) and webhook flow" ticked.

## Out of scope

- Design-mode output sections appended in `sendToWebhook`
  (`generateDesignOutput` / `generateRearrangeOutput`, lines 3160–3177) —
  Phase 6.
- Server-side webhook configuration (`AGENTATION_WEBHOOK_URL` env on the MCP
  server) — that is upstream server behavior, nothing to build.
- Adding new webhook event types not present upstream.

## Notes

- PLAN.md mentions `requestAction` (POST `/sessions/:id/action`), but the
  upstream 3.0.2 toolbar never calls it — its send button uses
  `onSubmit` + the `submit` webhook only (`grep -rn requestAction
  upstream/package/src` hits only `utils/sync.ts`). Match upstream behavior
  exactly: keep `requestAction` exported from `utils/sync` (ported in
  Phase 1) for consumers, do not wire it into the toolbar. Record this
  reading in the PR description so the PLAN.md wording can be clarified
  when ticking the checkbox.
- The settings-panel webhook fields shipped with the Phase 2 settings port;
  this issue wires them to behavior.
