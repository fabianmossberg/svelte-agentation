<script module lang="ts">
	// =============================================================================
	// Page toolbar — body-mount entry point
	// =============================================================================
	//
	// Ports the *portal* of upstream `package/src/components/page-toolbar-css/index.tsx`
	// (the `createPortal(jsx, document.body)` at L3565/L4705). Svelte has no portal
	// primitive; the issue (#24) calls for `mount()` as the substitute. A component
	// can't `mount()` itself, so the port splits in two:
	//   - this file: the public component a host renders anywhere. On mount it
	//     `mount()`s the real UI (`Toolbar.svelte`) into `document.body`, and
	//     `unmount()`s it on teardown — the React-portal lifecycle, by hand.
	//   - `Toolbar.svelte`: the actual shell + controllers + all reactive state.
	//
	// Keeping every rune inside `Toolbar.svelte` matters: `mount()` does NOT make
	// its `props` reactive, so any state shared by the shell must live in the
	// mounted tree, not be threaded across the boundary as plain props.
	//
	// DIVERGENCE(upstream): the public prop surface (`PageFeedbackToolbarCSSProps`,
	// the `on*` callbacks, `endpoint`, `webhookUrl`, `className`, …) and the
	// `index.ts` export list are owned by p2-11, not this issue. This entry takes
	// the minimal props needed to be operable; p2-11 widens it.
	export interface PageToolbarProps {
		/** Optional extra class on the toolbar shell (upstream `className`). */
		class?: string;
	}
</script>

<script lang="ts">
	import { mount, unmount, onMount } from 'svelte';
	import Toolbar from './Toolbar.svelte';

	// Destructured (not forwarded as a whole `$props()` object) so each prop is an
	// explicit, lint-visible use; the toolbar's reactive state lives in `Toolbar`,
	// so passing these once at mount is sufficient (see the module comment).
	let { class: className }: PageToolbarProps = $props();

	// DIVERGENCE(upstream): React renders the portal during render; we defer the
	// `mount()` to `onMount` so it is browser-only (SSR-safe — `document` is
	// guaranteed) and so the cleanup that `unmount()`s the UI is tied to this
	// component's lifecycle, exactly like the portal unmounting with its owner.
	onMount(() => {
		const app = mount(Toolbar, { target: document.body, props: { class: className } });
		return () => unmount(app);
	});
</script>
