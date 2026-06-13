// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { generateOutput } from './generate-output.js';
import type { Annotation } from '../types.js';

// These are new tests (upstream ships none for this module).
//
// Companion to `generate-output.test.ts`. This file runs under the `node`
// environment (note the `@vitest-environment node` pragma above) so that
// `typeof window === "undefined"` — the only faithful way to exercise the
// window-ABSENT branches of the generator: the viewport reported as "unknown"
// and the forensic Environment block reduced to just the viewport line (no URL,
// User Agent, Timestamp or Device Pixel Ratio). Those branches are fully
// deterministic, so they get exact full-string assertions. This mirrors how the
// Phase 1 compat fixtures are generated (issue #12).

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

describe('generateOutput without window (node environment)', () => {
	it('confirms the test runs with window undefined', () => {
		expect(typeof window).toBe('undefined');
	});

	it('reports the viewport as "unknown" at the standard level', () => {
		const out = generateOutput([fullAnnotation()], '/home', 'standard');
		expect(out).toBe(
			`## Page Feedback: /home\n` +
				`**Viewport:** unknown\n\n` +
				`### 1. Button\n` +
				`**Location:** body > main > button\n` +
				`**Source:** src/Button.tsx:42\n` +
				`**React:** <App> <Button>\n` +
				`**Selected text:** "Click me"\n` +
				`**Feedback:** This is wrong`
		);
	});

	it('renders the forensic Environment block with only the viewport line', () => {
		const out = generateOutput([fullAnnotation()], '/home', 'forensic');
		expect(out).toBe(
			`## Page Feedback: /home\n\n` +
				`**Environment:**\n` +
				`- Viewport: unknown\n\n` +
				`---\n\n` +
				`### 1. Button\n` +
				`**Full DOM Path:** html > body > main > button.btn\n` +
				`**CSS Classes:** btn btn-primary\n` +
				`**Position:** x:10, y:21 (101×40px)\n` +
				`**Annotation at:** 12.3% from left, 679px from top\n` +
				`**Selected text:** "Click me"\n` +
				`**Computed Styles:** color: red\n` +
				`**Accessibility:** role=button\n` +
				`**Nearby Elements:** <span>, <svg>\n` +
				`**Source:** src/Button.tsx:42\n` +
				`**React:** <App> <Button>\n` +
				`**Feedback:** This is wrong`
		);
	});

	it('omits the window-only forensic lines (URL, User Agent, Timestamp, DPR)', () => {
		const out = generateOutput([fullAnnotation()], '/home', 'forensic');
		expect(out).not.toContain('- URL:');
		expect(out).not.toContain('- User Agent:');
		expect(out).not.toContain('- Timestamp:');
		expect(out).not.toContain('- Device Pixel Ratio:');
	});
});
