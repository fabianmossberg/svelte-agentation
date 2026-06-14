// Shared mount/auto-cleanup helper for component tests (jsdom).
//
// Mirrors the inline helper in `components/icons/icons.test.ts` but factored out
// so the primitive component tests (checkbox/switch/tooltip/help-tooltip) don't
// each redeclare it. Importing this module registers an `afterEach` that unmounts
// everything mounted via `render()` and removes its target — Vitest re-evaluates
// the module per isolated test file, so the hook is scoped to the importing file.
import { afterEach } from 'vitest';
import { mount, unmount, type Component } from 'svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mounted: Array<{ instance: any; target: HTMLElement }> = [];

export function render(
	component: Component<Record<string, unknown>> | unknown,
	props: Record<string, unknown> = {}
): HTMLElement {
	const target = document.createElement('div');
	document.body.appendChild(target);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const instance = mount(component as any, { target, props });
	mounted.push({ instance, target });
	return target;
}

afterEach(() => {
	for (const { instance, target } of mounted.splice(0)) {
		unmount(instance);
		target.remove();
	}
});
