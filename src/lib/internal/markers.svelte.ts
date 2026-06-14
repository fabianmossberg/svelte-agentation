// =============================================================================
// Markers controller
// =============================================================================
//
// Svelte 5 runes controller for everything *marker-presentation*: the unified
// show/hide visibility with timed enter/exit animations, the per-marker
// animated/exiting/deleting sets, post-delete renumbering, the staggered
// clear-all, scroll tracking, and live re-positioning when hovering a marker
// whose element has moved. The third (after `internal/annotations.svelte.ts`,
// issue #16, and `internal/picker.svelte.ts`, issue #17) of upstream's three
// toolbar state clusters.
//
// This is a *rewrite* of state upstream keeps inline in the 4.7k-LOC monolith
// `components/page-toolbar-css/index.tsx`. The upstream line ranges this
// mirrors are recorded in PORTING.md. In particular:
//   - `markersVisible`/`markersExiting` (L370–371), `isClearing`,
//     `hoveredMarkerId`, `hoveredTargetElement(s)`, `deletingMarkerId`,
//     `renumberFrom` (L409–417), `scrollY`/`isScrolling` (L426–427) → `$state`.
//   - `animatedMarkers`/`exitingMarkers` sets (L609–612) → `SvelteSet`s.
//     DIVERGENCE(upstream): upstream rebuilds the set on every change
//     (`new Set(prev).add(id)`) because React tracks state by reference
//     identity; `SvelteSet` is a reactive proxy whose `.add`/`.delete`/`.clear`
//     are individually tracked, so we mutate in place — the lint
//     (`svelte/prefer-svelte-reactivity`) enforces this over a plain `Set`.
//   - the unified marker-visibility effect (L650–679; 350ms enter settle,
//     250ms exit unmount) → `setVisible()`.
//   - scroll tracking (L1197–1219) → `start()`/`destroy()` (listener added
//     once, passive, removed on teardown) + `#scrollTimer` debounce.
//   - `handleMarkerHover` (L2754–2813) → `handleMarkerHover()`.
//   - the exit/renumber choreography inside `deleteAnnotation` (L2715–2748;
//     the *list mutation* belongs to the annotations controller, #16) →
//     `startDelete()`.
//   - the staggered clear-all timing (L2868–2938; the *list mutation* is the
//     annotations controller's `clearAll`) → `startClear()`.
//
// Like its siblings, the lifecycle is driven imperatively (`start`/`destroy`
// + `setVisible`) rather than through `$effect`, so it is deterministic and
// testable outside an effect-root. Upstream expresses the same contracts
// through `useEffect`: the visibility effect keyed on `shouldShowMarkers`, the
// scroll effect keyed on `[]` (mount/unmount). `setVisible()` reproduces
// React's effect-cleanup semantics by hand — clearing the prior branch's timer
// before running the next branch, exactly as `useEffect`'s returned cleanup runs
// before the next effect when the dependency changes.
//
// All timers use `originalSetTimeout` from `utils/freeze-animations.ts` so
// freezing the page (which hijacks the global `setTimeout`) never freezes marker
// animations — upstream does the same throughout. Both are injectable for tests
// (default to the originals), mirroring the annotations controller's injectable
// `now`/`generateId`.
//
// DOM-free by design for the render layers: upstream renders two marker layers
// (scrolling `y - scrollY` vs `isFixed`, L4183–4265); this controller only
// supplies the state they read, so jsdom tests stay simple. The one DOM-touching
// method is `handleMarkerHover`, which re-resolves an annotation's element(s) by
// hit-testing their stored bounding-box centre for live position tracking.
//
// Out of scope (issue #18), left as `// DIVERGENCE(upstream):` markers at the
// omission sites:
//   - the marker DOM/SVG itself → p2-07 (`annotation-marker` components).
//   - multi-select bounding-box outlines → Phase 3.
//   - the toolbar's `cleared` "Cleared!" button state (L2908/L2940) → toolbar
//     button state, a later issue.
//   - the edit-popup exit animation on delete (`editExiting`, L2705–2713) →
//     popup component; the annotations controller's `remove()` already closes
//     the editor when the deleted annotation is the one being edited.
//   - draw-stroke/design-placement/rearrange/wireframe clearing in clear-all
//     (L2870–2930) and server sync / webhooks throughout → other controllers /
//     Phase 4/6.

import { SvelteSet } from 'svelte/reactivity';
import type { Annotation } from '../types';
import { originalSetTimeout } from '../utils/freeze-animations';

/**
 * Recursively pierces open shadow roots to find the deepest element at a point.
 * `document.elementFromPoint()` stops at shadow hosts, so we drill into open
 * shadow roots to reach the real target. Port of upstream's module-private
 * `deepElementFromPoint` (index.tsx L238–251), kept verbatim. The picker
 * controller (#17) ports the same helper — upstream defines it once at module
 * scope and uses it from several call sites; our decomposition means each
 * controller that needs it carries its own copy.
 */
function deepElementFromPoint(x: number, y: number): HTMLElement | null {
	let element = document.elementFromPoint(x, y) as HTMLElement | null;
	if (!element) return null;

	// Keep drilling down through shadow roots
	while (element?.shadowRoot) {
		const deeper = element.shadowRoot.elementFromPoint(x, y) as HTMLElement | null;
		if (!deeper || deeper === element) break;
		element = deeper;
	}

	return element;
}

/**
 * Options for {@link MarkersController}. The controller never reaches into a
 * sibling controller's state: it reads the annotation list through
 * {@link getAnnotations} and asks the annotations controller (#16) to mutate the
 * list through {@link removeAnnotation} / {@link clearAnnotations} — the toolbar
 * wires those to `annotations.remove` / `annotations.clearAll`. This keeps the
 * marker *timing* here and the list *mutation* in the annotations controller,
 * the split the issue calls for.
 */
export type MarkersControllerOptions = {
	/**
	 * The current committed annotation list. Read at timer-fire time so the
	 * enter-settle, delete-renumber, and clear-stagger maths see the live list.
	 * Mirrors upstream's `annotations` state, which those effects/callbacks close
	 * over (index.tsx L343).
	 */
	getAnnotations: () => Annotation[];
	/**
	 * Remove the annotation with `id` from the list. Called at the *end* of the
	 * delete choreography (after the 150ms exit), so the marker animates out
	 * before the list mutates — upstream defers the same `setAnnotations(filter)`
	 * to L2736. The toolbar wires this to the annotations controller's `remove`.
	 */
	removeAnnotation: (id: string) => void;
	/**
	 * Empty the annotation list. Called at the end of the staggered clear (after
	 * `count * 30 + 200`ms), matching upstream's deferred `setAnnotations([])`
	 * (L2934). The toolbar wires this to the annotations controller's `clearAll`.
	 */
	clearAnnotations: () => void;
	/**
	 * Timer scheduler. Defaults to `originalSetTimeout` from
	 * `utils/freeze-animations.ts` so marker animations survive a page freeze.
	 * Injectable so tests can drive the timings with fake timers.
	 */
	scheduleTimeout?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
	/** Cancel a handle from {@link scheduleTimeout}. Defaults to `clearTimeout`. */
	cancelTimeout?: (handle: ReturnType<typeof setTimeout>) => void;
};

export class MarkersController {
	#options: MarkersControllerOptions;
	#scheduleTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
	#cancelTimeout: (handle: ReturnType<typeof setTimeout>) => void;

	// --- Visibility (upstream L370–371, L650–679) --------------------------------
	/** Whether the marker layers are mounted. Read-only to callers. */
	markersVisible = $state(false);
	/** Whether the markers are playing their exit animation before unmount. */
	markersExiting = $state(false);
	/** Ids of markers whose enter animation has settled (upstream L609–611). */
	animatedMarkers = new SvelteSet<string>();
	/** Ids of markers currently playing their exit animation (upstream L612). */
	exitingMarkers = new SvelteSet<string>();

	// --- Delete / clear choreography (upstream L409, L416–417) -------------------
	/** Id of the single marker being deleted right now, or null (upstream L416). */
	deletingMarkerId = $state<string | null>(null);
	/** Markers from this list index onward renumber after a delete (L417). */
	renumberFrom = $state<number | null>(null);
	/** Whether the staggered clear-all is in flight (upstream L409). */
	isClearing = $state(false);

	// --- Hover / live position tracking (upstream L410–415) ----------------------
	/** Id of the hovered marker, or null (upstream L410). */
	hoveredMarkerId = $state<string | null>(null);
	/** Re-resolved element under the hovered single-select marker (L411). */
	hoveredTargetElement = $state<HTMLElement | null>(null);
	/** Re-resolved elements under a hovered multi-select marker (L413–415). */
	hoveredTargetElements = $state<HTMLElement[]>([]);

	// --- Scroll tracking (upstream L426–427, L1197–1219) -------------------------
	/** Current `window.scrollY`; the scrolling marker layer subtracts it (L426). */
	scrollY = $state(0);
	/** True briefly while scrolling, debounced 150ms after the last event (L427). */
	isScrolling = $state(false);

	/** Last `shouldShow` value passed to {@link setVisible} (React dep tracking). */
	#shouldShow = false;
	/** Pending visibility timer (enter-settle or exit-unmount), so it can be
	 * cleared before the next branch runs — React's effect-cleanup semantics. */
	#visibilityTimer: ReturnType<typeof setTimeout> | null = null;
	/** Pending scroll-stop debounce (upstream `scrollTimeoutRef`, L631). */
	#scrollTimer: ReturnType<typeof setTimeout> | null = null;

	// Bound listener reference so `removeEventListener` matches on teardown.
	#onScroll = () => this.#handleScroll();

	constructor(options: MarkersControllerOptions) {
		this.#options = options;
		this.#scheduleTimeout = options.scheduleTimeout ?? originalSetTimeout;
		this.#cancelTimeout = options.cancelTimeout ?? ((handle) => clearTimeout(handle));
	}

	/**
	 * Begin scroll tracking: seed `scrollY` and attach the passive scroll
	 * listener. Idempotent-ish (the toolbar calls it once on mount). SSR-safe —
	 * no-op without a `window`. Mirrors upstream's mount effect seeding
	 * `setScrollY(window.scrollY)` (L683) plus the scroll effect attaching the
	 * listener (L1198–1212).
	 */
	start(): void {
		if (typeof window === 'undefined') return;
		this.scrollY = window.scrollY;
		window.addEventListener('scroll', this.#onScroll, { passive: true });
	}

	/**
	 * Tear everything down — the component calls this on unmount so the scroll
	 * listener and any in-flight animation timers never outlive the toolbar.
	 * Mirrors upstream's scroll-effect cleanup (L1213–1218) and the visibility
	 * effect's timer cleanup on unmount.
	 */
	destroy(): void {
		if (typeof window !== 'undefined') {
			window.removeEventListener('scroll', this.#onScroll);
		}
		if (this.#visibilityTimer !== null) {
			this.#cancelTimeout(this.#visibilityTimer);
			this.#visibilityTimer = null;
		}
		if (this.#scrollTimer !== null) {
			this.#cancelTimeout(this.#scrollTimer);
			this.#scrollTimer = null;
		}
	}

	/**
	 * Drive the unified marker-visibility animation. The toolbar calls this
	 * whenever the derived `isActive && showMarkers` changes (upstream's
	 * `shouldShowMarkers`; the `!isDesignMode` term is Phase 6 and omitted).
	 *
	 * Port of the visibility effect (index.tsx L650–679). To reproduce React's
	 * `useEffect([shouldShowMarkers])` semantics imperatively: we no-op when the
	 * value is unchanged (the effect would not re-run), and otherwise clear the
	 * previous branch's timer (the effect's returned cleanup) before running the
	 * new branch.
	 *
	 * Showing: reset exit/animated state, mount the layers, then after the 350ms
	 * enter settle mark every current annotation as animated. Hiding (only when
	 * already visible): start the 250ms exit animation, then unmount.
	 */
	setVisible(shouldShow: boolean): void {
		if (shouldShow === this.#shouldShow) return;
		this.#shouldShow = shouldShow;

		// Cleanup of the previous effect run (React runs this before the next one).
		if (this.#visibilityTimer !== null) {
			this.#cancelTimeout(this.#visibilityTimer);
			this.#visibilityTimer = null;
		}

		if (shouldShow) {
			// Show markers - reset animations and make visible (upstream L655–657).
			this.markersExiting = false;
			this.markersVisible = true;
			this.animatedMarkers.clear();
			// After enter animations complete, mark all current markers as animated.
			// DIVERGENCE(upstream): upstream's 350ms callback closes over the
			// `annotations` from when the effect ran (L663); we read the live list
			// at fire time via `getAnnotations()`, which is equivalent for the
			// common case and avoids threading a stale snapshot through.
			this.#visibilityTimer = this.#scheduleTimeout(() => {
				for (const a of this.#options.getAnnotations()) this.animatedMarkers.add(a.id);
				this.#visibilityTimer = null;
			}, 350);
		} else if (this.markersVisible) {
			// Hide markers - start exit animation, then unmount (upstream L669–674).
			this.markersExiting = true;
			this.#visibilityTimer = this.#scheduleTimeout(() => {
				this.markersVisible = false;
				this.markersExiting = false;
				this.#visibilityTimer = null;
			}, 250);
		}
	}

	/**
	 * Delete the annotation with `id` with its exit choreography. Marks the marker
	 * deleting + exiting immediately, then after the 150ms exit animation asks the
	 * annotations controller to remove it from the list, clears the exiting/
	 * deleting flags, and — if a later marker needs it — triggers the 200ms
	 * renumber animation. Port of the timing in `deleteAnnotation` (index.tsx
	 * L2715–2748); the list filter (L2736) is the annotations controller's job
	 * (#16), so we call `removeAnnotation` rather than mutate the list here.
	 *
	 * DIVERGENCE(upstream): upstream fires `onAnnotationDelete` immediately
	 * (L2719–2722) and defers only the list filter; our `removeAnnotation`
	 * unifies callback + filter, so the callback fires at the 150ms mark instead.
	 */
	startDelete(id: string): void {
		const annotations = this.#options.getAnnotations();
		const deletedIndex = annotations.findIndex((a) => a.id === id);

		this.deletingMarkerId = id;
		this.exitingMarkers.add(id);

		// Wait for exit animation then remove (upstream L2735).
		this.#scheduleTimeout(() => {
			this.#options.removeAnnotation(id);

			this.exitingMarkers.delete(id);
			this.deletingMarkerId = null;

			// Trigger renumber animation for markers after the deleted one
			// (upstream L2744–2748). `annotations.length` is the pre-delete length,
			// matching upstream's closed-over `annotations`.
			if (deletedIndex < annotations.length - 1) {
				this.renumberFrom = deletedIndex;
				this.#scheduleTimeout(() => (this.renumberFrom = null), 200);
			}
		}, 150);
	}

	/**
	 * Clear every annotation with the staggered exit. Sets `isClearing`, then
	 * after `count * 30 + 200`ms asks the annotations controller to empty the
	 * list and resets the animated set. No-op when the list is already empty.
	 * Port of the timing in `clearAll` (index.tsx L2868–2938); the list mutation
	 * (L2934) is the annotations controller's `clearAll`.
	 *
	 * DIVERGENCE(upstream): the `cleared` "Cleared!" button state (L2908/L2940)
	 * is toolbar button state — a later issue — so it is not tracked here. As with
	 * {@link startDelete}, `onAnnotationsClear` fires when the list empties (end
	 * of the stagger) rather than immediately, because `clearAnnotations` unifies
	 * the callback and the mutation.
	 */
	startClear(): void {
		const count = this.#options.getAnnotations().length;
		if (count === 0) return;

		this.isClearing = true;

		const totalAnimationTime = count * 30 + 200;
		this.#scheduleTimeout(() => {
			this.#options.clearAnnotations();
			this.animatedMarkers.clear(); // Reset animated markers (upstream L2935).
			this.isClearing = false;
		}, totalAnimationTime);
	}

	/**
	 * Re-resolve the hovered marker's element(s) by hit-testing their stored
	 * bounding-box centre, for live position tracking while hovered. Pass `null`
	 * on hover-leave to clear. Port of `handleMarkerHover` (index.tsx L2754–2813),
	 * handling multi-select (`elementBoundingBoxes`), single-select
	 * (`boundingBox`, with the fixed-vs-scrolling `scrollY` offset and the
	 * size-ratio sanity check that rejects a too-small child element), and the
	 * no-bounding-box fallback.
	 *
	 * SSR-safe via the caller — this only runs on real hover events in the
	 * browser; it reads `window.scrollY` and `document` directly as upstream does.
	 */
	handleMarkerHover(annotation: Annotation | null): void {
		if (!annotation) {
			this.hoveredMarkerId = null;
			this.hoveredTargetElement = null;
			this.hoveredTargetElements = [];
			return;
		}

		this.hoveredMarkerId = annotation.id;

		// Find elements at the annotation's position(s) for live tracking.
		if (annotation.elementBoundingBoxes?.length) {
			// Cmd+shift+click: find element at each bounding box center.
			const elements: HTMLElement[] = [];
			for (const bb of annotation.elementBoundingBoxes) {
				const centerX = bb.x + bb.width / 2;
				const centerY = bb.y + bb.height / 2 - window.scrollY;
				// Use elementsFromPoint to look through the marker if it's covering.
				const allEls = document.elementsFromPoint(centerX, centerY);
				const el = allEls.find(
					(e) => !e.closest('[data-annotation-marker]') && !e.closest('[data-agentation-root]')
				) as HTMLElement | undefined;
				if (el) elements.push(el);
			}
			this.hoveredTargetElements = elements;
			this.hoveredTargetElement = null;
		} else if (annotation.boundingBox) {
			// Single element.
			const bb = annotation.boundingBox;
			const centerX = bb.x + bb.width / 2;
			const centerY = annotation.isFixed
				? bb.y + bb.height / 2
				: bb.y + bb.height / 2 - window.scrollY;
			const el = deepElementFromPoint(centerX, centerY);

			// Validate found element's size roughly matches stored bounding box
			// (prevents using wrong child element when clicking center of a container).
			if (el) {
				const elRect = el.getBoundingClientRect();
				const widthRatio = elRect.width / bb.width;
				const heightRatio = elRect.height / bb.height;
				// If found element is much smaller than stored, it's probably a child - don't use it.
				if (widthRatio < 0.5 || heightRatio < 0.5) {
					this.hoveredTargetElement = null;
				} else {
					this.hoveredTargetElement = el;
				}
			} else {
				this.hoveredTargetElement = null;
			}
			this.hoveredTargetElements = [];
		} else {
			this.hoveredTargetElement = null;
			this.hoveredTargetElements = [];
		}
	}

	/**
	 * Scroll handler — port of upstream's `handleScroll` (index.tsx L1199–1210).
	 * Tracks `scrollY`, flips `isScrolling` true, and debounces it back to false
	 * 150ms after the last scroll event.
	 */
	#handleScroll(): void {
		this.scrollY = window.scrollY;
		this.isScrolling = true;

		if (this.#scrollTimer !== null) {
			this.#cancelTimeout(this.#scrollTimer);
		}

		this.#scrollTimer = this.#scheduleTimeout(() => {
			this.isScrolling = false;
			this.#scrollTimer = null;
		}, 150);
	}
}
