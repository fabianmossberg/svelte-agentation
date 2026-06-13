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

**Environment:**
- Viewport: unknown

---

### 1. Button
*Forensic data shown for first element of selection*
**Full DOM Path:** html > body > main > button.btn
**CSS Classes:** btn btn-primary
**Position:** x:10, y:21 (101×40px)
**Annotation at:** 12.3% from left, 679px from top
**Selected text:** "Click me"
**Computed Styles:** color: rgb(255, 0, 0); display: flex
**Accessibility:** role=button, aria-label=Submit
**Nearby Elements:** <span>, <svg>
**Source:** src/Button.tsx:42
**React:** <App> <Dashboard> <Button>
**Feedback:** Primary CTA is misaligned

### 2. p
**Annotation at:** 0.0% from left, 0px from top
**Selected text:** "This selected text is definitely longer than thirty characters"
**Feedback:** Selected text over the 30-char compact cutoff

### 3. section
**Annotation at:** 100.0% from left, 1235px from top
**Context:** Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore 
**Feedback:** Context shown because there is no selectedText

### 4. a
**CSS Classes:** nav-link
**Position:** x:6, y:7 (8×9px)
**Annotation at:** 25.5% from left, 50px from top
**Feedback:** isMultiSelect without fullPath omits the first-element note