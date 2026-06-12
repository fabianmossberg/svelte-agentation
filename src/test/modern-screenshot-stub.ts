// Test-only stub for the optional, uninstalled `modern-screenshot` dependency.
//
// `src/lib/utils/screenshot.ts` does a guarded dynamic `import("modern-
// screenshot")`. We never install the dep (mirror of upstream — see
// `src/modern-screenshot.d.ts` and the vite config). Outside tests, vite marks
// the specifier external so the import simply rejects when absent. Under vitest
// the bare specifier must still *resolve* to a real module so vite's import-
// analysis doesn't abort the run and so `vi.mock("modern-screenshot", …)` has a
// module to replace — `test.alias` in `vite.config.ts` points here.
//
// The screenshot tests always `vi.mock` this module, so this implementation is
// never actually executed; it exists only to give the specifier a resolvable
// target. The throwing default mirrors "dep behaves unexpectedly" should a test
// ever forget to mock it.
export function domToCanvas(): Promise<HTMLCanvasElement> {
	throw new Error('modern-screenshot stub: tests must vi.mock this module');
}
