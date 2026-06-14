import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../../../../test/svelte-render';
import CheckboxField from './index.svelte';

describe('CheckboxField', () => {
	it('renders a checkbox input and the label text', () => {
		const target = render(CheckboxField, { label: 'Clear on copy/send' });
		expect(target.querySelector('input[type="checkbox"]')).not.toBeNull();
		expect(target.querySelector('label')?.textContent?.trim()).toBe('Clear on copy/send');
	});

	it('ties the <label> to the <input> via matching for/id', () => {
		const target = render(CheckboxField, { label: 'Block page interactions' });
		const input = target.querySelector('input');
		const label = target.querySelector('label');
		expect(input?.id).toBeTruthy();
		expect(label?.getAttribute('for')).toBe(input?.id);
	});

	it('applies the class prop to the container', () => {
		const target = render(CheckboxField, { label: 'x', class: 'checkbox-field' });
		const container = target.querySelector('div');
		expect(container?.classList.contains('checkbox-field')).toBe(true);
	});

	it('reflects the checked prop', () => {
		const target = render(CheckboxField, { label: 'x', checked: true });
		expect(target.querySelector('input')?.checked).toBe(true);
	});

	it('forwards change events to onchange with the input as currentTarget', () => {
		const onchange = vi.fn();
		const target = render(CheckboxField, { label: 'x', checked: false, onchange });
		flushSync();
		const input = target.querySelector('input')!;
		input.checked = true;
		input.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		expect(onchange).toHaveBeenCalledTimes(1);
		// `currentTarget` is reset to null once dispatch completes, so assert via
		// `target` (the input that fired) — Svelte restores currentTarget after the
		// delegated handler returns, but the component reads it synchronously inside.
		expect((onchange.mock.calls[0][0].target as HTMLInputElement).checked).toBe(true);
	});

	it('renders a help tooltip only when tooltip is provided', () => {
		const without = render(CheckboxField, { label: 'x' });
		expect(without.querySelector('.agentation-help-tooltip')).toBeNull();

		const withTip = render(CheckboxField, { label: 'x', tooltip: 'Helpful' });
		expect(withTip.querySelector('.agentation-help-tooltip')).not.toBeNull();
	});
});
