import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// HelpTooltip composes Tooltip, which captures the unpatched native timer at module
// load — mock it through the global setTimeout so fake timers can drive the show delay.
vi.mock('../../utils/freeze-animations', () => ({
	originalSetTimeout: (handler: TimerHandler, timeout?: number) => setTimeout(handler, timeout)
}));

import { flushSync } from 'svelte';
import { render } from '../../../test/svelte-render';
import HelpTooltip from './index.svelte';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('HelpTooltip', () => {
	it('renders the help icon inside the tooltip trigger', () => {
		const target = render(HelpTooltip, { content: 'What is this?' });
		const trigger = target.querySelector('span.agentation-help-tooltip');
		const icon = target.querySelector('svg.agentation-help-tooltip-icon');
		expect(trigger).not.toBeNull();
		expect(icon).not.toBeNull();
		// IconHelp's viewBox confirms it's the help glyph, not some other icon.
		expect(icon?.getAttribute('viewBox')).toBe('0 0 20 20');
	});

	it('forwards content to the tooltip shown on hover', () => {
		const target = render(HelpTooltip, { content: 'What is this?' });
		const span = target.querySelector('span') as HTMLSpanElement;
		span.dispatchEvent(new MouseEvent('mouseenter'));
		flushSync();
		vi.advanceTimersByTime(500);
		flushSync();
		const tip = document.body.querySelector('[data-feedback-toolbar]');
		expect(tip?.textContent).toBe('What is this?');
	});
});
