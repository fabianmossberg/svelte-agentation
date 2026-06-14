import { describe, expect, it } from 'vitest';
import { render } from '../../../test/svelte-render';
import Switch from './index.svelte';

describe('Switch', () => {
	it('renders the container, a native type=checkbox input, and the thumb', () => {
		const target = render(Switch);
		const divs = target.querySelectorAll('div');
		const input = target.querySelector('input');
		// container <div> + thumb <div>
		expect(divs.length).toBe(2);
		expect(input?.getAttribute('type')).toBe('checkbox');
	});

	it('reflects the checked prop (unchecked)', () => {
		const target = render(Switch, { checked: false });
		expect(target.querySelector('input')?.checked).toBe(false);
	});

	it('reflects the checked prop (checked)', () => {
		const target = render(Switch, { checked: true });
		expect(target.querySelector('input')?.checked).toBe(true);
	});

	it('applies the class prop to the container, not the input', () => {
		const target = render(Switch, { class: 'my-class' });
		const container = target.querySelector('div');
		expect(container?.classList.contains('my-class')).toBe(true);
		expect(target.querySelector('input')?.classList.contains('my-class')).toBe(false);
	});

	it('spreads rest props onto the native input', () => {
		const target = render(Switch, { disabled: true, name: 'toggle' });
		const input = target.querySelector('input');
		expect(input?.disabled).toBe(true);
		expect(input?.getAttribute('name')).toBe('toggle');
	});
});
