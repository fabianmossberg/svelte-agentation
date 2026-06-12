---
title: Page toolbar component — body mount, expand/collapse shell, dragging, layer composition
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-01-annotations-controller, p2-02-picker-controller, p2-03-markers-controller, p2-06-annotation-popup, p2-07-annotation-marker, p2-08-settings-panel
---
## Goal

Build `src/lib/components/page-toolbar/` — the Svelte rewrite of the monolith's component shell: mounted to `document.body` (Svelte `mount()` replaces React's `createPortal`), the collapsed-pill ⇄ expanded-toolbar morph with control buttons and CSS tooltips, toolbar dragging with persisted position, settings open/close, and composition of the marker layers, hover overlay, and pending/edit popups on top of the three controllers.

## Upstream reference

`upstream/package/src/components/page-toolbar-css/index.tsx` (4709 LOC):

- L348–369 — body-level event-propagation blocker (toolbar events must not leak to document-level "click outside" handlers).
- L342–346, L565–575 — `isActive`, toolbar hidden/hiding, dark mode; L404–435 — copied/cleared/clearing flags, settings visibility, `settingsPage`, `tooltipsHidden`; L500–543 — tooltip-session state + controls mouse enter/leave.
- L594–607 — toolbar position + drag state; L740–754 — persist position (`feedback-toolbar-position`); L3216–3285 — drag mousemove/mouseup; L3286–3317 — `handleToolbarMouseDown` (incl. "just finished drag" click suppression); L3318–3364 — constrain position on resize.
- L636–648 — settings open/close exit-animation effect.
- L3510–3518 — renderable-annotation filter; L3519–3564 — viewport-aware marker-tooltip positioning helper.
- L3565–3985 — render: portal wrapper with `data-agentation-theme`/`data-agentation-accent`/`data-agentation-root`, toolbar shell, badge, control buttons (pause, markers eye, copy, clear, settings…) with `.buttonTooltip` spans and shortcut hints.
- L3986–4050 — `SettingsPanel` usage; L4183–4265 — scrolling + fixed marker layers with `AnnotationMarker`/`ExitingMarker`; L4266–4499 — interactive overlay (hover highlight, hovered-annotation outline); L4500–4709 — `PendingMarker` + pending/edit `AnnotationPopupCSS` wiring.

## Acceptance criteria

- [ ] `src/lib/components/page-toolbar/` exports the toolbar component; rendering it mounts all UI to `document.body` (works when the host app renders it anywhere) and unmounts cleanly.
- [ ] Events originating inside toolbar UI do not propagate to document-level listeners (port of L348–369; verify in the playground against a "click outside closes" dropdown).
- [ ] Collapsed pill shows `IconListSparkle` + annotation-count badge; clicking expands to the controls row; expanded controls show CSS tooltips with shortcut hints; structure mirrors L3565–3985 with the same `data-feedback-toolbar`/`data-agentation-*` attributes.
- [ ] Toolbar is draggable, constrained to the viewport on resize (L3318–3364), persists position to `feedback-toolbar-position`, and suppresses the click-to-expand after a drag (L3287–3317).
- [ ] Marker layers render from the markers + annotations controllers: scrolling layer (`y - scrollY`) and fixed layer, exiting ghosts included (L4183–4265); hover highlight and hovered-marker element outline render in the overlay (L4266–4499).
- [ ] Pending and edit popups mount with `PendingMarker` per L4500–4709, wired to the annotations controller (`add`/`update`/`remove`/cancel) and popup `shake()` on invalid submit.
- [ ] Settings button toggles `SettingsPanel` with the open/close animation contract (L636–648) and `toolbarNearBottom` placement.
- [ ] Component test passes: toolbar renders into `document.body`, expands on click, shows badge count from seeded annotations; `pnpm test` green.
- [ ] PORTING.md row updated (monolith → controllers/components map).
- [ ] PLAN.md checkbox `components/page-toolbar/` ticked.

## Out of scope

- Visual pixel-parity of the full SCSS (only enough styles to be operable) — p2-10 completes style parity.
- Copy/clear-all/keyboard-shortcut/freeze end-to-end behavior — p2-12 (buttons may render with minimal handlers).
- Props surface + `index.ts` exports — p2-11.
- Design/layout mode, draw canvas, multi-select overlays, server/demo code paths (L755–1196, L1236–1768, L2080–2589, L4050–4180) — Phases 3/4/6; leave `// DIVERGENCE(upstream):` markers where they are skipped.

## Notes

This is the largest Phase 2 issue; it stays one-session-sized only because the three controllers (p2-01..03) and all child components (p2-06..08) are done. If it still balloons, split the overlay/popup composition into a follow-up issue rather than growing the PR (CONTRIBUTING "Worked").
