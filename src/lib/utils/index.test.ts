import { describe, expect, it } from 'vitest';

// Smoke test for the utils barrel: a representative symbol from each
// re-exported module must reach consumers through `./index`. This is what
// guards the upstream-shaped import path — if a re-export line is dropped or
// the underlying module stops exporting the symbol, this fails.
import { createSession, identifyElement, loadAnnotations } from './index.js';

describe('utils barrel (index.ts)', () => {
	it('re-exports identifyElement from ./element-identification', () => {
		expect(typeof identifyElement).toBe('function');
	});

	it('re-exports loadAnnotations from ./storage', () => {
		expect(typeof loadAnnotations).toBe('function');
	});

	it('re-exports createSession from ./sync', () => {
		expect(typeof createSession).toBe('function');
	});
});
