// Public-surface + callback-wiring tests for the page toolbar (issue #26).
//
// Adapts upstream's `components/page-toolbar-css/index.test.tsx` (prop
// acceptance, `copyToClipboard` default, `Annotation` shape) to the project's
// vitest + Svelte `mount()` idiom, and adds the issue's required assertion that
// each *wired* callback fires once with the right payload. Like `toolbar.test.ts`
// it mounts the public `index.svelte` directly and asserts against
// `document.body` (the toolbar's UI lives in the body portal), seeding through
// `utils/storage` so the annotations controller hydrates as it would in a browser.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock `freeze-animations` so the markers controller's exit timers (`startDelete`
// 150ms, `startClear` count*30+200ms) route through the global `setTimeout` that
// `vi.useFakeTimers()` can intercept — `originalSetTimeout` is captured native at
// module load otherwise. Tests that don't enable fake timers get the real timer
// and behave normally.
vi.mock('../../utils/freeze-animations', () => ({
	originalSetTimeout: (handler: TimerHandler, timeout?: number) => setTimeout(handler, timeout),
	originalRequestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0),
	// The toolbar imports `freeze`/`unfreeze` (pause-animations wiring) and calls
	// `unfreeze` on unmount (the safety teardown) — stub them so the mock is complete.
	freeze: () => {},
	unfreeze: () => {}
}));

import { flushSync, mount, unmount } from 'svelte';
import type { Annotation } from '../../types';
import { clearAnnotations, saveAnnotations } from '../../utils/storage';
import PageToolbar from './index.svelte';
import type { AgentationProps } from './index.svelte';

const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

function ann(overrides: Partial<Annotation> = {}): Annotation {
	return {
		id: `a-${Math.random().toString(36).slice(2)}`,
		x: 50,
		y: 100,
		comment: 'Make this bigger',
		element: 'button',
		elementPath: 'main > button',
		timestamp: 0,
		...overrides
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mounted: Array<{ instance: any; target: HTMLElement }> = [];

function renderToolbar(props: AgentationProps = {}): void {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(PageToolbar, { target, props });
	flushSync(); // run onMount so the UI lands in document.body
	mounted.push({ instance, target });
}

/** Find a control-row button by the text of its adjacent `.buttonTooltip`. */
function controlButton(tooltip: string): HTMLButtonElement {
	const wrapper = [...document.body.querySelectorAll('.buttonWrapper')].find((w) =>
		w.querySelector('.buttonTooltip')?.textContent?.includes(tooltip)
	);
	return wrapper!.querySelector('button')!;
}

function click(el: Element): void {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	flushSync();
}

// Resolved-promise microtask drain — `copyOutput` awaits `clipboard.writeText`
// before firing `onCopy`, so the callback lands a microtask after the click.
async function microtasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);

beforeEach(() => {
	writeText.mockClear();
	// Stub only `navigator.clipboard` (leave `userAgent` etc. intact for
	// `generateOutput`). Mirrors upstream's clipboard mock (index.test.tsx L8–17).
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
	for (const { instance, target } of mounted.splice(0)) {
		unmount(instance);
		target.remove();
	}
	clearAnnotations(pathname);
	localStorage.clear();
	sessionStorage.clear();
	vi.useRealTimers();
});

describe('AgentationProps surface', () => {
	it('accepts the full upstream prop surface without throwing', () => {
		// Every public prop (wired + inert), mirroring upstream's prop-acceptance
		// tests. The inert ones (endpoint/sessionId/onSubmit/webhookUrl/demo*) are
		// type-accepted but drive nothing yet (Phases 4/5).
		expect(() =>
			renderToolbar({
				onAnnotationAdd: vi.fn(),
				onAnnotationDelete: vi.fn(),
				onAnnotationUpdate: vi.fn(),
				onAnnotationsClear: vi.fn(),
				onCopy: vi.fn(),
				onSubmit: vi.fn(),
				copyToClipboard: false,
				className: 'consumer-class',
				endpoint: 'http://localhost:4747',
				sessionId: 'sess-1',
				onSessionCreated: vi.fn(),
				webhookUrl: 'http://localhost:9999/hook',
				demoAnnotations: [{ selector: 'button', comment: 'demo' }],
				demoDelay: 500,
				enableDemoMode: false
			})
		).not.toThrow();
		expect(document.body.querySelector('.toolbar')).not.toBeNull();
	});

	it('applies className to the toolbar shell (upstream `className`, not `class`)', () => {
		renderToolbar({ className: 'consumer-class' });
		const toolbar = document.body.querySelector('.toolbar')!;
		expect(toolbar.classList.contains('consumer-class')).toBe(true);
	});
});

describe('copyToClipboard + onCopy', () => {
	it('defaults copyToClipboard to true — copies the markdown to the clipboard', async () => {
		saveAnnotations(pathname, [ann()]);
		const onCopy = vi.fn();
		renderToolbar({ onCopy });

		click(controlButton('Copy feedback'));
		await microtasks();

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(onCopy).toHaveBeenCalledTimes(1);
		const md = onCopy.mock.calls[0][0] as string;
		expect(typeof md).toBe('string');
		expect(md).toContain('Make this bigger');
		// The clipboard receives the same markdown that `onCopy` is handed.
		expect(writeText).toHaveBeenCalledWith(md);
	});

	it('skips the clipboard when copyToClipboard={false} but still fires onCopy', async () => {
		saveAnnotations(pathname, [ann()]);
		const onCopy = vi.fn();
		renderToolbar({ onCopy, copyToClipboard: false });

		click(controlButton('Copy feedback'));
		await microtasks();

		expect(writeText).not.toHaveBeenCalled();
		expect(onCopy).toHaveBeenCalledTimes(1);
		expect(onCopy.mock.calls[0][0]).toContain('Make this bigger');
	});

	it('is a no-op (no callback, no clipboard) when there are no annotations', async () => {
		const onCopy = vi.fn();
		renderToolbar({ onCopy });

		// The copy button is disabled with no annotations; invoking the handler
		// directly still produces empty output and bails before clipboard/onCopy.
		click(controlButton('Copy feedback'));
		await microtasks();

		expect(writeText).not.toHaveBeenCalled();
		expect(onCopy).not.toHaveBeenCalled();
	});
});

describe('annotation callbacks fire once with the right payload', () => {
	it('onAnnotationUpdate fires with the edited annotation when the edit popup submits', () => {
		const a = ann({ comment: 'old' });
		saveAnnotations(pathname, [a]);
		const onAnnotationUpdate = vi.fn();
		renderToolbar({ onAnnotationUpdate });

		// Activate so the markers render, then open the edit popup (default
		// markerClickBehavior is "edit").
		click(document.body.querySelector('.toolbarContainer')!);
		click(document.body.querySelector('[data-annotation-marker]')!);

		const textarea = document.body.querySelector('[data-annotation-popup] textarea')!;
		(textarea as HTMLTextAreaElement).value = 'new comment';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		click(document.body.querySelector('[data-annotation-popup] .submit')!);

		expect(onAnnotationUpdate).toHaveBeenCalledTimes(1);
		expect(onAnnotationUpdate.mock.calls[0][0]).toMatchObject({ id: a.id, comment: 'new comment' });
	});

	it('onAnnotationDelete fires with the removed annotation after the exit animation', () => {
		vi.useFakeTimers();
		const a = ann();
		saveAnnotations(pathname, [a]);
		const onAnnotationDelete = vi.fn();
		renderToolbar({ onAnnotationDelete });

		click(document.body.querySelector('.toolbarContainer')!);
		click(document.body.querySelector('[data-annotation-marker]')!);
		// Delete from the edit popup → markers.startDelete → list mutates at 150ms.
		click(document.body.querySelector('[data-annotation-popup] .deleteButton')!);
		expect(onAnnotationDelete).not.toHaveBeenCalled(); // not until removal commits

		vi.advanceTimersByTime(150);
		flushSync();

		expect(onAnnotationDelete).toHaveBeenCalledTimes(1);
		expect(onAnnotationDelete.mock.calls[0][0]).toMatchObject({ id: a.id });
	});

	it('onAnnotationsClear fires with all cleared annotations after the stagger', () => {
		vi.useFakeTimers();
		const a = ann({ comment: 'one' });
		const b = ann({ comment: 'two' });
		saveAnnotations(pathname, [a, b]);
		const onAnnotationsClear = vi.fn();
		renderToolbar({ onAnnotationsClear });

		click(controlButton('Clear all'));
		expect(onAnnotationsClear).not.toHaveBeenCalled(); // not until the list empties

		vi.advanceTimersByTime(2 * 30 + 200);
		flushSync();

		expect(onAnnotationsClear).toHaveBeenCalledTimes(1);
		const cleared = onAnnotationsClear.mock.calls[0][0] as Annotation[];
		expect(cleared.map((c) => c.id)).toEqual([a.id, b.id]);
	});
});

// Ported verbatim-in-spirit from upstream index.test.tsx ("Annotation type"):
// compile-time + runtime shape coverage of the public `Annotation` type.
describe('Annotation type', () => {
	it('includes all required fields', () => {
		const annotation: Annotation = {
			id: 'test-id',
			x: 50,
			y: 100,
			comment: 'Test comment',
			element: 'Button',
			elementPath: 'body > div > button',
			timestamp: 0
		};

		expect(annotation.id).toBe('test-id');
		expect(annotation.x).toBe(50);
		expect(annotation.y).toBe(100);
		expect(annotation.comment).toBe('Test comment');
		expect(annotation.element).toBe('Button');
		expect(annotation.elementPath).toBe('body > div > button');
		expect(typeof annotation.timestamp).toBe('number');
	});

	it('allows the optional metadata fields', () => {
		const annotation: Annotation = {
			id: 'test-id',
			x: 50,
			y: 100,
			comment: 'Test comment',
			element: 'Button',
			elementPath: 'body > div > button',
			timestamp: 0,
			selectedText: 'Selected text content',
			boundingBox: { x: 100, y: 200, width: 150, height: 40 },
			nearbyText: 'Context around the element',
			cssClasses: 'btn btn-primary',
			nearbyElements: 'div, span, a',
			computedStyles: 'color: blue; font-size: 14px',
			fullPath: 'html > body > div#app > main > button.btn',
			accessibility: 'role=button, aria-label=Submit',
			isMultiSelect: false,
			isFixed: false
		};

		expect(annotation.selectedText).toBe('Selected text content');
		expect(annotation.boundingBox).toEqual({ x: 100, y: 200, width: 150, height: 40 });
		expect(annotation.cssClasses).toBe('btn btn-primary');
		expect(annotation.fullPath).toBe('html > body > div#app > main > button.btn');
		expect(annotation.accessibility).toBe('role=button, aria-label=Submit');
		expect(annotation.isMultiSelect).toBe(false);
		expect(annotation.isFixed).toBe(false);
	});
});
