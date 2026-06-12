---
title: Picker controller — activate/deactivate, hover tracking, element hit-testing
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p1-99-gate
---
## Goal

Create `src/lib/internal/picker.svelte.ts`, a runes controller for "feedback mode": toolbar active/inactive, document-level hover tracking with shadow-DOM-aware hit-testing, click-to-create-pending-annotation, the custom crosshair cursor, and clean teardown on deactivate/unmount. This is the second of the monolith's three state groups.

## Upstream reference

`upstream/package/src/components/page-toolbar-css/index.tsx`:

- L238–251 — `deepElementFromPoint` (recursive shadow-root piercing); L252–264 — `isElementFixed`.
- L342 — `isActive`; L372–373 — `hoverInfo` / `hoverPosition`.
- L1838–1876 — mousemove handler (hover info + rect, skipping toolbar elements).
- L1926–2079 — click handler (hit-test → identify element via `utils/element-identification` → build pending annotation data, incl. fixed-element and selected-text branches).
- L1793–1829 — custom cursor injection while active; L1830–1837 — stroke-hover cursor (draw-mode part out of scope).
- L1628–1641 — `deactivate`; L1769–1785 — reset-state-on-deactivate effect; L1786–1792 — unmount safety.
- L348–369 — body-level `stopPropagation` contract (events originating inside the toolbar must not reach document-level "click outside" handlers).

Element identification comes from the Phase 1 port of `upstream/package/src/utils/element-identification.ts`.

## Acceptance criteria

- [ ] `src/lib/internal/picker.svelte.ts` exports a controller with `isActive`, `hoverInfo` (element, rect, name), `hoverPosition`, and a pending-annotation creation result handed to the annotations controller's `pending` state.
- [ ] Hit-testing pierces open shadow roots (port of `deepElementFromPoint`, L238–251) and detects fixed-position targets (port of `isElementFixed`, L252–264).
- [ ] Hovering ignores toolbar-owned elements (anything under `[data-feedback-toolbar]` / `[data-agentation-root]`), mirroring upstream's checks.
- [ ] Clicking an element while active produces pending-annotation data with the same fields upstream builds at L1926–2079 (element name, path, coordinates, `isFixed`, `boundingBox`, nearby text, computed styles), using the ported `utils/element-identification.ts` — React-detection fields stay undefined.
- [ ] Document listeners are registered only while active and are removed on deactivate and on component unmount (mirrors L1769–1792); custom cursor is restored.
- [ ] Unit tests (vitest + jsdom) cover activate → hover → click → pending data, listener cleanup, and shadow-DOM hit-testing; all tests pass.
- [ ] PORTING.md row updated.
- [ ] PLAN.md checkbox `internal/picker.svelte.ts` ticked.

## Out of scope

- Multi-select drag and cmd+shift+click multi-select (L2080–2556) — Phase 3.
- Text-selection annotations (`selectedText` capture beyond what the click handler port requires) — Phase 3.
- Draw mode, design/layout mode branches inside the click handler — Phases 3/6 (leave `// DIVERGENCE(upstream):` comments where branches are omitted).
- Marker rendering and animation — p2-03/p2-07.

## Notes

`identifyElementWithReact` (monolith L97–237) wraps `identifyElement` with React detection; our port calls the plain `identifyElement` from Phase 1 and leaves the React path empty (RESEARCH.md §1, "React-only features").
