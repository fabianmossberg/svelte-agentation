// Component test for the page toolbar (issue #24).
//
// The toolbar's defining behaviour is that it mounts its UI into `document.body`
// (Svelte `mount()` standing in for React's portal), so — unlike the sibling
// component tests that use the shared `render()` helper — this file mounts the
// public `index.svelte` directly and asserts against `document.body`, not the
// mount target. Seeding goes through `utils/storage` so the annotations
// controller hydrates exactly as it would in the browser.
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '../../types';
import { clearAnnotations, saveAnnotations } from '../../utils/storage';
import PageToolbar from './index.svelte';

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

function renderToolbar(props: Record<string, unknown> = {}): void {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(PageToolbar, { target, props });
	flushSync(); // run onMount so the UI lands in document.body
	mounted.push({ instance, target });
}

afterEach(() => {
	for (const { instance, target } of mounted.splice(0)) {
		unmount(instance);
		target.remove();
	}
	clearAnnotations(pathname);
	localStorage.clear();
	sessionStorage.clear();
});

describe('PageToolbar — body mount', () => {
	it('mounts the toolbar UI into document.body, not the host target', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const instance = mount(PageToolbar, { target: host, props: {} });
		flushSync();
		mounted.push({ instance, target: host });

		const toolbar = document.body.querySelector('.toolbar');
		expect(toolbar).not.toBeNull();
		// It is a body child, not nested under the host target div.
		expect(host.querySelector('.toolbar')).toBeNull();
		expect(toolbar?.hasAttribute('data-feedback-toolbar')).toBe(true);
	});

	it('keeps the upstream theme/accent/root attributes on the portal wrapper', () => {
		renderToolbar();
		const wrapper = document.body.querySelector('[data-agentation-root]')!;
		expect(wrapper.getAttribute('data-agentation-theme')).toBe('dark');
		expect(wrapper.getAttribute('data-agentation-accent')).toBe('blue');
	});

	it('unmounts cleanly — no toolbar nodes left in the body', () => {
		renderToolbar();
		expect(document.body.querySelector('.toolbar')).not.toBeNull();

		const { instance, target } = mounted.pop()!;
		unmount(instance);
		target.remove();
		flushSync();

		expect(document.body.querySelector('.toolbar')).toBeNull();
		expect(document.body.querySelector('[data-agentation-root]')).toBeNull();
	});
});

describe('PageToolbar — collapse/expand morph', () => {
	it('starts collapsed and expands to the controls row on click', () => {
		renderToolbar();
		const container = document.body.querySelector('.toolbarContainer')!;
		expect(container.classList.contains('collapsed')).toBe(true);
		expect(container.classList.contains('expanded')).toBe(false);

		container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();

		expect(container.classList.contains('expanded')).toBe(true);
		expect(container.classList.contains('collapsed')).toBe(false);
		// Controls become visible; exit button tooltip carries the shortcut hint.
		const controls = document.body.querySelector('.controlsContent')!;
		expect(controls.classList.contains('visible')).toBe(true);
		expect(controls.querySelector('.shortcut')?.textContent).toBe('P');
	});
});

describe('PageToolbar — annotation count badge', () => {
	it('shows the badge with the visible-annotation count from storage', () => {
		saveAnnotations(pathname, [ann(), ann(), ann()]);
		renderToolbar();
		const badge = document.body.querySelector('.badge');
		expect(badge?.textContent).toBe('3');
	});

	it('excludes resolved/dismissed annotations from the badge count', () => {
		saveAnnotations(pathname, [ann(), ann({ status: 'resolved' }), ann({ status: 'dismissed' })]);
		renderToolbar();
		expect(document.body.querySelector('.badge')?.textContent).toBe('1');
	});

	it('renders no badge when there are no annotations', () => {
		renderToolbar();
		expect(document.body.querySelector('.badge')).toBeNull();
	});
});

describe('PageToolbar — freeze-animations exclusion contract', () => {
	it('keeps data-feedback-toolbar on every toolbar-owned layer (shell + marker layers + overlay)', () => {
		renderToolbar();

		// The always-present layers: the shell and both marker layers. The
		// freeze-animations util (utils/freeze-animations.ts) excludes anything under
		// `[data-feedback-toolbar]` from being paused, so a styling refactor must keep
		// the attribute on each toolbar-owned container (upstream contract, see #25).
		for (const selector of ['.toolbar', '.markersLayer', '.fixedMarkersLayer']) {
			const el = document.body.querySelector(selector);
			expect(el, selector).not.toBeNull();
			expect(el!.hasAttribute('data-feedback-toolbar'), selector).toBe(true);
		}

		// The overlay only mounts while feedback mode is active.
		document.body
			.querySelector('.toolbarContainer')!
			.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		const overlay = document.body.querySelector('.overlay');
		expect(overlay).not.toBeNull();
		expect(overlay!.hasAttribute('data-feedback-toolbar')).toBe(true);
	});
});

describe('PageToolbar — event-propagation blocker', () => {
	it('stops events inside the toolbar from reaching document-level listeners', () => {
		renderToolbar();
		const docListener = vi.fn();
		document.addEventListener('click', docListener);

		try {
			// A click inside the toolbar must not bubble past body to the document
			// (upstream L348–369: protects host "click outside" handlers). Target the
			// outer `.toolbar` wrapper (still inside the portal wrapper, so the blocker
			// applies) rather than `.toolbarContainer` — the container carries the
			// expand handler and clicking it would activate feedback mode.
			const toolbar = document.body.querySelector('.toolbar')!;
			toolbar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			expect(docListener).not.toHaveBeenCalled();

			// A click elsewhere still reaches the document — the blocker is scoped.
			const outside = document.createElement('div');
			document.body.appendChild(outside);
			outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			expect(docListener).toHaveBeenCalledTimes(1);
			outside.remove();
		} finally {
			document.removeEventListener('click', docListener);
		}
	});
});
