---
title: Contact Benji Taylor with the built package and ask for his blessing
labels: phase:5, type:docs, agent:needs-human
milestone: Phase 5 — Parity audit + release
depends_on: p5-04-package-readme
---
## Goal

Before anything is published, upstream's author hears about this project
from us, not from npm: present Benji Taylor with the built package, the
COMPAT.md e2e evidence (his unmodified MCP server driving our toolbar), and
our license stance (PolyForm Shield 1.0.0 retained, full attribution), and
ask for his blessing. PLAN.md is explicit: wait for his response before the
npm publish (p5-07).

## Upstream reference

n/a (outreach). Context links instead:

- Upstream issue
  [#50 "Vue3 version"](https://github.com/benjitaylor/agentation/issues/50)
  — cite it as evidence of demand for non-React versions.
- COMPAT.md (Phase 4 deliverable) — the proof the port speaks his protocol.

## Acceptance criteria

- [ ] Outreach message drafted (an agent may draft it) and reviewed,
      covering: who/what this is, the direct-port + mirrored-file-layout
      approach that keeps upstream diffs applicable, schema/output/MCP
      compatibility evidence (COMPAT.md), license stance and attribution,
      the repo link, the explicit ask for a blessing before npm publish,
      and a reference to
      [#50 "Vue3 version"](https://github.com/benjitaylor/agentation/issues/50)
      for non-React demand.
- [ ] A human sends the message (GitHub issue on
      `benjitaylor/agentation` or email) — a link to or copy of the sent
      message is recorded in this issue.
- [ ] His response is summarized in an issue comment, and the resulting
      decision (blessing / conditions / objection / no-response policy with
      a dated waiting period) is recorded.
- [ ] p5-07 (npm publish) is explicitly unblocked or re-scoped in light of
      the response.
- [ ] PLAN.md Phase 5 checkbox "**Contact Benji Taylor** …" ticked.

## Out of scope

- The npm publish itself (p5-07).
- Negotiating upstream changes (e.g. an `agentation-core` extraction, as
  floated in RESEARCH.md) — fine to mention as a soft idea, but do not make
  the blessing contingent on it.
- The SikandarJODD heads-up (p5-06).

## Notes

- RESEARCH.md §3 records the accepted license risk and the decision to ask
  for a blessing; this issue executes that decision.
- Tone guidance: we reuse his portable core verbatim under his license,
  rewrote only the React UI, and intend to track his releases (UPSTREAM.md
  process) — the message should read as alignment, not competition, which
  also matters under PolyForm Shield's noncompete clause.
