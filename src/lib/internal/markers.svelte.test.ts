import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '../types.js';
import { MarkersController, type MarkersControllerOptions } from './markers.svelte.js';

// New tests (no upstream equivalent — this controller is a Svelte rewrite of
// upstream's inline marker-presentation state, issue #18). They drive the timed
// show/hide, the delete renumber choreography, the staggered clear, scroll
// debouncing, and hover re-resolution.
//
// Timers: the controller schedules on `originalSetTimeout` (captured at module
// load from the *real* `setTimeout`), which `vi.useFakeTimers()` cannot reach.
// So we inject the faked global `setTimeout`/`clearTimeout` through the
// controller's `scheduleTimeout`/`cancelTimeout` options — the same seam the
// freeze-animations decoupling leaves open — and drive them with
// `vi.advanceTimersByTime`.

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	document.body.innerHTML = '';
	delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
	delete (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
});

function makeAnnotation(id: string, overrides: Partial<Annotation> = {}): Annotation {
	return {
		id,
		x: 0,
		y: 0,
		comment: '',
		element: 'div',
		elementPath: 'body > div',
		timestamp: 0,
		...overrides
	};
}

/**
 * Build a controller backed by a mutable annotation array. `removeAnnotation`/
 * `clearAnnotations` are spies that *also* mutate the backing array, so the
 * controller's own reads (e.g. clear's `count`) see the same list the toolbar's
 * annotations controller would.
 */
function makeController(
	annotations: Annotation[] = [],
	options: Partial<MarkersControllerOptions> = {}
) {
	const removeAnnotation = vi.fn((id: string) => {
		const i = annotations.findIndex((a) => a.id === id);
		if (i !== -1) annotations.splice(i, 1);
	});
	const clearAnnotations = vi.fn(() => {
		annotations.length = 0;
	});
	const controller = new MarkersController({
		getAnnotations: () => annotations,
		removeAnnotation,
		clearAnnotations,
		scheduleTimeout: (fn, ms) => setTimeout(fn, ms),
		cancelTimeout: (h) => clearTimeout(h),
		...options
	});
	return { controller, removeAnnotation, clearAnnotations, annotations };
}

describe('MarkersController — visibility show/hide timing', () => {
	it('starts hidden with empty animation sets', () => {
		const { controller } = makeController();
		expect(controller.markersVisible).toBe(false);
		expect(controller.markersExiting).toBe(false);
		expect(controller.animatedMarkers.size).toBe(0);
	});

	it('show mounts immediately and settles the animated set after 350ms', () => {
		const { controller } = makeController([makeAnnotation('a'), makeAnnotation('b')]);

		controller.setVisible(true);
		expect(controller.markersVisible).toBe(true);
		expect(controller.markersExiting).toBe(false);
		// Enter animation not settled yet.
		expect(controller.animatedMarkers.size).toBe(0);

		vi.advanceTimersByTime(349);
		expect(controller.animatedMarkers.size).toBe(0);

		vi.advanceTimersByTime(1);
		expect([...controller.animatedMarkers].sort()).toEqual(['a', 'b']);
	});

	it('hide plays the 250ms exit then unmounts', () => {
		const { controller } = makeController([makeAnnotation('a')]);
		controller.setVisible(true);
		vi.advanceTimersByTime(350);

		controller.setVisible(false);
		// Exit animation playing, still mounted.
		expect(controller.markersExiting).toBe(true);
		expect(controller.markersVisible).toBe(true);

		vi.advanceTimersByTime(249);
		expect(controller.markersVisible).toBe(true);

		vi.advanceTimersByTime(1);
		expect(controller.markersVisible).toBe(false);
		expect(controller.markersExiting).toBe(false);
	});

	it('is a no-op when the value is unchanged (React dep semantics)', () => {
		const { controller } = makeController([makeAnnotation('a')]);
		controller.setVisible(true);
		vi.advanceTimersByTime(350);
		expect([...controller.animatedMarkers]).toEqual(['a']);

		// A repeat show must NOT reset the animated set (effect would not re-run).
		controller.setVisible(true);
		expect([...controller.animatedMarkers]).toEqual(['a']);
	});

	it('hide before mount is a no-op (never plays exit when not visible)', () => {
		const { controller } = makeController();
		controller.setVisible(false);
		expect(controller.markersExiting).toBe(false);
		expect(controller.markersVisible).toBe(false);
	});

	it('toggling off before the 350ms settle clears the pending enter timer', () => {
		const { controller } = makeController([makeAnnotation('a')]);
		controller.setVisible(true);

		// Hide at 100ms — before the enter settle would fire.
		vi.advanceTimersByTime(100);
		controller.setVisible(false);
		expect(controller.markersExiting).toBe(true);

		// The 350ms enter timer was cleared, so the animated set never fills.
		vi.advanceTimersByTime(250);
		expect(controller.animatedMarkers.size).toBe(0);
		expect(controller.markersVisible).toBe(false);
	});
});

describe('MarkersController — delete renumber choreography', () => {
	it('marks exiting immediately, defers removal to 150ms, then renumbers', () => {
		const annotations = [makeAnnotation('a'), makeAnnotation('b'), makeAnnotation('c')];
		const { controller, removeAnnotation } = makeController(annotations);

		controller.startDelete('a');
		// Immediate: marker flagged, list untouched.
		expect(controller.deletingMarkerId).toBe('a');
		expect(controller.exitingMarkers.has('a')).toBe(true);
		expect(removeAnnotation).not.toHaveBeenCalled();

		vi.advanceTimersByTime(150);
		// Now the list mutates and the flags clear.
		expect(removeAnnotation).toHaveBeenCalledWith('a');
		expect(controller.exitingMarkers.has('a')).toBe(false);
		expect(controller.deletingMarkerId).toBeNull();
		// 'a' was index 0 of 3 → later markers renumber from 0.
		expect(controller.renumberFrom).toBe(0);

		vi.advanceTimersByTime(200);
		expect(controller.renumberFrom).toBeNull();
	});

	it('does not renumber when the last marker is deleted', () => {
		const annotations = [makeAnnotation('a'), makeAnnotation('b')];
		const { controller } = makeController(annotations);

		controller.startDelete('b'); // last index
		vi.advanceTimersByTime(150);
		expect(controller.renumberFrom).toBeNull();
	});
});

describe('MarkersController — staggered clear', () => {
	it('sets isClearing, then empties + resets after count*30+200ms', () => {
		const annotations = [makeAnnotation('a'), makeAnnotation('b'), makeAnnotation('c')];
		const { controller, clearAnnotations } = makeController(annotations);

		// Seed an animated set so we can prove it resets.
		controller.setVisible(true);
		vi.advanceTimersByTime(350);
		expect(controller.animatedMarkers.size).toBe(3);

		controller.startClear();
		expect(controller.isClearing).toBe(true);
		expect(clearAnnotations).not.toHaveBeenCalled();

		const total = 3 * 30 + 200; // 290ms
		vi.advanceTimersByTime(total - 1);
		expect(clearAnnotations).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(clearAnnotations).toHaveBeenCalledOnce();
		expect(controller.isClearing).toBe(false);
		expect(controller.animatedMarkers.size).toBe(0);
	});

	it('is a no-op when there is nothing to clear', () => {
		const { controller, clearAnnotations } = makeController([]);
		controller.startClear();
		expect(controller.isClearing).toBe(false);
		vi.advanceTimersByTime(1000);
		expect(clearAnnotations).not.toHaveBeenCalled();
	});
});

describe('MarkersController — scroll tracking', () => {
	function setScrollY(value: number) {
		Object.defineProperty(window, 'scrollY', { value, configurable: true });
	}

	it('seeds scrollY on start and updates it on scroll, debouncing isScrolling', () => {
		setScrollY(0);
		const { controller } = makeController();
		controller.start();
		expect(controller.scrollY).toBe(0);
		expect(controller.isScrolling).toBe(false);

		setScrollY(120);
		window.dispatchEvent(new Event('scroll'));
		expect(controller.scrollY).toBe(120);
		expect(controller.isScrolling).toBe(true);

		// Debounce resets 150ms after the last scroll event.
		vi.advanceTimersByTime(149);
		expect(controller.isScrolling).toBe(true);
		vi.advanceTimersByTime(1);
		expect(controller.isScrolling).toBe(false);

		controller.destroy();
	});

	it('a later scroll extends the debounce window', () => {
		setScrollY(0);
		const { controller } = makeController();
		controller.start();

		window.dispatchEvent(new Event('scroll'));
		vi.advanceTimersByTime(100);
		// Second scroll before the 150ms elapses — prior timer is cancelled.
		window.dispatchEvent(new Event('scroll'));
		vi.advanceTimersByTime(100);
		expect(controller.isScrolling).toBe(true); // would have stopped at 150 from the first
		vi.advanceTimersByTime(50);
		expect(controller.isScrolling).toBe(false);

		controller.destroy();
	});

	it('removes the scroll listener on destroy', () => {
		setScrollY(0);
		const { controller } = makeController();
		controller.start();
		controller.destroy();

		setScrollY(500);
		window.dispatchEvent(new Event('scroll'));
		expect(controller.scrollY).toBe(0); // listener gone, no update
	});
});

describe('MarkersController — marker hover re-resolution', () => {
	/** Make `elementFromPoint` resolve to `el` (drives `deepElementFromPoint`). */
	function hitTestReturns(el: Element | null) {
		(document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = vi
			.fn()
			.mockReturnValue(el);
	}

	function stubRect(el: HTMLElement, width: number, height: number) {
		el.getBoundingClientRect = () =>
			({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height }) as DOMRect;
	}

	it('clears all hover state when passed null', () => {
		const { controller } = makeController();
		controller.hoveredMarkerId = 'x';
		controller.handleMarkerHover(null);
		expect(controller.hoveredMarkerId).toBeNull();
		expect(controller.hoveredTargetElement).toBeNull();
		expect(controller.hoveredTargetElements).toEqual([]);
	});

	it('re-resolves a single-select element whose size matches the stored box', () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		stubRect(el, 100, 40);
		hitTestReturns(el);

		const { controller } = makeController();
		controller.handleMarkerHover(
			makeAnnotation('a', { boundingBox: { x: 0, y: 0, width: 100, height: 40 } })
		);

		expect(controller.hoveredMarkerId).toBe('a');
		expect(controller.hoveredTargetElement).toBe(el);
		expect(controller.hoveredTargetElements).toEqual([]);
	});

	it('rejects a found element much smaller than the stored box (a child)', () => {
		const child = document.createElement('span');
		document.body.appendChild(child);
		stubRect(child, 20, 10); // < 50% of the stored 100x40 box
		hitTestReturns(child);

		const { controller } = makeController();
		controller.handleMarkerHover(
			makeAnnotation('a', { boundingBox: { x: 0, y: 0, width: 100, height: 40 } })
		);
		expect(controller.hoveredTargetElement).toBeNull();
	});

	it('offsets a scrolling annotation by scrollY when hit-testing', () => {
		Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
		const el = document.createElement('div');
		stubRect(el, 100, 40);
		const efp = vi.fn().mockReturnValue(el);
		(document as unknown as { elementFromPoint: typeof efp }).elementFromPoint = efp;

		const { controller } = makeController();
		// y center = 100 + 200/... ; box y=300,h=40 → centerY = 320 - scrollY(200) = 120
		controller.handleMarkerHover(
			makeAnnotation('a', { isFixed: false, boundingBox: { x: 0, y: 300, width: 100, height: 40 } })
		);
		expect(efp).toHaveBeenCalledWith(50, 120);
		expect(controller.hoveredTargetElement).toBe(el);
	});

	it('does not subtract scrollY for a fixed annotation', () => {
		Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
		const el = document.createElement('div');
		stubRect(el, 100, 40);
		const efp = vi.fn().mockReturnValue(el);
		(document as unknown as { elementFromPoint: typeof efp }).elementFromPoint = efp;

		const { controller } = makeController();
		controller.handleMarkerHover(
			makeAnnotation('a', { isFixed: true, boundingBox: { x: 0, y: 300, width: 100, height: 40 } })
		);
		// centerY = 300 + 40/2 = 320, no scrollY subtraction
		expect(efp).toHaveBeenCalledWith(50, 320);
	});

	it('re-resolves multi-select elements via elementsFromPoint, skipping marker/root', () => {
		Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
		const marker = document.createElement('div');
		marker.setAttribute('data-annotation-marker', '');
		const real = document.createElement('div');
		document.body.appendChild(real);
		// elementsFromPoint returns the marker first, then the real element.
		(document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = vi
			.fn()
			.mockReturnValue([marker, real]);

		const { controller } = makeController();
		controller.handleMarkerHover(
			makeAnnotation('a', {
				elementBoundingBoxes: [{ x: 0, y: 0, width: 50, height: 50 }]
			})
		);
		expect(controller.hoveredTargetElements).toEqual([real]);
		expect(controller.hoveredTargetElement).toBeNull();
	});

	it('clears target elements when the annotation has no bounding box', () => {
		const { controller } = makeController();
		controller.handleMarkerHover(makeAnnotation('a'));
		expect(controller.hoveredMarkerId).toBe('a');
		expect(controller.hoveredTargetElement).toBeNull();
		expect(controller.hoveredTargetElements).toEqual([]);
	});
});

describe('MarkersController — edit tracking re-resolution', () => {
	function hitTestReturns(el: Element | null) {
		(document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = vi
			.fn()
			.mockReturnValue(el);
	}

	function stubRect(el: HTMLElement, width: number, height: number) {
		el.getBoundingClientRect = () =>
			({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height }) as DOMRect;
	}

	it('clears editing + hover state when passed null', () => {
		const { controller } = makeController();
		controller.hoveredMarkerId = 'x';
		controller.editingTargetElement = document.createElement('div');
		controller.editingTargetElements = [document.createElement('div')];

		controller.handleEditTracking(null);

		expect(controller.editingTargetElement).toBeNull();
		expect(controller.editingTargetElements).toEqual([]);
		expect(controller.hoveredMarkerId).toBeNull();
	});

	it('clears any active hover highlight when entering edit', () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		stubRect(el, 100, 40);
		hitTestReturns(el);

		const { controller } = makeController();
		controller.hoveredMarkerId = 'a';
		controller.hoveredTargetElement = el;
		controller.hoveredTargetElements = [el];

		controller.handleEditTracking(
			makeAnnotation('a', { boundingBox: { x: 0, y: 0, width: 100, height: 40 } })
		);

		expect(controller.hoveredMarkerId).toBeNull();
		expect(controller.hoveredTargetElement).toBeNull();
		expect(controller.hoveredTargetElements).toEqual([]);
	});

	it('re-resolves a single-select element whose size matches the stored box', () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		stubRect(el, 100, 40);
		hitTestReturns(el);

		const { controller } = makeController();
		controller.handleEditTracking(
			makeAnnotation('a', { boundingBox: { x: 0, y: 0, width: 100, height: 40 } })
		);

		expect(controller.editingTargetElement).toBe(el);
		expect(controller.editingTargetElements).toEqual([]);
	});

	it('rejects a found element much smaller than the stored box (a child)', () => {
		const child = document.createElement('span');
		document.body.appendChild(child);
		stubRect(child, 20, 10); // < 50% of the stored 100x40 box
		hitTestReturns(child);

		const { controller } = makeController();
		controller.handleEditTracking(
			makeAnnotation('a', { boundingBox: { x: 0, y: 0, width: 100, height: 40 } })
		);
		expect(controller.editingTargetElement).toBeNull();
	});

	it('re-resolves multi-select boxes via deepElementFromPoint (one per box)', () => {
		Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
		const a = document.createElement('div');
		const b = document.createElement('div');
		document.body.append(a, b);
		const efp = vi.fn().mockReturnValueOnce(a).mockReturnValueOnce(b);
		(document as unknown as { elementFromPoint: typeof efp }).elementFromPoint = efp;

		const { controller } = makeController();
		controller.handleEditTracking(
			makeAnnotation('a', {
				elementBoundingBoxes: [
					{ x: 0, y: 0, width: 50, height: 50 },
					{ x: 100, y: 100, width: 50, height: 50 }
				]
			})
		);

		expect(controller.editingTargetElements).toEqual([a, b]);
		expect(controller.editingTargetElement).toBeNull();
		// One hit-test per stored box, at each box centre.
		expect(efp).toHaveBeenCalledWith(25, 25);
		expect(efp).toHaveBeenCalledWith(125, 125);
	});

	it('clears editing targets when the annotation has no bounding box', () => {
		hitTestReturns(null);
		const { controller } = makeController();
		controller.handleEditTracking(makeAnnotation('a'));
		expect(controller.editingTargetElement).toBeNull();
		expect(controller.editingTargetElements).toEqual([]);
	});
});
