import { describe, expect, it } from 'vitest';

import { OUTPUT_DETAIL_OPTIONS, OUTPUT_TO_REACT_MODE, generateOutput } from './generate-output.js';
import type { Annotation } from '../types.js';

// These are new tests (upstream ships none for this module).
//
// `generate-output.ts` is the markdown generator agents consume; its whitespace,
// heading levels, field order and final `.trim()` are the compat contract
// (issue #12) — so these assert exact output strings, not just substrings.
//
// This file runs under the default jsdom environment, exercising the
// window-PRESENT branches (real viewport, forensic Environment block with
// URL/User Agent/Timestamp/Device Pixel Ratio). The window-ABSENT branches
// (viewport "unknown", forensic block without those lines) are deterministic and
// live in `generate-output.node.test.ts` under the `node` environment, matching
// how the Phase 1 compat fixtures are generated.

/** A fully-populated annotation — every optional field the generator reads. */
function fullAnnotation(overrides: Partial<Annotation> = {}): Annotation {
	return {
		id: 'a1',
		x: 12.345,
		y: 678.9,
		comment: 'This is wrong',
		element: 'Button',
		elementPath: 'body > main > button',
		timestamp: 0,
		selectedText: 'Click me',
		boundingBox: { x: 10.4, y: 20.6, width: 100.5, height: 40.2 },
		nearbyText: 'Surrounding context text',
		cssClasses: 'btn btn-primary',
		nearbyElements: '<span>, <svg>',
		computedStyles: 'color: red',
		fullPath: 'html > body > main > button.btn',
		accessibility: 'role=button',
		isMultiSelect: false,
		reactComponents: '<App> <Button>',
		sourceFile: 'src/Button.tsx:42',
		...overrides
	};
}

// In jsdom `window` is defined, so the generator reports the live viewport.
const VIEWPORT = `${window.innerWidth}×${window.innerHeight}`;

describe('exports', () => {
	it('maps each detail level to its React component mode', () => {
		expect(OUTPUT_TO_REACT_MODE).toEqual({
			compact: 'off',
			standard: 'filtered',
			detailed: 'smart',
			forensic: 'all'
		});
	});

	it('lists the four detail options in order', () => {
		expect(OUTPUT_DETAIL_OPTIONS).toEqual([
			{ value: 'compact', label: 'Compact' },
			{ value: 'standard', label: 'Standard' },
			{ value: 'detailed', label: 'Detailed' },
			{ value: 'forensic', label: 'Forensic' }
		]);
	});
});

describe('generateOutput', () => {
	it('returns "" for an empty annotation list (early return, any level)', () => {
		expect(generateOutput([], '/home')).toBe('');
		expect(generateOutput([], '/home', 'forensic')).toBe('');
	});

	it('defaults to the standard detail level', () => {
		const a = fullAnnotation();
		expect(generateOutput([a], '/home')).toBe(generateOutput([a], '/home', 'standard'));
	});

	describe('compact', () => {
		it('renders the inline one-liner with sourceFile and truncated selectedText', () => {
			const a = fullAnnotation();
			expect(generateOutput([a], '/home', 'compact')).toBe(
				'## Page Feedback: /home\n\n' +
					'1. **Button** (src/Button.tsx:42): This is wrong (re: "Click me")'
			);
		});

		it('omits the sourceFile parentheses when sourceFile is unset', () => {
			const a = fullAnnotation({ sourceFile: undefined, selectedText: undefined });
			expect(generateOutput([a], '/home', 'compact')).toBe(
				'## Page Feedback: /home\n\n1. **Button**: This is wrong'
			);
		});

		it('does not truncate selectedText of exactly 30 chars (no ellipsis)', () => {
			const text = 'a'.repeat(30);
			const a = fullAnnotation({ selectedText: text, sourceFile: undefined });
			expect(generateOutput([a], '/home', 'compact')).toBe(
				`## Page Feedback: /home\n\n1. **Button**: This is wrong (re: "${text}")`
			);
		});

		it('truncates selectedText longer than 30 chars to slice(0,30) + "..."', () => {
			const a = fullAnnotation({ selectedText: 'b'.repeat(31), sourceFile: undefined });
			expect(generateOutput([a], '/home', 'compact')).toBe(
				`## Page Feedback: /home\n\n1. **Button**: This is wrong (re: "${'b'.repeat(30)}...")`
			);
		});
	});

	describe('standard', () => {
		it('renders location, source and react lines but no detailed-only fields', () => {
			const a = fullAnnotation();
			expect(generateOutput([a], '/home', 'standard')).toBe(
				`## Page Feedback: /home\n` +
					`**Viewport:** ${VIEWPORT}\n\n` +
					`### 1. Button\n` +
					`**Location:** body > main > button\n` +
					`**Source:** src/Button.tsx:42\n` +
					`**React:** <App> <Button>\n` +
					`**Selected text:** "Click me"\n` +
					`**Feedback:** This is wrong`
			);
		});

		it('omits Source/React lines when those fields are unset', () => {
			const a = fullAnnotation({ sourceFile: undefined, reactComponents: undefined });
			const out = generateOutput([a], '/home', 'standard');
			expect(out).not.toContain('**Source:**');
			expect(out).not.toContain('**React:**');
		});

		it('does not emit a Context line even when nearbyText is set (detailed-only)', () => {
			const a = fullAnnotation({ selectedText: undefined });
			expect(generateOutput([a], '/home', 'standard')).not.toContain('**Context:**');
		});
	});

	describe('detailed', () => {
		it('adds Classes and Position and rounds the bounding box', () => {
			const a = fullAnnotation({ selectedText: undefined, nearbyText: undefined });
			expect(generateOutput([a], '/home', 'detailed')).toBe(
				`## Page Feedback: /home\n` +
					`**Viewport:** ${VIEWPORT}\n\n` +
					`### 1. Button\n` +
					`**Location:** body > main > button\n` +
					`**Source:** src/Button.tsx:42\n` +
					`**React:** <App> <Button>\n` +
					`**Classes:** btn btn-primary\n` +
					`**Position:** 10px, 21px (101×40px)\n` +
					`**Feedback:** This is wrong`
			);
		});

		it('emits Context from nearbyText when selectedText is absent', () => {
			const a = fullAnnotation({ selectedText: undefined });
			expect(generateOutput([a], '/home', 'detailed')).toContain(
				'**Context:** Surrounding context text'
			);
		});

		it('suppresses Context when selectedText is present (selectedText wins)', () => {
			const a = fullAnnotation({ selectedText: 'Click me', nearbyText: 'should be hidden' });
			const out = generateOutput([a], '/home', 'detailed');
			expect(out).toContain('**Selected text:** "Click me"');
			expect(out).not.toContain('**Context:**');
		});
	});

	describe('forensic (window present)', () => {
		it('includes a live Environment block with URL, User Agent and Timestamp', () => {
			const out = generateOutput([fullAnnotation()], '/home', 'forensic');
			expect(out).toContain(`**Environment:**\n`);
			expect(out).toContain(`- Viewport: ${VIEWPORT}\n`);
			expect(out).toContain(`- URL: ${window.location.href}\n`);
			expect(out).toContain(`- User Agent: ${navigator.userAgent}\n`);
			expect(out).toMatch(/- Timestamp: \d{4}-\d{2}-\d{2}T[\d:.]+Z\n/);
			expect(out).toContain(`- Device Pixel Ratio: ${window.devicePixelRatio}\n`);
		});

		it('renders the full per-annotation forensic field set', () => {
			const out = generateOutput([fullAnnotation()], '/home', 'forensic');
			expect(out).toContain('### 1. Button\n');
			expect(out).toContain('**Full DOM Path:** html > body > main > button.btn\n');
			expect(out).toContain('**CSS Classes:** btn btn-primary\n');
			expect(out).toContain('**Position:** x:10, y:21 (101×40px)\n');
			expect(out).toContain('**Annotation at:** 12.3% from left, 679px from top\n');
			expect(out).toContain('**Computed Styles:** color: red\n');
			expect(out).toContain('**Accessibility:** role=button\n');
			expect(out).toContain('**Nearby Elements:** <span>, <svg>\n');
			expect(out).toContain('**Source:** src/Button.tsx:42\n');
			expect(out).toContain('**React:** <App> <Button>\n');
			expect(out).toContain('**Feedback:** This is wrong');
		});

		it('shows the multi-select notice only when isMultiSelect and fullPath are both set', () => {
			const single = generateOutput([fullAnnotation()], '/home', 'forensic');
			expect(single).not.toContain('*Forensic data shown for first element of selection*');
			const multi = generateOutput([fullAnnotation({ isMultiSelect: true })], '/home', 'forensic');
			expect(multi).toContain('*Forensic data shown for first element of selection*');
		});

		it('suppresses Context when selectedText is present', () => {
			const out = generateOutput(
				[fullAnnotation({ selectedText: 'Click me', nearbyText: 'hidden' })],
				'/home',
				'forensic'
			);
			expect(out).toContain('**Selected text:** "Click me"');
			expect(out).not.toContain('**Context:**');
		});
	});

	it('numbers annotations sequentially across the list', () => {
		const out = generateOutput(
			[fullAnnotation({ element: 'First' }), fullAnnotation({ element: 'Second' })],
			'/home',
			'standard'
		);
		expect(out).toContain('### 1. First');
		expect(out).toContain('### 2. Second');
	});
});
