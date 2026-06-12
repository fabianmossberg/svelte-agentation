import { afterEach, describe, expect, it } from 'vitest';
import {
	identifyElement,
	getElementPath,
	getFullElementPath,
	closestCrossingShadow,
	isInShadowDOM,
	getShadowHost,
	getNearbyText,
	getNearbyElements,
	getElementClasses,
	getAccessibilityInfo
} from './element-identification.js';

// These are new tests (upstream ships none for this module). They exercise the
// DOM-traversal/identification surface against constructed jsdom trees; the
// computed-style helpers are intentionally left to integration/browser tests
// since jsdom's getComputedStyle is sparse (see issue #7 notes).

afterEach(() => {
	document.body.innerHTML = '';
});

/** Parse an HTML string into the body and return the first element child. */
function mount(html: string): HTMLElement {
	document.body.innerHTML = html;
	return document.body.firstElementChild as HTMLElement;
}

describe('getElementPath', () => {
	it('builds a readable path, preferring id then meaningful class', () => {
		mount('<div id="app"><section class="content"><p>hello</p></section></div>');
		const p = document.querySelector('p') as HTMLElement;
		expect(getElementPath(p)).toBe('#app > .content > p');
	});

	it('respects maxDepth, dropping ancestors beyond the limit', () => {
		mount(
			'<div class="lvl1"><div class="lvl2"><div class="lvl3"><div class="lvl4"><span>x</span></div></div></div></div>'
		);
		const span = document.querySelector('span') as HTMLElement;
		// maxDepth defaults to 4 → span + 3 ancestors; lvl1 falls off the top.
		expect(getElementPath(span)).toBe('.lvl2 > .lvl3 > .lvl4 > span');
	});

	it('uses the tag when no class is meaningful (classes ≤ 2 chars)', () => {
		mount('<div class="a"><span>x</span></div>');
		const span = document.querySelector('span') as HTMLElement;
		expect(getElementPath(span)).toBe('div > span');
	});

	it('marks shadow boundary crossings with the ⟨shadow⟩ prefix', () => {
		const host = mount('<div id="host"></div>');
		const root = host.attachShadow({ mode: 'open' });
		root.innerHTML = '<button>Go</button>';
		const button = root.querySelector('button') as HTMLElement;
		expect(getElementPath(button)).toBe('#host > ⟨shadow⟩ button');
	});
});

describe('getFullElementPath', () => {
	it('includes every ancestor up to (but not including) html, with tag prefixes', () => {
		mount('<main id="root"><article class="post"><p>body</p></article></main>');
		const p = document.querySelector('p') as HTMLElement;
		expect(getFullElementPath(p)).toBe('body > main#root > article.post > p');
	});
});

describe('identifyElement', () => {
	it('honors an explicit data-element label', () => {
		const el = mount('<div data-element="hero banner">x</div>');
		expect(identifyElement(el).name).toBe('hero banner');
	});

	it('names a button by aria-label when present', () => {
		const el = mount('<button aria-label="Close dialog">×</button>');
		expect(identifyElement(el).name).toBe('button [Close dialog]');
	});

	it('names a button by its text content otherwise', () => {
		const el = mount('<button>Save changes</button>');
		expect(identifyElement(el).name).toBe('button "Save changes"');
	});

	it('names a link by its text', () => {
		const el = mount('<a href="/about">About us</a>');
		expect(identifyElement(el).name).toBe('link "About us"');
	});

	it('names an input by its placeholder', () => {
		const el = mount('<input type="text" placeholder="Email address" />');
		expect(identifyElement(el).name).toBe('input "Email address"');
	});

	it('names a heading with its text', () => {
		const el = mount('<h2>Section title</h2>');
		expect(identifyElement(el).name).toBe('h2 "Section title"');
	});

	it('infers a container name from its class words', () => {
		const el = mount('<section class="product card">x</section>');
		expect(identifyElement(el).name).toBe('product card');
	});

	it('falls back to "container" for an unnamed div', () => {
		const el = mount('<div></div>');
		expect(identifyElement(el).name).toBe('container');
	});

	it('describes an svg icon nested in a button', () => {
		mount('<button>Menu<svg></svg></button>');
		const svg = document.querySelector('svg') as unknown as HTMLElement;
		expect(identifyElement(svg).name).toBe('icon in "Menu" button');
	});

	it('returns a path alongside the name', () => {
		mount('<div id="app"><button>Hi</button></div>');
		const button = document.querySelector('button') as HTMLElement;
		const { path } = identifyElement(button);
		expect(path).toBe('#app > button');
	});
});

describe('shadow DOM helpers', () => {
	function buildShadowTree() {
		const host = mount('<div id="host"></div>');
		const root = host.attachShadow({ mode: 'open' });
		root.innerHTML = '<section class="inner"><button>Go</button></section>';
		const button = root.querySelector('button') as HTMLElement;
		return { host, button };
	}

	it('isInShadowDOM distinguishes shadow vs light DOM', () => {
		const { host, button } = buildShadowTree();
		expect(isInShadowDOM(button)).toBe(true);
		expect(isInShadowDOM(host)).toBe(false);
	});

	it('getShadowHost returns the host for shadow nodes and null otherwise', () => {
		const { host, button } = buildShadowTree();
		expect(getShadowHost(button)).toBe(host);
		expect(getShadowHost(host)).toBeNull();
	});

	it('closestCrossingShadow finds an ancestor across the shadow boundary', () => {
		const { host, button } = buildShadowTree();
		// #host lives outside the shadow root; matching it requires crossing the boundary.
		expect(closestCrossingShadow(button, '#host')).toBe(host);
		// .inner lives inside the same shadow root.
		expect(closestCrossingShadow(button, '.inner')).toBe(host.shadowRoot?.querySelector('.inner'));
		expect(closestCrossingShadow(button, '.nonexistent')).toBeNull();
	});
});

describe('getNearbyText', () => {
	it('combines own text with before/after sibling context', () => {
		mount('<div><span>Before</span><p id="target">Target text</p><span>After</span></div>');
		const target = document.querySelector('#target') as HTMLElement;
		expect(getNearbyText(target)).toBe('[before: "Before"] Target text [after: "After"]');
	});

	it('omits long sibling text and long own text', () => {
		const longOwn = 'x'.repeat(120);
		mount(`<div><p id="target">${longOwn}</p></div>`);
		const target = document.querySelector('#target') as HTMLElement;
		// Own text >= 100 chars is dropped, and there are no siblings.
		expect(getNearbyText(target)).toBe('');
	});
});

describe('getNearbyElements', () => {
	it('lists sibling tags/classes with a parent total suffix when truncated', () => {
		// Siblings are capped at 4; the suffix only shows when there are more
		// children than shown + the target itself (total > siblingIds.length + 1).
		mount(
			'<ul class="list">' +
				'<li class="item">a</li>' +
				'<li id="t">b</li>' +
				'<li class="item">c</li>' +
				'<li class="item">d</li>' +
				'<li class="item">e</li>' +
				'<li class="item">f</li>' +
				'</ul>'
		);
		const target = document.querySelector('#t') as HTMLElement;
		const result = getNearbyElements(target);
		expect(result).toContain('li.item');
		expect(result).toContain('(6 total in .list)');
	});
});

describe('getElementClasses', () => {
	it('strips CSS-module hashes and dedupes', () => {
		const el = mount('<div class="card card_a1b2c3d4 active"></div>');
		expect(getElementClasses(el)).toBe('card, active');
	});

	it('returns empty string when there are no classes', () => {
		const el = mount('<div></div>');
		expect(getElementClasses(el)).toBe('');
	});
});

describe('getAccessibilityInfo', () => {
	it('collects role, aria attributes, tabindex and focusability', () => {
		const el = mount(
			'<button role="switch" aria-label="Toggle" aria-describedby="d1" tabindex="0">x</button>'
		);
		const info = getAccessibilityInfo(el);
		expect(info).toContain('role="switch"');
		expect(info).toContain('aria-label="Toggle"');
		expect(info).toContain('aria-describedby="d1"');
		expect(info).toContain('tabindex=0');
		expect(info).toContain('focusable');
	});

	it('reports aria-hidden and treats a plain div as non-focusable', () => {
		const el = mount('<div aria-hidden="true">x</div>');
		const info = getAccessibilityInfo(el);
		expect(info).toContain('aria-hidden');
		expect(info).not.toContain('focusable');
	});
});
