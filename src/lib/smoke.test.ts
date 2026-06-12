import { describe, it, expect } from 'vitest';

// Scaffold smoke test (issue #1). Proves the vitest + jsdom environment is
// wired up — the precondition for every Phase 1 DOM-util port and the compat
// fixture tests. Replace/extend as real modules land.
describe('scaffold smoke', () => {
	it('runs under a jsdom DOM environment', () => {
		const el = document.createElement('div');
		el.textContent = 'agentation';
		expect(el.textContent).toBe('agentation');
		expect(typeof window).toBe('object');
	});
});
