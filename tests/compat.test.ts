// @vitest-environment node
//
// Compat parity test (issue #14). Feeds the committed inputs in
// tests/fixtures/annotations.json to OUR generateOutput and asserts the markdown
// is byte-for-byte identical to the fixtures generated from UPSTREAM's own
// generate-output.ts (see scripts/generate-fixtures.ts).
//
// Runs under the `node` environment (note the pragma above) so `typeof window`
// is undefined here too — matching the conditions under which the fixtures were
// generated, which makes the forensic Environment block deterministic (viewport
// "unknown", no URL / User Agent / Timestamp / Device Pixel Ratio).
//
// A failure here means our port diverged from upstream — a type:compat bug in
// src/lib/utils/generate-output.ts. NEVER "fix" it by editing the fixture
// (CONTRIBUTING.md); regenerate with `pnpm fixtures:generate` only after an
// upstream bump.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generateOutput } from '../src/lib/utils/generate-output.js';
import { unwrapFixture } from './fixtures-format.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, 'fixtures');

const LEVELS = ['compact', 'standard', 'detailed', 'forensic'] as const;

type FixtureCase = {
	name: string;
	pathname: string;
	annotations: Parameters<typeof generateOutput>[0];
};

const cases: FixtureCase[] = JSON.parse(
	readFileSync(resolve(fixturesDir, 'annotations.json'), 'utf8')
);

describe('generateOutput is byte-identical to the pinned upstream', () => {
	it('runs without a window (node environment), matching fixture generation', () => {
		expect(typeof window).toBe('undefined');
	});

	for (const fixtureCase of cases) {
		for (const level of LEVELS) {
			it(`${fixtureCase.name} @ ${level}`, () => {
				const expected = unwrapFixture(
					readFileSync(resolve(fixturesDir, 'output', `${fixtureCase.name}.${level}.md`), 'utf8')
				);
				expect(generateOutput(fixtureCase.annotations, fixtureCase.pathname, level)).toBe(expected);
			});
		}
	}
});
