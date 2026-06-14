import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The component captures `originalSetTimeout` at module load from
// `utils/freeze-animations` (the *unpatched* native timer), which `vi.useFakeTimers()`
// cannot intercept. Mock the module so the timers route through the global
// `setTimeout`/`clearTimeout` that fake timers replace — letting us drive the
// 500ms show / 150ms exit delays deterministically.
vi.mock('../../utils/freeze-animations', () => ({
	originalSetTimeout: (handler: TimerHandler, timeout?: number) => setTimeout(handler, timeout)
}));

import { createRawSnippet, flushSync } from 'svelte';
import { render } from '../../../test/svelte-render';
import Tooltip from './index.svelte';

const children = createRawSnippet(() => ({
	render: () => `<span data-testid="trigger">trigger</span>`
}));

function tooltipEl(): HTMLElement | null {
	return document.body.querySelector('[data-feedback-toolbar]');
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('Tooltip', () => {
	it('renders the trigger and no tooltip until hovered', () => {
		const target = render(Tooltip, { content: 'Helpful text', children });
		expect(target.querySelector('[data-testid="trigger"]')).not.toBeNull();
		expect(tooltipEl()).toBeNull();
	});

	it('spreads rest props onto the trigger span', () => {
		const target = render(Tooltip, { content: 'x', children, id: 'trig', class: 'wrap' });
		const span = target.querySelector('span');
		expect(span?.id).toBe('trig');
		expect(span?.classList.contains('wrap')).toBe(true);
	});

	it('shows the tooltip on hover after the 500ms delay, then hides it after the 150ms exit', () => {
		const target = render(Tooltip, { content: 'Helpful text', children });
		const span = target.querySelector('span') as HTMLSpanElement;

		span.dispatchEvent(new MouseEvent('mouseenter'));
		flushSync();
		// Portaled to <body> immediately, but transparent until the delay elapses.
		const el = tooltipEl();
		expect(el).not.toBeNull();
		expect(el?.textContent).toBe('Helpful text');
		expect(el?.getAttribute('data-feedback-toolbar')).toBe('');
		expect(el?.style.opacity).toBe('0');

		vi.advanceTimersByTime(500);
		flushSync();
		expect(tooltipEl()?.style.opacity).toBe('1');

		span.dispatchEvent(new MouseEvent('mouseleave'));
		flushSync();
		// Stays rendered (now fading) for the 150ms exit animation.
		expect(tooltipEl()?.style.opacity).toBe('0');
		expect(tooltipEl()).not.toBeNull();

		vi.advanceTimersByTime(150);
		flushSync();
		expect(tooltipEl()).toBeNull();
	});

	it('cancels the pending show when the pointer leaves before the delay', () => {
		const target = render(Tooltip, { content: 'x', children });
		const span = target.querySelector('span') as HTMLSpanElement;

		span.dispatchEvent(new MouseEvent('mouseenter'));
		flushSync();
		vi.advanceTimersByTime(200);
		span.dispatchEvent(new MouseEvent('mouseleave'));
		flushSync();
		// The 500ms show timer was cleared, so even past 500ms it never becomes visible.
		vi.advanceTimersByTime(500);
		flushSync();
		expect(tooltipEl()?.style.opacity ?? null).not.toBe('1');
	});
});
