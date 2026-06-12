# Issue seeds

Each `.md` file here is one GitHub issue, created idempotently by
`python3 scripts/bootstrap-github.py`. Seeds are the reviewable, versioned
source of the backlog; the script records created issue numbers in
`.github/.issue-map.json` (committed) and never creates the same slug twice.

## File format

Filename is the slug: `p<phase>-<nn>-<kebab-title>.md`
(e.g. `p1-03-port-storage.md`). Slug `p<N>-99-gate` is reserved for each
phase's gate issue. Files are processed in lexicographic order, so
dependencies resolve naturally when they point backwards.

```markdown
---
title: Port utils/storage.ts verbatim
labels: phase:1, type:port, agent:ok
milestone: Phase 1 — Portable core
depends_on: p0-01-scaffold-package
---
## Goal
...

## Upstream reference
...

## Acceptance criteria
- [ ] ...

## Out of scope
...
```

Frontmatter rules (parsed by the script — keep it simple):

- `title` — plain string, required.
- `labels` — comma-separated, from the set defined in CONTRIBUTING.md, required.
- `milestone` — exact milestone name (must match the list in
  `scripts/bootstrap-github.py`), required.
- `depends_on` — comma-separated seed slugs, optional. The script appends a
  "Blocked by" section with real `#N` links in a second pass after all
  issues exist. Do not write your own "Blocked by" section in the body.

The body must contain the sections from CONTRIBUTING.md "Issue anatomy":
Goal, Upstream reference, Acceptance criteria, Out of scope (Notes optional).
