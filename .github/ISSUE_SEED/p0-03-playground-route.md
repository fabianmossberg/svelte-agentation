---
title: Playground route with a realistic demo page to annotate
labels: phase:0, type:infra, agent:ok
milestone: Phase 0 — Scaffold
depends_on: p0-01-scaffold-package
---
## Goal

Build the playground app under `src/routes/` (dev-only, never published): a
single realistic demo page with enough varied DOM that every later phase can
be manually tested against it — element picking (Phase 2), multi-select and
text selection (Phase 3), animation freezing, and shadow DOM traversal
(`utils/element-identification.ts` port). This page is the standing manual
test bed referenced by CLAUDE.md's definition of done ("Playground still
works").

## Upstream reference

n/a (infra; nothing is ported). For a sense of what upstream demos against,
see `upstream/package/example/` (their Next.js docs site) — inspiration only,
no code reuse.

## Acceptance criteria

- [ ] `pnpm dev` serves a demo page at `/` containing at minimum: a
      header with nav links, a hero section with headings and buttons, a form
      (text input, checkbox, select, submit), a card grid or list, a data
      table, an image, and a footer.
- [ ] The page includes an element with a running CSS animation and a custom
      element using shadow DOM (both are needed to manually exercise
      `freeze-animations` and shadow-DOM element identification in Phase 1/2).
- [ ] Page renders with no console errors or hydration warnings (SSR on).
- [ ] Packaged output contains no route code: `pnpm build` output (`dist/`)
      includes only `src/lib` content.
- [ ] `pnpm build`, `pnpm check`, `pnpm lint`, `pnpm test` still pass.
- [ ] PLAN.md Phase 0 checkbox "Playground route" ticked.

## Out of scope

- Mounting the `Agentation` toolbar — it does not exist until Phase 2 (the
  Phase 2 toolbar issues add it to this page).
- Visual design polish; static semantic HTML with light styling is enough.
- Playwright/e2e automation of the playground.

## Notes

- Make the page content meaningful (e.g. a fake product/dashboard page), not
  lorem-ipsum soup: annotation output quality checks in Phase 1–3 read
  nearby text and element names from this DOM.
- Keep it one route; more routes can be added later if a phase needs them.
