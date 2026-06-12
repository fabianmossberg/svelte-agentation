---
title: Add the port's copyright line to LICENSE alongside upstream's notice
labels: phase:0, type:docs, agent:ok
milestone: Phase 0 — Scaffold
---
## Goal

Finish the licensing checkbox. The repo's `LICENSE` is currently a verbatim
copy of upstream's short-form PolyForm Shield 1.0.0 notice carrying only
"Copyright (c) 2026 Benji Taylor". Per the plan ("upstream copyright +
ours"), add a copyright line for this port *alongside* — never replacing or
obscuring — upstream's line, and confirm the README attribution section
satisfies PLAN.md.

## Upstream reference

- `upstream/package/LICENSE` — 27 lines, identical to `upstream/LICENSE` and
  to our current `LICENSE` (verified byte-identical at the pinned commit).

## Acceptance criteria

- [ ] `LICENSE` retains upstream's line "Copyright (c) 2026 Benji Taylor"
      byte-for-byte.
- [ ] A second copyright line for this port is added directly below it
      (e.g. "Copyright (c) 2026 Fabian Mossberg, for the svelte-agentation
      port" — final wording stated in the PR description).
- [ ] `diff LICENSE upstream/package/LICENSE` shows ONLY the added line — no
      other wording, condition, or formatting changes to the license text.
- [ ] README's "License & attribution" section still names PolyForm Shield
      1.0.0, Benji Taylor/upstream, and credits `sv-agentation` (it already
      does — verify, adjust only if wrong).
- [ ] PLAN.md Phase 0 checkbox "Add `LICENSE` (PolyForm Shield 1.0.0,
      upstream copyright + ours), attribution section in README" ticked.

## Out of scope

- Contacting Benji Taylor (Phase 5, `agent:needs-human`).
- Changing license terms, switching to PolyForm's long-form text, or adding
  per-file license headers.
- Touching `upstream/` (gitignored pinned clone) in any way.

## Notes

- PolyForm Shield condition 2 in our LICENSE text forbids removing or
  obscuring existing notices — the change must be purely additive.
- RESEARCH.md §3 records the license decision (keep PolyForm Shield, attribute
  clearly, ask for blessing later).
- No dependency on the package scaffold; this can land any time in Phase 0.
