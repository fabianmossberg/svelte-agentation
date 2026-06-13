// Shared fixture envelope for the compat harness (issue #14).
//
// Generated fixtures carry a header comment (acceptance criterion: "tests/fixtures/
// outputs carry a generated-file header comment"). To keep the parity assertion a
// strict byte-for-byte comparison of the markdown ITSELF, the header is a fixed
// prefix that the generator prepends (`wrapFixture`) and the test strips
// (`unwrapFixture`). Both sides import this one module so the envelope can never
// drift between generation and verification.

export const FIXTURE_HEADER = `<!--
  GENERATED COMPAT FIXTURE — DO NOT EDIT BY HAND.

  Produced by scripts/generate-fixtures.ts, which feeds tests/fixtures/annotations.json
  to UPSTREAM's own utils/generate-output.ts (run via tsx against the pinned baseline
  in upstream/, see UPSTREAM.md). Regenerate with:  pnpm fixtures:generate

  Per CONTRIBUTING.md, tests/fixtures/ is never hand-edited: if tests/compat.test.ts
  fails against one of these files the bug is a type:compat divergence in our port
  (src/lib/utils/generate-output.ts), never the fixture.
-->`;

// One blank line separates the header from the markdown body. The body is stored
// verbatim with no trailing newline added, so it equals generateOutput's return
// value byte-for-byte (generateOutput returns trimmed output).
const SEPARATOR = '\n\n';

/** Wrap a generated markdown body in the fixture envelope (header + separator). */
export function wrapFixture(body: string): string {
	return FIXTURE_HEADER + SEPARATOR + body;
}

/** Recover the markdown body from a fixture file, asserting the envelope is intact. */
export function unwrapFixture(content: string): string {
	const prefix = FIXTURE_HEADER + SEPARATOR;
	if (!content.startsWith(prefix)) {
		throw new Error(
			'Compat fixture is missing its generated-file header; regenerate with `pnpm fixtures:generate`.'
		);
	}
	return content.slice(prefix.length);
}
