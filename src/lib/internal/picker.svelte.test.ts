import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PickerController, type PickerControllerOptions } from './picker.svelte.js';
import type { PendingAnnotation } from './annotations.svelte.js';

// New tests (no upstream equivalent — this controller is a Svelte rewrite of
// upstream's inline picker/feedback-mode state, issue #17). jsdom has no layout
// engine, so `document.elementFromPoint` returns null and rects are zero; we
// stub `elementFromPoint` to choose the hit-tested element and (for the
// shadow-DOM case) drive the pierce loop. The event is dispatched on a real
// node so `composedPath()`/`target` exercise the real toolbar/popup guards.

const CURSOR_STYLE_ID = 'feedback-cursor-styles';

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
	document.getElementById(CURSOR_STYLE_ID)?.remove();
	// jsdom ships no layout, so `elementFromPoint`/`elementsFromPoint` don't exist
	// as properties — we assign them per-test rather than spy; remove them here.
	delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
	delete (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
});

/** Build a controller; override options per-test. */
function makeController(options: Partial<PickerControllerOptions> = {}) {
	const onPick = vi.fn();
	const controller = new PickerController({ onPick, ...options });
	return { controller, onPick };
}

/** Append an element to the body and return it. */
function appendEl(tag = 'div', init: (el: HTMLElement) => void = () => {}): HTMLElement {
	const el = document.createElement(tag);
	init(el);
	document.body.appendChild(el);
	return el;
}

/**
 * Make `document.elementFromPoint` resolve to `el`. jsdom has no layout engine
 * and does not define this method, so we assign a mock directly rather than spy.
 */
function hitTestReturns(el: Element | null) {
	(document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = vi
		.fn()
		.mockReturnValue(el);
}

/** Dispatch a bubbling mouse event on `target` (defaults to document.body). */
function fire(
	type: 'mousedown' | 'mousemove' | 'mouseup' | 'click',
	clientX: number,
	clientY: number,
	target: EventTarget = document.body
) {
	target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }));
}

/**
 * jsdom has no layout, so `getBoundingClientRect` returns all-zeros (which the
 * drag size filters reject). Stub a fixed rect so an element can match a drag box.
 */
function stubRect(el: Element, rect: { left: number; top: number; width: number; height: number }) {
	const value: DOMRect = {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height,
		right: rect.left + rect.width,
		bottom: rect.top + rect.height,
		x: rect.left,
		y: rect.top,
		toJSON: () => ({})
	};
	el.getBoundingClientRect = () => value;
}

/**
 * `document.elementsFromPoint` is absent in jsdom (no layout). The live-highlight
 * pass during a drag calls it; default it to `[]` so the drag path runs without
 * throwing. Tests that need point hits override the return value.
 */
function stubElementsFromPoint(elements: Element[] = []) {
	(document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = vi
		.fn()
		.mockReturnValue(elements);
}

describe('PickerController — activate/deactivate', () => {
	it('starts inactive with no hover info', () => {
		const { controller } = makeController();
		expect(controller.isActive).toBe(false);
		expect(controller.hoverInfo).toBeNull();
	});

	it('activate sets isActive and injects the cursor stylesheet', () => {
		const { controller } = makeController();
		controller.activate();

		expect(controller.isActive).toBe(true);
		const style = document.getElementById(CURSOR_STYLE_ID);
		expect(style).not.toBeNull();
		expect(style?.textContent).toContain('crosshair');
		// Excludes the toolbar's own subtree (upstream's notAgentationSelector).
		expect(style?.textContent).toContain('[data-agentation-root]');
	});

	it('activate is idempotent — no duplicate cursor stylesheet', () => {
		const { controller } = makeController();
		controller.activate();
		controller.activate();
		expect(document.querySelectorAll(`#${CURSOR_STYLE_ID}`)).toHaveLength(1);
	});

	it('deactivate clears isActive, removes the cursor, and resets hover info', () => {
		const { controller } = makeController();
		controller.activate();

		hitTestReturns(appendEl('button'));
		fire('mousemove', 10, 10);
		expect(controller.hoverInfo).not.toBeNull();

		controller.deactivate();
		expect(controller.isActive).toBe(false);
		expect(controller.hoverInfo).toBeNull();
		expect(document.getElementById(CURSOR_STYLE_ID)).toBeNull();
	});

	it('deactivate is a no-op when already inactive', () => {
		const { controller } = makeController();
		expect(() => controller.deactivate()).not.toThrow();
		expect(controller.isActive).toBe(false);
	});
});

describe('PickerController — hover tracking', () => {
	it('records element name, path, rect, and pointer position on mousemove', () => {
		const { controller } = makeController();
		controller.activate();

		const button = appendEl('button', (el) => (el.textContent = 'Save'));
		hitTestReturns(button);
		fire('mousemove', 120, 80);

		expect(controller.hoverInfo).toMatchObject({
			element: 'button "Save"',
			elementName: 'button "Save"',
			reactComponents: undefined
		});
		expect(controller.hoverInfo?.elementPath).toContain('button');
		expect(controller.hoverInfo?.rect).not.toBeNull();
		expect(controller.hoverPosition).toEqual({ x: 120, y: 80 });
	});

	it('ignores elements under [data-feedback-toolbar] (event target inside toolbar)', () => {
		const { controller } = makeController();
		controller.activate();

		const toolbar = appendEl('div', (el) => el.setAttribute('data-feedback-toolbar', ''));
		const inner = document.createElement('button');
		toolbar.appendChild(inner);

		hitTestReturns(appendEl('div')); // would-be hover target, never reached
		fire('mousemove', 10, 10, inner);

		expect(controller.hoverInfo).toBeNull();
	});

	it('clears hover info when the hit-tested element is toolbar-owned', () => {
		const { controller } = makeController();
		controller.activate();

		// First a real hover so there is state to clear.
		const button = appendEl('button');
		hitTestReturns(button);
		fire('mousemove', 10, 10);
		expect(controller.hoverInfo).not.toBeNull();

		// Now the hit-test lands inside the toolbar.
		const toolbar = appendEl('div', (el) => el.setAttribute('data-feedback-toolbar', ''));
		const inner = document.createElement('span');
		toolbar.appendChild(inner);
		hitTestReturns(inner);
		fire('mousemove', 20, 20);

		expect(controller.hoverInfo).toBeNull();
	});

	it('does not track hover while an annotation is pending', () => {
		const { controller } = makeController({ isPending: () => true });
		controller.activate();

		hitTestReturns(appendEl('button'));
		fire('mousemove', 10, 10);

		expect(controller.hoverInfo).toBeNull();
	});
});

describe('PickerController — shadow-DOM hit-testing', () => {
	it('pierces an open shadow root to identify the deepest element', () => {
		const { controller } = makeController();
		controller.activate();

		const host = appendEl('div');
		const root = host.attachShadow({ mode: 'open' });
		const inner = document.createElement('button');
		inner.textContent = 'Deep';
		root.appendChild(inner);

		// document.elementFromPoint stops at the host; the pierce loop then
		// queries the host's shadow root for the real target.
		hitTestReturns(host);
		(root as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = vi
			.fn()
			.mockReturnValue(inner);

		fire('mousemove', 50, 50);

		expect(controller.hoverInfo?.element).toBe('button "Deep"');
	});
});

describe('PickerController — click → pending annotation', () => {
	it('builds pending data with upstream fields and hands it to onPick', () => {
		const { controller, onPick } = makeController();
		controller.activate();

		const link = appendEl('a', (el) => {
			el.textContent = 'Docs';
			el.setAttribute('href', '/docs');
		});
		hitTestReturns(link);

		// innerWidth is 1024 in jsdom → x = (512 / 1024) * 100 = 50.
		fire('click', 512, 200, link);

		expect(onPick).toHaveBeenCalledTimes(1);
		const pending = onPick.mock.calls[0][0] as PendingAnnotation;
		expect(pending).toMatchObject({
			x: 50,
			clientY: 200,
			element: 'link "Docs"',
			isFixed: false,
			reactComponents: undefined,
			sourceFile: undefined
		});
		// Not fixed → y is offset by scrollY (0 in jsdom) so equals clientY.
		expect(pending.y).toBe(200);
		expect(pending.targetElement).toBe(link);
		expect(pending.boundingBox).toBeDefined();
		expect(typeof pending.fullPath).toBe('string');
	});

	it('marks fixed-positioned targets and keeps viewport-relative coordinates', () => {
		const { controller, onPick } = makeController();
		controller.activate();

		const fixed = appendEl('div', (el) => (el.style.position = 'fixed'));
		hitTestReturns(fixed);
		fire('click', 100, 300, fixed);

		const pending = onPick.mock.calls[0][0] as PendingAnnotation;
		expect(pending.isFixed).toBe(true);
		expect(pending.y).toBe(300); // clientY, NOT offset by scrollY
	});

	it('does not create an annotation when clicking inside the toolbar', () => {
		const { controller, onPick } = makeController();
		controller.activate();

		const toolbar = appendEl('div', (el) => el.setAttribute('data-feedback-toolbar', ''));
		const button = document.createElement('button');
		toolbar.appendChild(button);
		hitTestReturns(appendEl('div'));

		fire('click', 10, 10, button);
		expect(onPick).not.toHaveBeenCalled();
	});

	it('does not create an annotation when clicking a marker or popup', () => {
		const { controller, onPick } = makeController();
		controller.activate();

		for (const attr of ['data-annotation-popup', 'data-annotation-marker']) {
			const owner = appendEl('div', (el) => el.setAttribute(attr, ''));
			const child = document.createElement('span');
			owner.appendChild(child);
			fire('click', 10, 10, child);
		}
		expect(onPick).not.toHaveBeenCalled();
	});

	it('declines to create a second annotation while one is pending', () => {
		const { controller, onPick } = makeController({ isPending: () => true });
		controller.activate();

		hitTestReturns(appendEl('button'));
		fire('click', 10, 10);
		expect(onPick).not.toHaveBeenCalled();
	});

	it('declines to create an annotation while one is being edited', () => {
		const { controller, onPick } = makeController({ isEditing: () => true });
		controller.activate();

		hitTestReturns(appendEl('button'));
		fire('click', 10, 10);
		expect(onPick).not.toHaveBeenCalled();
	});

	it('clears hover info after creating a pending annotation', () => {
		const { controller } = makeController();
		controller.activate();

		const button = appendEl('button');
		hitTestReturns(button);
		fire('mousemove', 10, 10);
		expect(controller.hoverInfo).not.toBeNull();

		fire('click', 10, 10, button);
		expect(controller.hoverInfo).toBeNull();
	});
});

describe('PickerController — listener cleanup', () => {
	it('stops tracking hover after deactivate', () => {
		const { controller } = makeController();
		controller.activate();
		controller.deactivate();

		hitTestReturns(appendEl('button'));
		fire('mousemove', 10, 10);
		expect(controller.hoverInfo).toBeNull();
	});

	it('stops creating annotations after deactivate', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		controller.deactivate();

		hitTestReturns(appendEl('button'));
		fire('click', 10, 10);
		expect(onPick).not.toHaveBeenCalled();
	});

	it('destroy() tears down listeners and the cursor', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		controller.destroy();

		expect(controller.isActive).toBe(false);
		expect(document.getElementById(CURSOR_STYLE_ID)).toBeNull();

		hitTestReturns(appendEl('button'));
		fire('click', 10, 10);
		expect(onPick).not.toHaveBeenCalled();
	});
});

describe('PickerController — multi-select drag', () => {
	// The hover mousemove handler runs alongside the drag handler on every
	// `mousemove`; default its hit-test to null so it harmlessly clears hover
	// instead of throwing (jsdom has no `elementFromPoint`). Tests that need a
	// click hit-test override this with `hitTestReturns(...)`.
	beforeEach(() => hitTestReturns(null));

	it('starts a drag only once the pointer travels past DRAG_THRESHOLD (8px)', () => {
		const { controller } = makeController();
		controller.activate();
		stubElementsFromPoint();

		fire('mousedown', 100, 100);
		// 5px diagonal (dist² = 50 < 64) — below threshold, no drag yet.
		fire('mousemove', 105, 105);
		expect(controller.isDragging).toBe(false);

		// 10px diagonal (dist² = 200 ≥ 64) — crosses the threshold.
		fire('mousemove', 110, 110);
		expect(controller.isDragging).toBe(true);
	});

	it('does not start a drag from a mousedown on a text element (native selection)', () => {
		const { controller } = makeController();
		controller.activate();
		stubElementsFromPoint();

		const paragraph = appendEl('p', (el) => (el.textContent = 'Selectable copy'));
		fire('mousedown', 100, 100, paragraph);
		fire('mousemove', 200, 200);

		expect(controller.isDragging).toBe(false);
	});

	it('does not start a drag from a mousedown on a contentEditable element', () => {
		const { controller } = makeController();
		controller.activate();
		stubElementsFromPoint();

		const editable = appendEl('div', (el) => el.setAttribute('contenteditable', 'true'));
		// jsdom doesn't compute `isContentEditable` from the attribute — force it so
		// we exercise the controller's `target.isContentEditable` guard directly.
		Object.defineProperty(editable, 'isContentEditable', { value: true, configurable: true });
		fire('mousedown', 100, 100, editable);
		fire('mousemove', 200, 200);

		expect(controller.isDragging).toBe(false);
	});

	it('does not start a drag from a mousedown inside the toolbar', () => {
		const { controller } = makeController();
		controller.activate();
		stubElementsFromPoint();

		const toolbar = appendEl('div', (el) => el.setAttribute('data-feedback-toolbar', ''));
		const inner = document.createElement('div');
		toolbar.appendChild(inner);
		fire('mousedown', 100, 100, inner);
		fire('mousemove', 200, 200);

		expect(controller.isDragging).toBe(false);
	});

	it('on mouseup over matched elements builds one multi-select pending annotation', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		stubElementsFromPoint();

		const save = appendEl('button', (el) => (el.textContent = 'Save'));
		stubRect(save, { left: 120, top: 120, width: 80, height: 40 });
		const docs = appendEl('a', (el) => {
			el.textContent = 'Docs';
			el.setAttribute('href', '/docs');
		});
		stubRect(docs, { left: 220, top: 130, width: 60, height: 30 });

		// Drag a box from (100,100) to (400,400) — both elements intersect it.
		fire('mousedown', 100, 100);
		fire('mousemove', 400, 400);
		fire('mouseup', 400, 400);

		expect(onPick).toHaveBeenCalledTimes(1);
		const pending = onPick.mock.calls[0][0] as PendingAnnotation;
		expect(pending.element).toBe('2 elements: button "Save", link "Docs"');
		expect(pending.elementPath).toBe('multi-select');
		expect(pending.isMultiSelect).toBe(true);
		// Combined bounds: union of the two stubbed rects (document coords, scrollY 0).
		// left 120, top 120, right max(200,280)=280, bottom max(160,160)=160.
		expect(pending.boundingBox).toEqual({ x: 120, y: 120, width: 160, height: 40 });
		// Forensic fields come from the first element in document order (the button).
		expect(typeof pending.fullPath).toBe('string');
		expect(pending.sourceFile).toBeUndefined();
		expect(controller.isDragging).toBe(false);
	});

	it('lists only the first five names with a "+N more" suffix', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		stubElementsFromPoint();

		for (let i = 0; i < 7; i++) {
			const btn = appendEl('button', (el) => (el.textContent = `B${i}`));
			stubRect(btn, { left: 110 + i, top: 110 + i, width: 20, height: 20 });
		}

		fire('mousedown', 100, 100);
		fire('mousemove', 400, 400);
		fire('mouseup', 400, 400);

		const pending = onPick.mock.calls[0][0] as PendingAnnotation;
		expect(pending.element).toMatch(/^7 elements: /);
		expect(pending.element).toContain(' +2 more');
		// Exactly five names before the suffix.
		expect(pending.element.split(', ')).toHaveLength(5);
	});

	it('drops a parent that contains another matched element', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		stubElementsFromPoint();

		// <li> wraps an <a>; both match the selector and the box, but the parent is
		// filtered out, leaving just the link.
		const li = appendEl('li');
		stubRect(li, { left: 110, top: 110, width: 200, height: 60 });
		const link = document.createElement('a');
		link.textContent = 'Nested';
		li.appendChild(link);
		stubRect(link, { left: 115, top: 115, width: 100, height: 30 });

		fire('mousedown', 100, 100);
		fire('mousemove', 400, 400);
		fire('mouseup', 400, 400);

		const pending = onPick.mock.calls[0][0] as PendingAnnotation;
		expect(pending.element).toBe('1 elements: link "Nested"');
	});

	it('over empty space ≥ 20×20px creates an "Area selection" annotation', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		stubElementsFromPoint();

		// Only a <div> on the page — not in the candidate selector, so nothing matches.
		appendEl('div', (el) => (el.textContent = 'background'));

		fire('mousedown', 60, 500);
		fire('mousemove', 300, 580);
		fire('mouseup', 300, 580);

		expect(onPick).toHaveBeenCalledTimes(1);
		const pending = onPick.mock.calls[0][0] as PendingAnnotation;
		expect(pending.element).toBe('Area selection');
		expect(pending.elementPath).toBe('region at (60, 500)');
		expect(pending.isMultiSelect).toBe(true);
		expect(pending.boundingBox).toEqual({ x: 60, y: 500, width: 240, height: 80 });
	});

	it('creates nothing for a drag smaller than 20×20px over empty space', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		stubElementsFromPoint();

		// Crosses the 8px drag threshold but stays under the 20px area minimum.
		fire('mousedown', 100, 100);
		fire('mousemove', 112, 112);
		expect(controller.isDragging).toBe(true);
		fire('mouseup', 115, 115);

		expect(onPick).not.toHaveBeenCalled();
	});

	it('renders a live highlight div into the bound container during a drag', () => {
		const { controller } = makeController();
		controller.activate();

		const container = appendEl('div');
		controller.setHighlightsContainer(container);

		const target = appendEl('button', (el) => (el.textContent = 'Hit'));
		stubRect(target, { left: 150, top: 150, width: 80, height: 40 });
		// The nine sample points all resolve to the button.
		stubElementsFromPoint([target]);

		fire('mousedown', 100, 100);
		fire('mousemove', 400, 400);

		expect(container.children).toHaveLength(1);
		expect(container.children[0].className).toBe('selectedElementHighlight');
	});

	it('swallows the click the browser fires right after a drag', () => {
		const { controller, onPick } = makeController();
		controller.activate();
		stubElementsFromPoint();

		appendEl('div'); // empty page → area-selection drag

		fire('mousedown', 60, 500);
		fire('mousemove', 300, 580);
		fire('mouseup', 300, 580);
		expect(onPick).toHaveBeenCalledTimes(1); // the area selection

		// The trailing click must NOT create a second (single-element) annotation.
		hitTestReturns(appendEl('button'));
		fire('click', 300, 580);
		expect(onPick).toHaveBeenCalledTimes(1);

		// A later, independent click works normally (the guard is one-shot).
		fire('click', 320, 600);
		expect(onPick).toHaveBeenCalledTimes(2);
	});

	it('resets drag state and empties the highlights container on deactivate', () => {
		const { controller } = makeController();
		controller.activate();

		const container = appendEl('div');
		controller.setHighlightsContainer(container);
		const target = appendEl('button', (el) => (el.textContent = 'Hit'));
		stubRect(target, { left: 150, top: 150, width: 80, height: 40 });
		stubElementsFromPoint([target]);

		fire('mousedown', 100, 100);
		fire('mousemove', 400, 400);
		expect(controller.isDragging).toBe(true);
		expect(container.children.length).toBeGreaterThan(0);

		controller.deactivate();
		expect(controller.isDragging).toBe(false);
		expect(container.children).toHaveLength(0);
	});

	it('does not start a drag while an annotation is pending', () => {
		const { controller } = makeController({ isPending: () => true });
		controller.activate();
		stubElementsFromPoint();

		fire('mousedown', 100, 100);
		fire('mousemove', 200, 200);
		expect(controller.isDragging).toBe(false);
	});
});
