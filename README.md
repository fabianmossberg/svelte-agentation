# Svelte Agentation

A Svelte 5 port of [Agentation](https://agentation.com)
([`benjitaylor/agentation`](https://github.com/benjitaylor/agentation)) — the
visual feedback tool for agents — **100% compatible** with upstream's
annotation schema, markdown output, and MCP/server protocol. Annotate your
Svelte app in the browser; your coding agent receives the exact same
structured feedback it would from the React original, including through
upstream's own MCP server, unchanged.

> **Status: pre-release.** Planning is complete; implementation has not
> started. Follow progress in [PLAN.md](PLAN.md) (checkboxes) and the
> [issues](https://github.com/fabianmossberg/svelte-agentation/issues).

## Why this exists

Agentation is React-only (`react` is a peer dependency). The existing Svelte
alternative, [`sv-agentation`](https://github.com/SikandarJODD/sv-agentation),
is a solid independent tool but deliberately uses its own props, output
format, and feature set — it is not schema- or protocol-compatible with
upstream, which is the property this project exists to provide. Full
comparison and decision rationale: [RESEARCH.md](RESEARCH.md).

## Project documents

| Doc | Purpose |
|---|---|
| [PLAN.md](PLAN.md) | Phased roadmap (Phase 0 scaffold → Phase 7 component detection) |
| [RESEARCH.md](RESEARCH.md) | Source-level analysis of upstream + sv-agentation; the decision record |
| [UPSTREAM.md](UPSTREAM.md) | Pinned upstream baseline and the sync process |
| [PORTING.md](PORTING.md) | File-by-file porting ledger with every divergence |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Issue/PR workflow (agent-first development) |
| [CLAUDE.md](CLAUDE.md) | Instructions for coding agents working in this repo |

## License & attribution

Licensed under **PolyForm Shield 1.0.0**, the same license as upstream,
because this port reuses upstream's framework-agnostic core verbatim.
Agentation is created by [Benji Taylor](https://benji.org); this project
exists to bring his tool to the Svelte ecosystem and aims to stay
behavior-identical with the original. Credit also to
[`sv-agentation`](https://github.com/SikandarJODD/sv-agentation), whose
Svelte 5 architecture served as a useful pattern reference (no code reused).
