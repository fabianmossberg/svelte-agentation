// Compat fixture generator (issue #14).
//
// Feeds the committed Annotation[] inputs in tests/fixtures/annotations.json to
// UPSTREAM's OWN generate-output.ts and writes the resulting markdown — one file
// per (case x detail level) — into tests/fixtures/output/. The companion
// tests/compat.test.ts then feeds the identical inputs to OUR port and asserts
// byte-for-byte equality, proving output parity at all four detail levels.
//
// Why this is deterministic (running it twice produces zero git diff):
//   - It runs in Node via tsx, so `typeof window === "undefined"`. The generator's
//     forensic branch therefore emits only `Viewport: unknown` and skips the
//     window-only lines (URL / User Agent / Timestamp / Device Pixel Ratio) — the
//     only non-deterministic content. tests/compat.test.ts runs in vitest's `node`
//     environment for the same reason.
//   - The inputs are static JSON; nothing here reads the clock or the environment.
//
// Why tsx can import upstream's file at all: upstream's generate-output.ts imports
// `OutputDetailLevel`/`ReactComponentMode` from the 4.7k-line React toolbar
// component, but only in TYPE positions, so esbuild (under tsx) elides that import
// and the module runs in Node with no React present. If a future upstream turns
// that into a value import, this script will fail to load — fix it with a tsconfig
// path alias stubbing the toolbar module rather than re-implementing the generator.
//
// NEVER hand-edit tests/fixtures/ (CONTRIBUTING.md). A parity mismatch is a
// type:compat bug in src/lib/utils/generate-output.ts, never a fixture problem.
// The pinned baseline lives in upstream/ (./scripts/upstream.sh, see UPSTREAM.md);
// this script must always run against it, never a floating clone.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateOutput } from '../upstream/package/src/utils/generate-output.ts';
import { wrapFixture } from '../tests/fixtures-format.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const fixturesDir = resolve(root, 'tests/fixtures');
const outputDir = resolve(fixturesDir, 'output');

const LEVELS = ['compact', 'standard', 'detailed', 'forensic'] as const;

type FixtureCase = {
	name: string;
	pathname: string;
	annotations: Parameters<typeof generateOutput>[0];
};

const cases: FixtureCase[] = JSON.parse(
	readFileSync(resolve(fixturesDir, 'annotations.json'), 'utf8')
);

mkdirSync(outputDir, { recursive: true });

let written = 0;
for (const fixtureCase of cases) {
	for (const level of LEVELS) {
		const body = generateOutput(fixtureCase.annotations, fixtureCase.pathname, level);
		writeFileSync(resolve(outputDir, `${fixtureCase.name}.${level}.md`), wrapFixture(body), 'utf8');
		written++;
	}
}

console.log(`Wrote ${written} compat fixtures (${cases.length} cases x ${LEVELS.length} levels) to tests/fixtures/output/`);
