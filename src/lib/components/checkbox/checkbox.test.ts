import { describe, expect, it } from 'vitest';
import { render } from '../../../test/svelte-render';
import Checkbox from './index.svelte';

describe('Checkbox', () => {
	it('renders the container, a native type=checkbox input, and the check svg', () => {
		const target = render(Checkbox);
		const container = target.querySelector('div');
		const input = target.querySelector('input');
		const svg = target.querySelector('svg path');
		expect(container).not.toBeNull();
		expect(input?.getAttribute('type')).toBe('checkbox');
		expect(svg?.getAttribute('d')).toBe('M3.94 7L6.13 9.19L10.5 4.81');
	});

	it('reflects the checked prop (unchecked)', () => {
		const target = render(Checkbox, { checked: false });
		expect(target.querySelector('input')?.checked).toBe(false);
	});

	it('reflects the checked prop (checked)', () => {
		const target = render(Checkbox, { checked: true });
		expect(target.querySelector('input')?.checked).toBe(true);
	});

	it('applies the class prop to the container, not the input', () => {
		const target = render(Checkbox, { class: 'my-class' });
		const container = target.querySelector('div');
		expect(container?.classList.contains('my-class')).toBe(true);
		expect(target.querySelector('input')?.classList.contains('my-class')).toBe(false);
	});

	it('spreads rest props onto the native input', () => {
		const target = render(Checkbox, { disabled: true, name: 'agree' });
		const input = target.querySelector('input');
		expect(input?.disabled).toBe(true);
		expect(input?.getAttribute('name')).toBe('agree');
	});
});
