---
title: Rewrite settings panel (incl. checkbox-field) with ToolbarSettings persistence
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-05-port-primitives
---
## Goal

Rewrite the settings panel as `src/lib/components/page-toolbar/settings-panel/` (with its `checkbox-field/` subdir), plus the `ToolbarSettings` model it edits: type, defaults, color options, and localStorage load/save — so the toolbar issue can drop it in with a `settings` + `onSettingsChange` contract identical to upstream's.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/settings-panel/index.tsx` — 352 LOC; props at L11–33 (`settings`, `onSettingsChange(patch)`, `isDarkMode`/`onToggleTheme`, `isDevMode`, `connectionStatus`, `endpoint`, `isVisible`, `toolbarNearBottom`, `settingsPage: "main" | "automations"`, `onSettingsPageChange`, `onHideToolbar`).
- `upstream/package/src/components/page-toolbar-css/settings-panel/styles.module.scss` — 809 LOC.
- `upstream/package/src/components/page-toolbar-css/settings-panel/checkbox-field/index.tsx` (32 LOC) + `styles.module.scss` (18 LOC).
- Settings model in the monolith, `upstream/package/src/components/page-toolbar-css/index.tsx`:
  - L142–156 — `OutputDetailLevel`, `ReactComponentMode`, `MarkerClickBehavior`, `ToolbarSettings` (outputDetail, autoClearAfterCopy, annotationColorId, blockInteractions, reactEnabled, markerClickBehavior, webhookUrl, webhooksEnabled).
  - L158–167 — `DEFAULT_SETTINGS`; L188–204 — `COLOR_OPTIONS` (srgb + display-p3); L206–231 — `injectAgentationColorTokens`.
  - L551–563 — load + validate from `feedback-toolbar-settings`; L720–729 — save effect; L565–575 + L730–739 — theme state + `feedback-toolbar-theme` persistence.

## Acceptance criteria

- [ ] `src/lib/components/page-toolbar/settings-panel/` exports `SettingsPanel` with the upstream prop surface (L11–33), and `checkbox-field/` exists as its own subdir mirroring upstream.
- [ ] `ToolbarSettings`, `DEFAULT_SETTINGS`, `COLOR_OPTIONS`, and `injectAgentationColorTokens` are ported with identical field names, defaults, color ids/values, and the injected style tag id `agentation-color-tokens` (it sets `--agentation-color-accent` per `data-agentation-accent`).
- [ ] Note: `OutputDetailLevel`/`ReactComponentMode` already live in `src/lib/types.ts` per Phase 1 — re-export, don't redefine.
- [ ] Settings load/save round-trips through the upstream localStorage keys (`feedback-toolbar-settings`, `feedback-toolbar-theme`) with the same validation (unknown `annotationColorId` falls back to default, L557–559).
- [ ] All controls render and patch settings via `onSettingsChange`: output detail selector, accent color row, auto-clear, block interactions, marker click behavior, theme toggle, hide-toolbar, and the main/automations page switch (webhook fields render but state-only — no network).
- [ ] Both SCSS modules (809 + 18 LOC) converted; enter/exit (`isVisible`) and `toolbarNearBottom` placement preserved; panel root keeps `data-agentation-settings-panel` and `data-feedback-toolbar`.
- [ ] Tests pass: settings persistence round-trip, patch emission per control, color fallback validation; `pnpm test` green.
- [ ] PORTING.md row updated.
- [ ] PLAN.md checkbox `components/page-toolbar/settings-panel/ incl. checkbox-field` ticked.

## Out of scope

- Live `connectionStatus`/endpoint behavior — Phase 4 (render the disconnected state; props exist now for compat).
- React-detection toggle *behavior* (`reactEnabled` persists but drives nothing until Phase 7).
- Webhook sending (`sendToWebhook`) — Phase 4.
- Mounting the panel in the toolbar / `showSettings` open-close animation state (monolith L636–648) — p2-09.

## Notes

`isDevMode` gates the React-detection section upstream (L576–584); pass it through but expect the section to be inert. The settings *types* are part of the public compat surface — never rename fields (CONTRIBUTING "Compat guardrails").
