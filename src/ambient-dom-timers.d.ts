// DOM timer return types for the browser library.
//
// `agentation` is browser code, so `setTimeout`/`setInterval` return `number`
// (the DOM contract upstream's tsconfig assumes). SvelteKit's generated
// tsconfig sets `types: ["node"]`, and vitest drags in `@types/node` via a
// `/// <reference types="node" />` directive, which appends a global
// `setTimeout` overload returning `NodeJS.Timeout`. `ReturnType<typeof
// setTimeout>` reads the *last* declared overload, so it became `Timeout` —
// clashing with the DOM `number` produced by `window.setTimeout(...)` in the
// verbatim port `src/lib/utils/freeze-animations.ts` (which annotates its
// patched timers as `ReturnType<typeof setTimeout>`).
//
// Appending a trailing `number`-returning overload realigns
// `ReturnType<typeof setTimeout>` with the browser reality without disturbing
// node call-site resolution (overload *calls* still match node's signatures
// first). This keeps the port byte-identical (CLAUDE.md non-negotiable #3) and
// the test files type-checked, instead of excluding them from `pnpm check`.
declare global {
	function setTimeout(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
	function setInterval(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
}

export {};
