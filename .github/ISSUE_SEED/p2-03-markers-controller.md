---
title: Markers controller — visibility, enter/exit animation lifecycle, scroll and fixed-element handling
labels: phase:2, type:feature, agent:ok
milestone: Phase 2 — Toolbar MVP
depends_on: p1-99-gate
---
## Goal

Create `src/lib/internal/markers.svelte.ts`, a runes controller for everything marker-presentation: unified show/hide with timed enter/exit animations, per-marker animated/exiting/deleting sets, renumbering after deletes, staggered clear-all, scroll tracking, and live re-positioning when hovering a marker whose element moved. Third of the monolith's three state groups.

## Upstream reference

`upstream/package/src/components/page-toolbar-css/index.tsx`:

- L370–371 — `markersVisible` / `markersExiting`; L409–417 — `isClearing`, `hoveredMarkerId`, hovered target elements, `deletingMarkerId`, `renumberFrom`.
- L609–614 — `animatedMarkers` / `exitingMarkers` sets + `pendingExiting` / `editExiting`.
- L650–679 — the unified marker-visibility effect (`shouldShowMarkers`; 350ms enter settle, 250ms exit unmount).
- L1197–1220 — scroll tracking (`scrollY`, `isScrolling` debounce).
- L2754–2814 — `handleMarkerHover` (re-finds element(s) by stored path for live position tracking).
- L2698–2753 — exit/renumber choreography inside `deleteAnnotation` (the timing part belongs here, the list mutation in p2-01).
- L2867–2942 — staggered clear-all timing.
- L4183–4265 — render contract this controller feeds: separate layers for scrolling markers (`y - scrollY` handled via layer) vs `isFixed` markers.

## Acceptance criteria

- [ ] `src/lib/internal/markers.svelte.ts` exports a controller exposing: `markersVisible`, `markersExiting`, `animatedMarkers`, `exitingMarkers`, `deletingMarkerId`, `renumberFrom`, `isClearing`, `hoveredMarkerId`, `scrollY`, `isScrolling`.
- [ ] Unified visibility logic ports L650–679 with the same 350ms/250ms timings, driven by `(isActive && showMarkers)`.
- [ ] Delete flow: marks the marker exiting, sets `renumberFrom` so later markers renumber, and only then asks the annotations controller to remove — same observable order as upstream L2698–2753.
- [ ] Clear-all flow reproduces upstream's staggered exit (L2867–2942) before the list empties.
- [ ] Scroll handler maintains `scrollY` + debounced `isScrolling` exactly as L1197–1220 (listener added once, passive, removed on teardown).
- [ ] Marker hover re-resolves the annotation's element(s) by stored path for live positioning (port of L2754–2814), handling both fixed and scrolling annotations.
- [ ] Uses `originalSetTimeout` from the ported `utils/freeze-animations.ts` for all timers (so freezing the page never freezes marker animations), as upstream does throughout.
- [ ] Unit tests (vitest + jsdom, fake timers) cover show/hide timing, delete renumbering, and staggered clear; all tests pass.
- [ ] PORTING.md row updated.
- [ ] PLAN.md checkbox `internal/markers.svelte.ts` ticked.

## Out of scope

- The marker DOM/SVG itself — p2-07 (`annotation-marker` components).
- Multi-select bounding-box outlines — Phase 3.
- Window-resize re-constraint of the *toolbar* (L3318–3364) — that is toolbar dragging, p2-09.

## Notes

Upstream renders two marker layers (scrolling vs fixed, L4183–4265); this controller only supplies state — keep it DOM-free so jsdom tests stay simple.
