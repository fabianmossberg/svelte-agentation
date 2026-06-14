import { afterEach, describe, expect, it } from 'vitest';
import { mount, unmount, type Component } from 'svelte';
import * as icons from './index';

// Expected per-icon SVG contract, taken from upstream
// `package/src/components/icons.tsx`: the viewBox is verbatim, and `size` is the
// upstream default that becomes the rendered width/height when no prop is passed.
const MANIFEST: Record<string, { viewBox: string; size: number }> = {
	IconClose: { viewBox: '0 0 16 16', size: 16 },
	IconPlus: { viewBox: '0 0 16 16', size: 16 },
	IconCheck: { viewBox: '0 0 16 16', size: 16 },
	IconCheckSmall: { viewBox: '0 0 14 14', size: 14 },
	IconListSparkle: { viewBox: '0 0 24 24', size: 24 },
	IconHelp: { viewBox: '0 0 20 20', size: 20 },
	IconCheckSmallAnimated: { viewBox: '0 0 14 14', size: 14 },
	IconCopyAlt: { viewBox: '0 0 24 24', size: 16 },
	IconCopyAnimated: { viewBox: '0 0 24 24', size: 24 },
	IconSendArrow: { viewBox: '0 0 24 24', size: 24 },
	IconSendAnimated: { viewBox: '0 0 22 21', size: 24 },
	IconEye: { viewBox: '0 0 24 24', size: 16 },
	IconEyeAlt: { viewBox: '0 0 24 24', size: 24 },
	IconEyeClosed: { viewBox: '0 0 24 24', size: 24 },
	IconEyeAnimated: { viewBox: '0 0 24 24', size: 24 },
	IconPausePlayAnimated: { viewBox: '0 0 24 24', size: 24 },
	IconEyeMinus: { viewBox: '0 0 24 24', size: 16 },
	IconGear: { viewBox: '0 0 24 24', size: 16 },
	IconPauseAlt: { viewBox: '0 0 24 24', size: 16 },
	IconPause: { viewBox: '0 0 24 24', size: 24 },
	IconPlayAlt: { viewBox: '0 0 24 24', size: 16 },
	IconTrashAlt: { viewBox: '0 0 24 24', size: 16 },
	IconChatEllipsis: { viewBox: '0 0 24 24', size: 16 },
	IconCheckmark: { viewBox: '0 0 24 24', size: 16 },
	IconCheckmarkLarge: { viewBox: '0 0 24 24', size: 16 },
	IconCheckmarkCircle: { viewBox: '0 0 24 24', size: 24 },
	IconXmark: { viewBox: '0 0 24 24', size: 16 },
	IconXmarkLarge: { viewBox: '0 0 24 24', size: 24 },
	IconSun: { viewBox: '0 0 20 20', size: 16 },
	IconMoon: { viewBox: '0 0 20 20', size: 16 },
	IconEdit: { viewBox: '0 0 16 16', size: 16 },
	IconTrash: { viewBox: '0 0 24 24', size: 24 },
	IconChevronLeft: { viewBox: '0 0 16 16', size: 16 },
	IconChevronRight: { viewBox: '0 0 16 16', size: 16 },
	AnimatedBunny: { viewBox: '0 0 28 28', size: 20 },
	IconLayout: { viewBox: '0 0 24 24', size: 24 }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mounted: any[] = [];

function render(Component: Component, props: Record<string, unknown> = {}): SVGSVGElement {
	const target = document.createElement('div');
	document.body.appendChild(target);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const instance = mount(Component as any, { target, props });
	mounted.push({ instance, target });
	const svg = target.querySelector('svg');
	if (!svg) throw new Error('component rendered no <svg>');
	return svg as SVGSVGElement;
}

afterEach(() => {
	for (const { instance, target } of mounted.splice(0)) {
		unmount(instance);
		target.remove();
	}
});

describe('icons barrel', () => {
	it('exports exactly the upstream icon set, no more, no less', () => {
		const exported = Object.keys(icons).sort();
		const expected = Object.keys(MANIFEST).sort();
		expect(exported).toEqual(expected);
	});
});

describe('icon smoke render', () => {
	for (const [name, { viewBox, size }] of Object.entries(MANIFEST)) {
		it(`${name} renders an <svg> with the upstream viewBox and default size`, () => {
			const Component = (icons as Record<string, Component>)[name];
			expect(Component, `${name} missing from barrel`).toBeDefined();
			const svg = render(Component);
			expect(svg.tagName.toLowerCase()).toBe('svg');
			expect(svg.getAttribute('viewBox')).toBe(viewBox);
			expect(svg.getAttribute('width')).toBe(String(size));
			expect(svg.getAttribute('height')).toBe(String(size));
		});
	}

	it('forwards a custom size prop to width/height (viewBox unchanged)', () => {
		const svg = render(icons.IconClose, { size: 32 });
		expect(svg.getAttribute('width')).toBe('32');
		expect(svg.getAttribute('height')).toBe('32');
		expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
	});

	it('passes rest props (e.g. aria-label) through to the <svg> (IconHelp)', () => {
		const svg = render(icons.IconHelp, { 'aria-label': 'help' });
		expect(svg.getAttribute('aria-label')).toBe('help');
	});
});

describe('animated icons reproduce the upstream two-state transitions', () => {
	it('IconPausePlayAnimated toggles pause bars vs play triangle on isPaused', () => {
		// The play triangle is a direct-child <path> of the <svg>; the pause bars
		// are <path>s nested in the <g>, so scope the triangle query to direct children.
		// isPaused=false → pause bars visible, play triangle hidden
		let svg = render(icons.IconPausePlayAnimated, { isPaused: false });
		let bars = svg.querySelector('g')!;
		let triangle = svg.querySelector(':scope > path')!;
		expect(bars.classList.contains('visible')).toBe(true);
		expect(bars.classList.contains('hidden')).toBe(false);
		expect(triangle.classList.contains('hidden')).toBe(true);

		// isPaused=true → reversed
		svg = render(icons.IconPausePlayAnimated, { isPaused: true });
		bars = svg.querySelector('g')!;
		triangle = svg.querySelector(':scope > path')!;
		expect(bars.classList.contains('hidden')).toBe(true);
		expect(triangle.classList.contains('visible')).toBe(true);
	});

	it('IconEyeAnimated toggles open vs closed group on isOpen', () => {
		// isOpen=true → first (open) group visible, second (closed) hidden
		let svg = render(icons.IconEyeAnimated, { isOpen: true });
		let groups = svg.querySelectorAll('g');
		expect(groups[0].classList.contains('visible')).toBe(true);
		expect(groups[1].classList.contains('hidden')).toBe(true);

		// isOpen=false → reversed
		svg = render(icons.IconEyeAnimated, { isOpen: false });
		groups = svg.querySelectorAll('g');
		expect(groups[0].classList.contains('hidden')).toBe(true);
		expect(groups[1].classList.contains('visible')).toBe(true);
	});

	it('IconCopyAnimated swaps copy vs check group on copied', () => {
		const svg = render(icons.IconCopyAnimated, { copied: true });
		const groups = svg.querySelectorAll('g');
		expect(groups[0].classList.contains('hiddenScaled')).toBe(true);
		expect(groups[1].classList.contains('visibleScaled')).toBe(true);
	});

	it('IconSendAnimated swaps send vs check group on sent', () => {
		const svg = render(icons.IconSendAnimated, { sent: true });
		const groups = svg.querySelectorAll('g');
		expect(groups[0].classList.contains('hiddenScaled')).toBe(true);
		expect(groups[1].classList.contains('visibleScaled')).toBe(true);
	});

	it('IconSendArrow maps state→class (idle/sending/sent/failed)', () => {
		const groupsFor = (state: string) =>
			render(icons.IconSendArrow, { state }).querySelectorAll('g');

		let g = groupsFor('idle');
		expect(g[0].classList.contains('visibleScaled')).toBe(true); // arrow

		g = groupsFor('sending');
		expect(g[0].classList.contains('sending')).toBe(true); // arrow dimmed

		g = groupsFor('sent');
		expect(g[1].classList.contains('visibleScaled')).toBe(true); // green check

		g = groupsFor('failed');
		expect(g[2].classList.contains('visibleScaled')).toBe(true); // red error
	});

	it('AnimatedBunny applies the color prop as fill', () => {
		const svg = render(icons.AnimatedBunny, { color: '#ff0000' });
		const ear = svg.querySelector('.bunny-ear-left')!;
		expect(ear.getAttribute('fill')).toBe('#ff0000');
	});
});
