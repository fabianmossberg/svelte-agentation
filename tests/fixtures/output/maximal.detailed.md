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
**Viewport:** unknown

### 1. Button
**Location:** body > main > button.btn
**Source:** src/Button.tsx:42
**React:** <App> <Dashboard> <Button>
**Classes:** btn btn-primary
**Position:** 10px, 21px (101×40px)
**Selected text:** "Click me"
**Feedback:** Primary CTA is misaligned

### 2. p
**Location:** body > p
**Selected text:** "This selected text is definitely longer than thirty characters"
**Feedback:** Selected text over the 30-char compact cutoff

### 3. section
**Location:** body > section#intro
**Context:** Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore 
**Feedback:** Context shown because there is no selectedText

### 4. a
**Location:** body > nav > a
**Classes:** nav-link
**Position:** 6px, 7px (8×9px)
**Feedback:** isMultiSelect without fullPath omits the first-element note