import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		// `modern-screenshot` is an optional, uninstalled dependency that
		// `src/lib/utils/screenshot.ts` reaches via a guarded dynamic
		// `import("modern-screenshot")` (it falls back to stroke-only capture
		// when absent — mirror of upstream, which never declares the dep). Vite's
		// import-analysis would otherwise fail to resolve that bare specifier at
		// transform time and abort the dev server. Marking it external leaves it
		// a runtime `import()`: it rejects when the dep is absent (→ graceful
		// fallback) and resolves for consumers who install it. The type side of
		// the same accommodation lives in `src/modern-screenshot.d.ts`.
		//
		// Under vitest we do NOT externalize it: `test.alias` (below) points the
		// specifier at a resolvable stub instead, so `vi.mock("modern-screenshot")`
		// can intercept the import to drive both the present/absent probe paths.
		// (`external: true` would bypass the mock registry.)
		{
			name: 'optional-modern-screenshot',
			enforce: 'pre',
			resolveId(id) {
				if (id === 'modern-screenshot' && !process.env.VITEST) {
					return { id, external: true };
				}
			}
		},
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	test: {
		// Give the uninstalled optional `modern-screenshot` dep a resolvable
		// target under vitest so import-analysis doesn't abort and so
		// `vi.mock("modern-screenshot")` has a module to replace (see the
		// `optional-modern-screenshot` plugin above and
		// `src/test/modern-screenshot-stub.ts`).
		alias: {
			'modern-screenshot': fileURLToPath(
				new URL('./src/test/modern-screenshot-stub.ts', import.meta.url)
			)
		},
		expect: { requireAssertions: true },
		// jsdom: upstream runs its DOM-heavy utils (element-identification,
		// screenshot, storage) under jsdom; the Phase 1 ports and compat
		// fixture tests inherit that requirement. See CLAUDE.md "Tech conventions".
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}']
	}
});
