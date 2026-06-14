<!--
  GENERATED COMPAT FIXTURE — DO NOT EDIT BY HAND.

  Produced by scripts/generate-fixtures.ts, which feeds tests/fixtures/annotations.json
  to UPSTREAM's own utils/generate-output.ts (run via tsx against the pinned baseline
  in upstream/, see UPSTREAM.md). Regenerate with:  pnpm fixtures:generate

  Per CONTRIBUTING.md, tests/fixtures/ is never hand-edited: if tests/compat.test.ts
  fails against one of these files the bug is a type:compat divergence in our port
  (src/lib/utils/generate-output.ts), never the fixture.
-->

## Page Feedback: /dashboard/settings

1. **Button** (src/Button.tsx:42): Primary CTA is misaligned (re: "Click me")
2. **p**: Selected text over the 30-char compact cutoff (re: "This selected text is definite...")
3. **section**: Context shown because there is no selectedText
4. **a**: isMultiSelect without fullPath omits the first-element note