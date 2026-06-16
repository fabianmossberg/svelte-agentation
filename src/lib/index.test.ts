// Export-surface guardrail for the public package entry (issue #26).
//
// The compat contract (CLAUDE.md non-negotiable #2) is that `src/lib/index.ts`
// ships upstream's export *names* verbatim — never renamed, never widened. This
// test pins the runtime export surface so an accidental rename or an extra
// public export fails CI. The names mirror upstream `package/src/index.ts`.
//
// It cannot diff against `upstream/` directly: that clone is gitignored and not
// present in CI (the committed `tests/fixtures/` are how upstream parity is
// otherwise checked). So the expected list is inlined, with upstream as the
// reference. Type-only exports (`DemoAnnotation`, `AgentationProps`,
// `AnnotationPopupCSSProps`, `Annotation`) are erased at runtime — they are
// covered by `pnpm check` / the generated `dist/index.d.ts` instead.

import { describe, it, expect } from 'vitest';
import * as pkg from './index';
import * as icons from './components/icons';

// Upstream re-exports every icon via `export * from "./icons"`; we mirror that.
// They are validated by the icons suite (#19), so exclude them here and assert
// only the hand-written surface.
const iconNames = new Set(Object.keys(icons));

describe('public export surface', () => {
	it('exports exactly upstream’s non-icon runtime names — no renames, no extras', () => {
		const expected = [
			// Main components (upstream `PageFeedbackToolbarCSS as Agentation` + itself)
			'Agentation',
			'PageFeedbackToolbarCSS',
			// Shared component
			'AnnotationPopupCSS',
			// element-identification utils
			'identifyElement',
			'identifyAnimationElement',
			'getElementPath',
			'getNearbyText',
			'getElementClasses',
			'isInShadowDOM',
			'getShadowHost',
			'closestCrossingShadow',
			// storage trio
			'loadAnnotations',
			'saveAnnotations',
			'getStorageKey'
		].sort();

		const actual = Object.keys(pkg)
			.filter((name) => !iconNames.has(name))
			.sort();

		expect(actual).toEqual(expected);
	});

	it('re-exports the icons barrel (upstream `export * from "./icons"`)', () => {
		expect(iconNames.size).toBeGreaterThan(0);
		for (const name of iconNames) {
			expect(pkg).toHaveProperty(name);
		}
	});

	it('binds the two component aliases to the same component', () => {
		expect(pkg.Agentation).toBe(pkg.PageFeedbackToolbarCSS);
		expect(typeof pkg.Agentation).toBe('function');
		expect(typeof pkg.AnnotationPopupCSS).toBe('function');
	});
});
