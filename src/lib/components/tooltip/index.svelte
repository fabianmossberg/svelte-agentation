<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { originalSetTimeout } from '../../utils/freeze-animations';

	// DIVERGENCE(upstream): React props object → Svelte `$props()`. `children`
	// (React.ReactNode) becomes a Svelte `Snippet`; the remaining HTML span
	// attributes spread onto the trigger <span> via `{...rest}`.
	let {
		content,
		children,
		...rest
	}: {
		content: string;
		children: Snippet;
	} & HTMLAttributes<HTMLSpanElement> = $props();

	// DIVERGENCE(upstream): React useState → `$state`; useRef → plain locals /
	// `bind:this`. Same fields, same semantics.
	let visible = $state(false);
	let shouldRender = $state(false);
	let position = $state({ top: 0, right: 0 });
	let triggerEl: HTMLSpanElement;
	let timeout: ReturnType<typeof originalSetTimeout> | null = null;
	let exitTimeout: ReturnType<typeof originalSetTimeout> | null = null;

	const updatePosition = () => {
		if (triggerEl) {
			const rect = triggerEl.getBoundingClientRect();
			position = {
				top: rect.top + rect.height / 2,
				right: window.innerWidth - rect.left + 8
			};
		}
	};

	const handleMouseEnter = () => {
		shouldRender = true;
		if (exitTimeout) {
			clearTimeout(exitTimeout);
			exitTimeout = null;
		}
		updatePosition();
		timeout = originalSetTimeout(() => {
			visible = true;
		}, 500);
	};

	const handleMouseLeave = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		visible = false;
		// Keep rendered during exit animation
		exitTimeout = originalSetTimeout(() => {
			shouldRender = false;
		}, 150);
	};

	// DIVERGENCE(upstream): React's `createPortal(…, document.body)` becomes a
	// Svelte attachment that appends the tooltip node to <body> on mount and
	// removes it on teardown. The node stays Svelte-managed (reactivity for
	// `position`/`visible` keeps working); only its DOM location moves.
	const portal = (node: HTMLElement) => {
		document.body.appendChild(node);
		return () => node.remove();
	};

	// DIVERGENCE(upstream): React's unmount-cleanup useEffect becomes an `$effect`
	// returning a teardown that clears any pending timers.
	$effect(() => {
		return () => {
			if (timeout) clearTimeout(timeout);
			if (exitTimeout) clearTimeout(exitTimeout);
		};
	});
</script>

<span
	bind:this={triggerEl}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	{...rest}
>
	{@render children()}
</span>

{#if shouldRender}
	<div
		{@attach portal}
		data-feedback-toolbar
		style="position: fixed; top: {position.top}px; right: {position.right}px; transform: translateY(-50%); padding: 6px 10px; background: #383838; color: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 400; line-height: 14px; border-radius: 10px; width: 180px; text-align: left; z-index: 100020; pointer-events: none; box-shadow: 0px 1px 8px rgba(0, 0, 0, 0.28); opacity: {visible
			? 1
			: 0}; transition: opacity 0.15s ease;"
	>
		{content}
	</div>
{/if}
