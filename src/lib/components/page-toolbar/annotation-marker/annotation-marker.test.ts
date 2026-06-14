import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render } from '../../../../test/svelte-render';
import type { Annotation } from '../../../types';
import { AnnotationMarker, PendingMarker, ExitingMarker } from './index';
import type { AnnotationMarkerProps } from './AnnotationMarker.svelte';

afterEach(() => vi.restoreAllMocks());

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
	return {
		id: 'a1',
		x: 40,
		y: 120,
		comment: 'Fix this button',
		element: 'button',
		timestamp: 0,
		...overrides
	} as Annotation;
}

function markerProps(overrides: Partial<AnnotationMarkerProps> = {}): AnnotationMarkerProps {
	return {
		annotation: makeAnnotation(),
		globalIndex: 0,
		layerIndex: 0,
		layerSize: 1,
		isExiting: false,
		isClearing: false,
		isAnimated: true,
		isHovered: false,
		isDeleting: false,
		isEditingAny: false,
		renumberFrom: null,
		markerClickBehavior: 'edit',
		onHoverEnter: vi.fn(),
		onHoverLeave: vi.fn(),
		onClick: vi.fn(),
		...overrides
	};
}

// Spread into a fresh object literal so the typed `AnnotationMarkerProps` satisfies
// `render`'s `Record<string, unknown>` parameter (same idiom as the popup test).
function renderMarker(overrides: Partial<AnnotationMarkerProps> = {}): HTMLElement {
	return render(AnnotationMarker, { ...markerProps(overrides) });
}

function markerEl(target: HTMLElement): HTMLElement {
	const el = target.querySelector<HTMLElement>('[data-annotation-marker]');
	if (!el) throw new Error('marker not rendered');
	return el;
}

// Number span is a direct child of the marker (tooltip spans are nested deeper).
function numberSpan(marker: HTMLElement): HTMLElement | null {
	return marker.querySelector<HTMLElement>(':scope > span');
}

describe('AnnotationMarker', () => {
	it('renders globalIndex + 1 as the badge number', () => {
		const target = renderMarker({ globalIndex: 4 });
		expect(numberSpan(markerEl(target))?.textContent).toBe('5');
	});

	it('positions via x% / ypx and applies the accent color by default', () => {
		const target = renderMarker({ annotation: makeAnnotation({ x: 33, y: 200 }) });
		const el = markerEl(target);
		expect(el.style.left).toBe('33%');
		expect(el.style.top).toBe('200px');
		expect(el.getAttribute('style')).toContain('var(--agentation-color-accent)');
	});

	it('uses the green multi-select color + class when isMultiSelect', () => {
		const target = renderMarker({ annotation: makeAnnotation({ isMultiSelect: true }) });
		const el = markerEl(target);
		expect(el.classList.contains('multiSelect')).toBe(true);
		expect(el.getAttribute('style')).toContain('var(--agentation-color-green)');
	});

	it('swaps the number for the edit icon on hover when behavior is "edit"', () => {
		const target = renderMarker({ isHovered: true, markerClickBehavior: 'edit' });
		const el = markerEl(target);
		expect(numberSpan(el)).toBeNull();
		const svg = el.querySelector('svg');
		// IconEdit uses a 16×16 viewBox; IconXmark uses 24×24.
		expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
		expect(el.classList.contains('hovered')).toBe(false);
	});

	it('swaps the number for the delete (xmark) icon + .hovered when behavior is "delete"', () => {
		const target = renderMarker({ isHovered: true, markerClickBehavior: 'delete' });
		const el = markerEl(target);
		expect(numberSpan(el)).toBeNull();
		expect(el.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
		expect(el.classList.contains('hovered')).toBe(true);
	});

	it('keeps the number while editing any annotation, even when hovered', () => {
		const target = renderMarker({
			isHovered: true,
			markerClickBehavior: 'delete',
			isEditingAny: true
		});
		const el = markerEl(target);
		expect(numberSpan(el)?.textContent).toBe('1');
		expect(el.querySelector('svg')).toBeNull();
	});

	it('shows the delete icon while isDeleting (no hover needed)', () => {
		const target = renderMarker({ isDeleting: true, markerClickBehavior: 'delete' });
		expect(markerEl(target).querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
	});

	it('applies the renumber class only at/after renumberFrom', () => {
		const below = renderMarker({ globalIndex: 1, renumberFrom: 2 });
		expect(numberSpan(markerEl(below))?.classList.contains('renumber')).toBe(false);

		const atOrAfter = renderMarker({ globalIndex: 3, renumberFrom: 2 });
		expect(numberSpan(markerEl(atOrAfter))?.classList.contains('renumber')).toBe(true);
	});

	it('staggers animationDelay by layerIndex on enter and reverses it on exit', () => {
		const enter = renderMarker({ isAnimated: false, layerIndex: 2, layerSize: 5 });
		const enterEl = markerEl(enter);
		expect(enterEl.classList.contains('enter')).toBe(true);
		expect(enterEl.style.animationDelay).toBe('40ms');

		const exit = renderMarker({ isExiting: true, layerIndex: 2, layerSize: 5 });
		const exitEl = markerEl(exit);
		expect(exitEl.classList.contains('exit')).toBe(true);
		// (layerSize - 1 - layerIndex) * 20 = (5 - 1 - 2) * 20 = 40ms
		expect(exitEl.style.animationDelay).toBe('40ms');
	});

	it('fires onHoverEnter/onHoverLeave on mouse enter/leave', () => {
		const onHoverEnter = vi.fn();
		const onHoverLeave = vi.fn();
		const annotation = makeAnnotation();
		const target = renderMarker({ annotation, onHoverEnter, onHoverLeave });
		const el = markerEl(target);

		el.dispatchEvent(new MouseEvent('mouseenter'));
		flushSync();
		expect(onHoverEnter).toHaveBeenCalledWith(annotation);

		el.dispatchEvent(new MouseEvent('mouseleave'));
		flushSync();
		expect(onHoverLeave).toHaveBeenCalledTimes(1);
	});

	it('fires onClick with the annotation and stops propagation', () => {
		const onClick = vi.fn();
		const annotation = makeAnnotation();
		const target = renderMarker({ annotation, onClick });
		// Svelte delegates click to the mount root, so listen on an ancestor of it to
		// confirm the handler's `stopPropagation()` halts native bubbling (upstream stops
		// the document-level create-on-click from firing).
		const ancestorClick = vi.fn();
		document.body.addEventListener('click', ancestorClick);

		markerEl(target).dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		document.body.removeEventListener('click', ancestorClick);
		expect(onClick).toHaveBeenCalledWith(annotation);
		expect(ancestorClick).not.toHaveBeenCalled();
	});

	it('does not fire onClick while exiting', () => {
		const onClick = vi.fn();
		const target = renderMarker({ onClick, isExiting: true });
		markerEl(target).dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(onClick).not.toHaveBeenCalled();
	});

	it('fires onContextMenu only when behavior is "delete"', () => {
		const onContextMenu = vi.fn();
		const annotation = makeAnnotation();

		const editTarget = renderMarker({ annotation, onContextMenu, markerClickBehavior: 'edit' });
		markerEl(editTarget).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
		flushSync();
		expect(onContextMenu).not.toHaveBeenCalled();

		const deleteTarget = renderMarker({ annotation, onContextMenu, markerClickBehavior: 'delete' });
		markerEl(deleteTarget).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
		flushSync();
		expect(onContextMenu).toHaveBeenCalledWith(annotation);
	});

	it('renders the hover tooltip (quote + note) when hovered and not editing', () => {
		const annotation = makeAnnotation({
			element: 'a.link',
			selectedText: 'Click me',
			comment: 'Wrong colour'
		});
		const target = renderMarker({ annotation, isHovered: true });
		const tooltip = target.querySelector('.markerTooltip');
		expect(tooltip).not.toBeNull();
		expect(tooltip?.querySelector('.markerQuote')?.textContent).toBe('a.link "Click me"');
		expect(tooltip?.querySelector('.markerNote')?.textContent).toBe('Wrong colour');
	});

	it('truncates selectedText over 30 chars in the tooltip quote', () => {
		const long = 'x'.repeat(40);
		const annotation = makeAnnotation({ element: 'div', selectedText: long });
		const target = renderMarker({ annotation, isHovered: true });
		expect(target.querySelector('.markerQuote')?.textContent).toBe(`div "${'x'.repeat(30)}..."`);
	});

	it('omits the tooltip while editing any annotation', () => {
		const target = renderMarker({ isHovered: true, isEditingAny: true });
		expect(target.querySelector('.markerTooltip')).toBeNull();
	});
});

describe('PendingMarker', () => {
	it('renders the plus icon with the marker + pending classes', () => {
		const target = render(PendingMarker, { x: 10, y: 50, isExiting: false });
		const el = target.querySelector<HTMLElement>('.marker');
		expect(el).not.toBeNull();
		expect(el?.classList.contains('pending')).toBe(true);
		expect(el?.querySelector('svg')).not.toBeNull();
		expect(el?.style.left).toBe('10%');
		expect(el?.style.top).toBe('50px');
	});

	it('enters by default and exits when isExiting', () => {
		const entering = render(PendingMarker, { x: 0, y: 0, isExiting: false });
		expect(entering.querySelector('.marker')?.classList.contains('enter')).toBe(true);

		const exiting = render(PendingMarker, { x: 0, y: 0, isExiting: true });
		const el = exiting.querySelector('.marker');
		expect(el?.classList.contains('exit')).toBe(true);
		expect(el?.classList.contains('enter')).toBe(false);
	});

	it('uses the green multi-select color + class when isMultiSelect', () => {
		const target = render(PendingMarker, { x: 0, y: 0, isMultiSelect: true, isExiting: false });
		const el = target.querySelector<HTMLElement>('.marker');
		expect(el?.classList.contains('multiSelect')).toBe(true);
		expect(el?.getAttribute('style')).toContain('var(--agentation-color-green)');
	});
});

describe('ExitingMarker', () => {
	it('renders the xmark ghost with marker + hovered + exit classes', () => {
		const target = render(ExitingMarker, { annotation: makeAnnotation({ x: 5, y: 8 }) });
		const el = target.querySelector<HTMLElement>('[data-annotation-marker]');
		expect(el).not.toBeNull();
		expect(el?.classList.contains('hovered')).toBe(true);
		expect(el?.classList.contains('exit')).toBe(true);
		expect(el?.classList.contains('fixed')).toBe(false);
		expect(el?.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
		expect(el?.style.left).toBe('5%');
		expect(el?.style.top).toBe('8px');
	});

	it('applies the fixed class when fixed', () => {
		const target = render(ExitingMarker, { annotation: makeAnnotation(), fixed: true });
		expect(target.querySelector('[data-annotation-marker]')?.classList.contains('fixed')).toBe(
			true
		);
	});

	it('applies the multiSelect class when the annotation is multi-select', () => {
		const target = render(ExitingMarker, {
			annotation: makeAnnotation({ isMultiSelect: true })
		});
		expect(
			target.querySelector('[data-annotation-marker]')?.classList.contains('multiSelect')
		).toBe(true);
	});
});
