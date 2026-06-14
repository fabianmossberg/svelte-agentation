// Package version surfaced in the settings panel header (upstream renders
// `v{__VERSION__}` directly).
//
// DIVERGENCE(upstream): upstream injects `__VERSION__` with tsup's `define`, a
// compile-time text substitution, so the token never survives into `dist`. This
// repo publishes via `@sveltejs/package`, which compiles each file individually
// and does NOT run Vite's `define` replacement — a bare `__VERSION__` in a
// `.svelte` file would ship verbatim and throw `ReferenceError` in consumers.
// We still wire a Vite `define` (vite.config.ts) so dev / vitest / the
// playground see the real version, but read it through this `typeof` guard —
// `typeof` on an undeclared identifier yields `"undefined"` instead of throwing
// — so the packaged build degrades to an empty string rather than crashing.
// Real packaged-version wiring is revisited at publish time (#49).
export const VERSION: string = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '';
