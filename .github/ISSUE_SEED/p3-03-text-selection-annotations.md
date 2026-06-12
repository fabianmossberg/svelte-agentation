---
title: Text-selection annotations capture selectedText into popup and output
labels: phase:3, type:feature, agent:ok
milestone: Phase 3 — Advanced annotations
depends_on: p3-01-drag-multi-select
---
## Goal

Clicking to annotate while a text selection is active captures the selection
onto the annotation as `selectedText` (trimmed, capped at 500 chars). The
annotation popup shows a quoted preview (capped at 80 chars), the browser
selection is cleared after saving, and the already-ported
`generate-output.ts` emits the **Selected text** lines per detail level —
byte-identical to upstream.

## Upstream reference

- `upstream/package/src/components/page-toolbar-css/index.tsx` (4,709 LOC):
  - 2028–2032 — capture `window.getSelection()`, trim, slice to 500 chars
  - 2044 — `selectedText` set on the pending annotation
  - 2603 — `selectedText` persisted on save
  - 2651 — `window.getSelection()?.removeAllRanges()` after save
  - 4522, 4651 — `selectedText` passed to `AnnotationPopup` (pending and
    editing popups)
  - 2138–2180 — text-tag mousedown exclusion (from p3-01) that lets native
    selection happen while the toolbar is active
- `upstream/package/src/components/annotation-popup-css/index.tsx`
  (300 LOC) — lines 37 (prop), 76, 252–256 (quoted preview, 80-char cap)
- `upstream/package/src/utils/generate-output.ts` (129 LOC) — lines 58–62
  (compact: `(re: "<30 chars>...")`), 78–83 (forensic: full text + nearbyText
  suppression), 118–123 (standard/detailed: **Selected text** + suppression
  of **Context** when selected text exists)

## Acceptance criteria

- [ ] With the toolbar active, selecting text in the playground and then
      clicking creates a pending annotation whose `selectedText` is the
      trimmed selection, capped at 500 characters
- [ ] The pending popup shows the quoted preview, truncated at 80 chars
      with `...`, matching upstream's popup (annotation-popup-css 252–256);
      the editing popup shows it too
- [ ] After saving, the browser selection is cleared
      (`removeAllRanges`, index.tsx:2651)
- [ ] Whitespace-only selections produce no `selectedText` (field stays
      undefined)
- [ ] Native drag-to-select over paragraphs/headings still works while the
      toolbar is active (regression guard on p3-01's text-tag exclusion)
- [ ] Compat fixture extended: an annotation with `selectedText` (and one
      with both `selectedText` and `nearbyText`) serializes byte-identically
      to upstream `generateOutput` at all 4 detail levels, including the
      compact 30-char `re:` form and the Context-suppression rule
- [ ] PORTING.md row added for any deliberate divergence
- [ ] PLAN.md Phase 3 "Text-selection annotations" checkbox ticked

## Out of scope

- Any change to `utils/generate-output.ts` (ported verbatim in Phase 1 —
  if its output is wrong, that is a `type:compat` bug, not this issue)
- Multi-select and draw mode
- Highlighting/persisting the selection range itself (upstream stores only
  the text)

## Notes

- The capture happens inside the same click handler that creates regular
  annotations (index.tsx 1928–2064) — in our port that is the Phase 2
  picker controller; this issue threads `selectedText` through
  picker → popup → save.
