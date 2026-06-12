---
title: Port UI primitives — checkbox, switch, tooltip, help-tooltip
labels: phase:2, type:port, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p2-04-port-icons, p1-99-gate
---
## Goal

Port the four small presentational primitives to `src/lib/components/` (one dir each, mirroring upstream), converting each dir's SCSS module into the component's scoped `<style>`. These unblock the settings panel and popup.

## Upstream reference

- `upstream/package/src/components/checkbox/index.tsx` (27 LOC) + `styles.module.scss` (58 LOC) — styled native checkbox passthrough.
- `upstream/package/src/components/switch/index.tsx` (12 LOC) + `styles.module.scss` (50 LOC) — styled native checkbox rendered as a switch.
- `upstream/package/src/components/tooltip/index.tsx` (102 LOC) — positioning tooltip; uses `createPortal` and `originalSetTimeout` from `utils/freeze-animations` (ported in Phase 1).
- `upstream/package/src/components/help-tooltip/index.tsx` (15 LOC) + `styles.module.scss` (22 LOC) — composes `Tooltip` + `IconHelp`.

## Acceptance criteria

- [ ] `src/lib/components/checkbox/`, `switch/`, `tooltip/`, `help-tooltip/` exist, each exporting the upstream component name (`Checkbox`, `Switch`, `Tooltip`, `HelpTooltip`) with the same props (rest-props spread onto the native input preserved for checkbox/switch).
- [ ] Tooltip replaces `createPortal` with a Svelte-idiomatic equivalent (e.g. `mount()` or an attachment appending to `document.body`) and keeps using `originalSetTimeout` for its delay timers.
- [ ] Each dir's SCSS module is converted to the component's `<style>` block with visually identical output (class names may become scoped; any `:global` use justified by a `// DIVERGENCE(upstream):` comment).
- [ ] Tests pass: render tests for all four primitives (checked/unchecked, tooltip show-on-hover with fake timers); `pnpm test` green.
- [ ] PORTING.md rows updated for all four dirs.
- [ ] PLAN.md Primitives checkbox ticked (icons landed in the issue this depends on).

## Out of scope

- `settings-panel/checkbox-field` — belongs to the settings-panel issue (p2-08).
- Toolbar button tooltips (those are CSS-only spans inside the toolbar styles, not this `Tooltip` component).

## Notes

Upstream's `HelpTooltip` is 15 lines; resist merging the four into one file — the dirs must mirror upstream so release diffs map 1:1 (PLAN "Strategy decisions").
