import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The component captures `originalSetTimeout` at module load from
// `utils/freeze-animations` (the *unpatched* native timer), which `vi.useFakeTimers()`
// cannot intercept. Mock the module so the enter (0/50/200ms), cancel (150ms) and
// shake (250ms) timers route through the global `setTimeout`/`clearTimeout` that fake
// timers replace — letting us drive the animation/focus timing deterministically.
vi.mock('../../utils/freeze-animations', () => ({
	originalSetTimeout: (handler: TimerHandler, timeout?: number) => setTimeout(handler, timeout)
}));

import { flushSync, mount, unmount } from 'svelte';
import { render } from '../../../test/svelte-render';
import Popup from './index.svelte';
import type { AnnotationPopupCSSProps } from './index.svelte';

function popupEl(target: HTMLElement): HTMLElement | null {
	return target.querySelector('[data-annotation-popup]');
}

function baseProps(overrides: Partial<AnnotationPopupCSSProps> = {}): AnnotationPopupCSSProps {
	return {
		element: 'button.cta',
		onSubmit: vi.fn(),
		onCancel: vi.fn(),
		...overrides
	};
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('AnnotationPopupCSS', () => {
	it('renders the element name, placeholder, and submit label', () => {
		const target = render(Popup, {
			...baseProps({ submitLabel: 'Save', placeholder: 'Describe it' })
		});
		const popup = popupEl(target);
		expect(popup).not.toBeNull();
		expect(popup?.querySelector('.element')?.textContent).toBe('button.cta');
		expect(target.querySelector('textarea')?.placeholder).toBe('Describe it');
		expect(target.querySelector('.submit')?.textContent?.trim()).toBe('Save');
	});

	it('defaults the placeholder and submit label to upstream values', () => {
		const target = render(Popup, { ...baseProps() });
		expect(target.querySelector('textarea')?.placeholder).toBe('What should change?');
		expect(target.querySelector('.submit')?.textContent?.trim()).toBe('Add');
	});

	it('seeds the textarea from initialValue (edit mode)', () => {
		const target = render(Popup, { ...baseProps({ initialValue: 'existing note' }) });
		expect((target.querySelector('textarea') as HTMLTextAreaElement).value).toBe('existing note');
	});

	it('submits trimmed text on Enter (no shift)', () => {
		const onSubmit = vi.fn();
		const target = render(Popup, { ...baseProps({ onSubmit }) });
		const ta = target.querySelector('textarea') as HTMLTextAreaElement;

		ta.value = '  needs spacing  ';
		ta.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith('needs spacing');
	});

	it('inserts a newline (does NOT submit) on Shift+Enter', () => {
		const onSubmit = vi.fn();
		const target = render(Popup, { ...baseProps({ onSubmit }) });
		const ta = target.querySelector('textarea') as HTMLTextAreaElement;

		ta.value = 'line one';
		ta.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
		flushSync();

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does not submit an empty/whitespace-only comment (upstream: silent no-op)', () => {
		const onSubmit = vi.fn();
		const target = render(Popup, { ...baseProps({ onSubmit }) });
		const ta = target.querySelector('textarea') as HTMLTextAreaElement;

		// Enter with empty text
		ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		// Whitespace only
		ta.value = '   ';
		ta.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();

		expect(onSubmit).not.toHaveBeenCalled();
		// The submit button is disabled while the comment is empty.
		expect((target.querySelector('.submit') as HTMLButtonElement).disabled).toBe(true);
	});

	it('submits via the submit button once text is present', () => {
		const onSubmit = vi.fn();
		const target = render(Popup, { ...baseProps({ onSubmit }) });
		const ta = target.querySelector('textarea') as HTMLTextAreaElement;
		ta.value = 'ship it';
		ta.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		const submit = target.querySelector('.submit') as HTMLButtonElement;
		expect(submit.disabled).toBe(false);
		submit.click();
		flushSync();

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith('ship it');
	});

	it('runs the exit animation then calls onCancel 150ms after Cancel is clicked', () => {
		const onCancel = vi.fn();
		const target = render(Popup, { ...baseProps({ onCancel }) });

		(target.querySelector('.cancel') as HTMLButtonElement).click();
		flushSync();
		expect(popupEl(target)?.classList.contains('exit')).toBe(true);
		expect(onCancel).not.toHaveBeenCalled();

		vi.advanceTimersByTime(150);
		flushSync();
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('cancels on Escape', () => {
		const onCancel = vi.fn();
		const target = render(Popup, { ...baseProps({ onCancel }) });
		const ta = target.querySelector('textarea') as HTMLTextAreaElement;

		ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();
		vi.advanceTimersByTime(150);
		flushSync();

		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('shows the delete button (wired to onDelete) only when onDelete is provided', () => {
		const withoutDelete = render(Popup, { ...baseProps() });
		expect(withoutDelete.querySelector('.deleteButton')).toBeNull();

		const onDelete = vi.fn();
		const withDelete = render(Popup, { ...baseProps({ onDelete }) });
		const btn = withDelete.querySelector('.deleteButton') as HTMLButtonElement;
		expect(btn).not.toBeNull();
		btn.click();
		expect(onDelete).toHaveBeenCalledOnce();
	});

	it('renders the computed-styles accordion (kebab-cased keys) when computedStyles is given', () => {
		const target = render(Popup, {
			...baseProps({ computedStyles: { fontSize: '16px', backgroundColor: 'red' } })
		});
		expect(target.querySelector('.headerToggle')).not.toBeNull();
		const props = [...target.querySelectorAll('.styleProperty')].map((n) => n.textContent);
		expect(props).toEqual(['font-size', 'background-color']);
	});

	it('truncates the quote to 80 chars with an ellipsis', () => {
		const long = 'x'.repeat(100);
		const target = render(Popup, { ...baseProps({ selectedText: long }) });
		const quote = target.querySelector('.quote')?.textContent ?? '';
		expect(quote).toContain('x'.repeat(80) + '...');
		expect(quote).not.toContain('x'.repeat(81));
	});

	it('focuses the textarea ~50ms after open, bypassing focus traps', () => {
		const target = render(Popup, { ...baseProps({ initialValue: 'abc' }) });
		flushSync(); // run the mount $effect so its 50ms focus timer is scheduled
		const ta = target.querySelector('textarea') as HTMLTextAreaElement;
		expect(document.activeElement).not.toBe(ta);

		vi.advanceTimersByTime(50);
		flushSync();
		expect(document.activeElement).toBe(ta);
		// Caret moved to end of the seeded value.
		expect(ta.selectionStart).toBe('abc'.length);
	});

	// shake() needs the instance handle, so this test mounts directly.
	it('shake(): exported handle toggles the shake class and clears it after 250ms; repeated calls restart the timer', () => {
		const target = document.createElement('div');
		document.body.appendChild(target);
		const instance = mount(Popup, { target, props: baseProps() }) as { shake: () => void };
		flushSync(); // run the mount $effect so its enter/entered timers are scheduled

		// Settle into the stable "entered" state (.entered.shake is the live keyframe).
		vi.advanceTimersByTime(200);
		flushSync();
		const popup = popupEl(target) as HTMLElement;
		expect(popup.classList.contains('entered')).toBe(true);

		instance.shake();
		flushSync();
		expect(popup.classList.contains('shake')).toBe(true);

		// A second shake before the first settles restarts the 250ms timer.
		vi.advanceTimersByTime(150);
		instance.shake();
		flushSync();
		vi.advanceTimersByTime(150); // 300ms since first shake, 150ms since second
		flushSync();
		expect(popup.classList.contains('shake')).toBe(true); // still shaking (restarted)

		vi.advanceTimersByTime(100); // 250ms since the second shake
		flushSync();
		expect(popup.classList.contains('shake')).toBe(false);

		unmount(instance);
		target.remove();
	});
});
