// Ambient shim for the optional `modern-screenshot` peer dependency.
//
// `src/lib/utils/screenshot.ts` (verbatim port) does a guarded dynamic
// `import("modern-screenshot")` for DOM-to-canvas capture, caching the result
// and falling back to stroke-only rendering when the module is absent. We do
// NOT install or bundle `modern-screenshot` (it's an optional peer dep, mirror
// of upstream — which likewise never declares it as a hard dependency), so the
// module is not present in `node_modules` and `svelte-check`/`tsc` would fail
// with TS2307 "Cannot find module 'modern-screenshot'".
//
// This declaration provides only the surface the port consumes (`domToCanvas`),
// matching the inline type the port assigns the import to. It lets `pnpm check`
// resolve the dynamic import without installing the dep, keeping the port
// byte-identical (CLAUDE.md non-negotiable #3) — the same accommodate-outside-
// the-port approach as `src/ambient-dom-timers.d.ts`. Consumers who install
// `modern-screenshot` get its real (richer) types; this shim only governs our
// own type-check of the fallback-capable port.
declare module 'modern-screenshot' {
	export function domToCanvas(
		node: Node,
		options?: Record<string, unknown>
	): Promise<HTMLCanvasElement>;
}
