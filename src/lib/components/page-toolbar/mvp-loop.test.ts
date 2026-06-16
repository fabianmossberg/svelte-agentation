// MVP-loop wiring tests (issue #27): the end-to-end behaviors wired on top of the
// shell — keyboard shortcuts (+ guards), pause-animations (freeze) toggle, and the
// copy-feedback UI (`copied` status + `autoClearAfterCopy`). The copy→`onCopy`→
// clipboard path itself is covered by `props.test.ts` (#26); this file covers the
// behaviors p2-12 adds.
//
// Like the sibling toolbar tests, it mounts the public `index.svelte` directly and
// asserts against `document.body` (the toolbar UI lives in the body portal), seeding
// through `utils/storage` so the annotations controller hydrates as in a browser.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Spy on the freeze util so the pause toggle's calls into it are observable, and
// route `originalSetTimeout`/`RAF` through the global timers so `vi.useFakeTimers()`
// can drive the `copied` reset (2s) and `autoClearAfterCopy` (500ms) timers
// (`originalSetTimeout` is captured native at module load otherwise).
const { freeze, unfreeze } = vi.hoisted(() => ({ freeze: vi.fn(), unfreeze: vi.fn() }));
vi.mock('../../utils/freeze-animations', () => ({
	originalSetTimeout: (handler: TimerHandler, timeout?: number) => setTimeout(handler, timeout),
	originalRequestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0),
	freeze,
	unfreeze
}));

import { flushSync, mount, unmount } from 'svelte';
import type { Annotation } from '../../types';
import { clearAnnotations, saveAnnotations } from '../../utils/storage';
import { DEFAULT_SETTINGS } from '../../internal/settings.svelte';
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

/** Enter feedback mode by clicking the collapsed pill. */
function activate(): void {
	click(document.body.querySelector('.toolbarContainer')!);
}

function isActive(): boolean {
	return document.body.querySelector('.toolbarContainer')!.classList.contains('expanded');
}

/** Dispatch a document-level keydown (the shortcut handler listens on `document`). */
function key(k: string, opts: KeyboardEventInit = {}): void {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));
	flushSync();
}

// `copyOutput` awaits `clipboard.writeText` before firing `onCopy`/setting `copied`.
async function microtasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);

beforeEach(() => {
	freeze.mockClear();
	unfreeze.mockClear();
	writeText.mockClear();
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

describe('pause animations — freeze toggle', () => {
	it('pause button freezes the page via the util, second click unfreezes', () => {
		renderToolbar();
		activate();

		const pause = controlButton('Pause animations');
		expect(pause.getAttribute('data-active')).toBe('false');

		click(pause);
		expect(freeze).toHaveBeenCalledTimes(1);
		expect(unfreeze).not.toHaveBeenCalled();
		// The toggled icon state is reflected on the button.
		expect(controlButton('Resume animations').getAttribute('data-active')).toBe('true');

		click(controlButton('Resume animations'));
		expect(unfreeze).toHaveBeenCalledTimes(1);
		expect(controlButton('Pause animations').getAttribute('data-active')).toBe('false');
	});

	it('"P" toggles freeze (and is the same toggle as the button)', () => {
		renderToolbar();
		activate();

		key('P');
		expect(freeze).toHaveBeenCalledTimes(1);
		key('p'); // lowercase too
		expect(unfreeze).toHaveBeenCalledTimes(1);
	});

	it('unfreezes the page when feedback mode is exited while frozen', () => {
		renderToolbar();
		activate();
		click(controlButton('Pause animations'));
		expect(freeze).toHaveBeenCalledTimes(1);

		click(controlButton('Exit')); // deactivate
		expect(isActive()).toBe(false);
		expect(unfreeze).toHaveBeenCalledTimes(1);
	});

	it('unfreezes the page if the component unmounts while frozen (safety teardown)', () => {
		renderToolbar();
		activate();
		click(controlButton('Pause animations'));
		unfreeze.mockClear();

		const { instance, target } = mounted.pop()!;
		unmount(instance);
		target.remove();
		flushSync();

		expect(unfreeze).toHaveBeenCalled();
	});
});

describe('keyboard shortcuts', () => {
	it('Cmd/Ctrl+Shift+F toggles feedback mode', () => {
		renderToolbar();
		expect(isActive()).toBe(false);

		key('f', { metaKey: true, shiftKey: true });
		expect(isActive()).toBe(true);

		key('F', { ctrlKey: true, shiftKey: true });
		expect(isActive()).toBe(false);
	});

	it('Escape exits feedback mode', () => {
		renderToolbar();
		activate();
		expect(isActive()).toBe(true);

		key('Escape');
		expect(isActive()).toBe(false);
	});

	it('"H" toggles marker visibility — only when annotations exist', () => {
		renderToolbar();
		activate();
		// No annotations: the eye button is the "Hide markers" default and H is inert.
		key('h');
		expect(controlButton('Hide markers')).toBeTruthy();

		// With annotations, H flips the show/hide state (tooltip label tracks it).
		saveAnnotations(pathname, [ann()]);
		renderToolbar();
		activate();
		expect(controlButton('Hide markers')).toBeTruthy();
		key('h');
		expect(controlButton('Show markers')).toBeTruthy();
	});

	it('"C" copies output — only when annotations exist', async () => {
		const onCopy = vi.fn();
		renderToolbar({ onCopy });
		key('c');
		await microtasks();
		expect(onCopy).not.toHaveBeenCalled(); // no annotations → no-op

		saveAnnotations(pathname, [ann()]);
		const onCopy2 = vi.fn();
		renderToolbar({ onCopy: onCopy2 });
		key('c');
		await microtasks();
		expect(onCopy2).toHaveBeenCalledTimes(1);
		expect(onCopy2.mock.calls[0][0]).toContain('Make this bigger');
	});

	it('"X" clears all — only when annotations exist', () => {
		vi.useFakeTimers();
		saveAnnotations(pathname, [ann(), ann()]);
		const onAnnotationsClear = vi.fn();
		renderToolbar({ onAnnotationsClear });
		activate();
		expect(document.body.querySelector('.badge')?.textContent).toBe('2');

		key('x');
		vi.advanceTimersByTime(1000); // past the staggered-clear timing
		flushSync();
		expect(onAnnotationsClear).toHaveBeenCalledTimes(1);
		expect(onAnnotationsClear.mock.calls[0][0]).toHaveLength(2);
	});

	it('does not fire single-key shortcuts while typing in an input', async () => {
		vi.useFakeTimers();
		saveAnnotations(pathname, [ann()]);
		const onCopy = vi.fn();
		const onAnnotationsClear = vi.fn();
		renderToolbar({ onCopy, onAnnotationsClear });
		activate();

		const input = document.createElement('input');
		document.body.appendChild(input);
		try {
			// keydown whose target is the input → `isTyping` guard blocks P/H/C/X.
			for (const k of ['p', 'h', 'c', 'x']) {
				input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
				flushSync();
			}
			await microtasks();
			vi.advanceTimersByTime(1000);
			flushSync();

			expect(freeze).not.toHaveBeenCalled();
			expect(onCopy).not.toHaveBeenCalled();
			expect(onAnnotationsClear).not.toHaveBeenCalled();
			// Markers were never hidden — the badge still reflects the annotation.
			expect(document.body.querySelector('.badge')?.textContent).toBe('1');
		} finally {
			input.remove();
		}
	});
});

describe('copy-feedback UI', () => {
	it('flashes the `copied` status state for 2s after a copy', async () => {
		vi.useFakeTimers();
		saveAnnotations(pathname, [ann()]);
		renderToolbar();
		activate();

		click(controlButton('Copy feedback'));
		await microtasks();
		flushSync();
		const copy = controlButton('Copy feedback');
		expect(copy.getAttribute('data-active')).toBe('true');
		expect(copy.classList.contains('statusShowing')).toBe(true);

		vi.advanceTimersByTime(2000);
		flushSync();
		expect(controlButton('Copy feedback').getAttribute('data-active')).toBe('false');
	});

	it('clears all annotations ~500ms after copy when autoClearAfterCopy is on', async () => {
		vi.useFakeTimers();
		// Persist the setting so the controller hydrates it on mount.
		localStorage.setItem(
			'feedback-toolbar-settings',
			JSON.stringify({ ...DEFAULT_SETTINGS, autoClearAfterCopy: true })
		);
		saveAnnotations(pathname, [ann(), ann()]);
		const onAnnotationsClear = vi.fn();
		renderToolbar({ onAnnotationsClear });
		activate();

		click(controlButton('Copy feedback'));
		await microtasks();
		expect(onAnnotationsClear).not.toHaveBeenCalled(); // not yet — waits 500ms

		vi.advanceTimersByTime(500); // autoClear delay → kicks off the staggered clear
		flushSync();
		vi.advanceTimersByTime(1000); // past the stagger → list empties, callback fires
		flushSync();
		expect(onAnnotationsClear).toHaveBeenCalledTimes(1);
	});

	it('does not auto-clear when autoClearAfterCopy is off (default)', async () => {
		vi.useFakeTimers();
		saveAnnotations(pathname, [ann()]);
		const onAnnotationsClear = vi.fn();
		renderToolbar({ onAnnotationsClear });
		activate();

		click(controlButton('Copy feedback'));
		await microtasks();
		vi.advanceTimersByTime(2000);
		flushSync();
		expect(onAnnotationsClear).not.toHaveBeenCalled();
	});
});
