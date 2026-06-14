import { afterEach, describe, expect, it, vi } from 'vitest';
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
	// jsdom ships no layout, so `elementFromPoint` doesn't exist as a property —
	// we assign it per-test (below) rather than spy on it; remove it here.
	delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
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
	type: 'mousemove' | 'click',
	clientX: number,
	clientY: number,
	target: EventTarget = document.body
) {
	target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }));
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
