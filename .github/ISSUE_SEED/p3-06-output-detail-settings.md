---
title: Output Detail setting (compact → forensic) wired through to generateOutput
labels: phase:3, type:feature, agent:ok
milestone: Phase 3 — Advanced annotations
depends_on: p2-99-gate
---
## Goal

The settings panel gets upstream's "Output Detail" cycle control — a button
showing the current level's label plus four dots, cycling
compact → standard → detailed → forensic — persisted in the
`feedback-toolbar-settings` localStorage key and passed as
`settings.outputDetail` to `generateOutput` on every copy/send, so the same
annotations produce byte-identical markdown to upstream at every level.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/settings-panel/index.tsx`
  (352 LOC) — lines 91–130: the "Output Detail" row (HelpTooltip, cycle
  button with label keyed for animation, dot indicators with active state)
- `upstream/package/src/utils/generate-output.ts` (129 LOC) — lines 17–25
  (`OUTPUT_DETAIL_OPTIONS` value/label list), 27–31 (`generateOutput`
  signature, default `"standard"`)
- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - 142–167 — `OutputDetailLevel`, `ToolbarSettings.outputDetail`,
    `DEFAULT_SETTINGS.outputDetail: "standard"`
  - 551–564 — settings loaded from `feedback-toolbar-settings` and merged
    over defaults (invalid/missing values fall back)
  - 720–728 — settings persisted to the same key on change
  - 579–583 — `effectiveReactMode` derived via `OUTPUT_TO_REACT_MODE`
    (dev mode + `reactEnabled` only)
  - 2959–2962, 3152–3155 — `generateOutput(annotations, pathname,
    settings.outputDetail)` in the copy/send flows

## Acceptance criteria

- [ ] Settings panel shows the "Output Detail" row: label + HelpTooltip
      ("Controls how much detail is included in the copied output"), cycle
      button with the current level's label and four dots, active dot
      matching the current level
- [ ] Clicking the button advances through `OUTPUT_DETAIL_OPTIONS` in order
      and wraps from forensic back to compact
- [ ] The chosen level is persisted in the `feedback-toolbar-settings`
      localStorage JSON and survives a reload; an invalid stored value
      falls back to the default (`"standard"`)
- [ ] Copy (and keyboard "C") calls `generateOutput` with
      `settings.outputDetail`; with the same `Annotation[]` fixture, the
      copied markdown is byte-identical to upstream's at each of the four
      levels (toolbar-level test on top of the Phase 1 fixture parity)
- [ ] Forensic level includes the Environment block; compact omits the
      viewport line — verified through the toolbar path, not just the util
- [ ] `effectiveReactMode` derivation is mirrored but resolves to `"off"`
      in our port (React detection not ported); documented as a PORTING.md
      row if not already recorded in Phase 1/2
- [ ] PLAN.md Phase 3 "Detail-level settings" checkbox ticked

## Out of scope

- Any change to `utils/generate-output.ts` or `OUTPUT_DETAIL_OPTIONS`
  (ported in Phase 1)
- The "React Components" toggle's detection behavior (Svelte equivalent is
  Phase 7; the setting stays inert)
- Other settings rows (webhook URL, colors, marker click behavior — Phase 2
  scope)

## Notes

- RESEARCH.md flags that upstream leaks `OutputDetailLevel` /
  `ReactComponentMode` from the toolbar component; Phase 1 moved them to
  `types.ts` — import from there, keeping the exported names identical.
