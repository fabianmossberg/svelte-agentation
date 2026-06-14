<script lang="ts">
	// Animated send/checkmark icon (for "Send to Agent" button)
	let { size = 24, sent = false }: { size?: number; sent?: boolean } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 22 21" fill="none">
	<!-- Send icon (document with arrow) -->
	<g class="iconState" class:hiddenScaled={sent} class:visibleScaled={!sent}>
		<path
			d="M9.5 5H6.5C4.84315 5 3.5 6.34315 3.5 8V15C3.5 16.6569 4.84315 18 6.5 18H13.5C15.1569 18 16.5 16.6569 16.5 15V12"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
		<path
			d="M13.5 8.5L18.5 3.5M18.5 3.5L14.4524 3.5M18.5 3.5L18.5 7.54762"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path d="M7.5 13.75H12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
		<path d="M7.5 10.75H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
	</g>
	<!-- Checkmark circle (success state) -->
	<g class="iconState" class:visibleScaled={sent} class:hiddenScaled={!sent}>
		<path
			d="M11 19C6.58172 19 3 15.4182 3 11C3 6.58172 6.58172 3 11 3C15.4182 3 19 6.58172 19 11C19 15.4182 15.4182 19 11 19Z"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M14 9L10 13.25L8.25 11.25"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>
</svg>

<!-- DIVERGENCE(upstream): CSS-module transition classes (icon-transitions.module.scss) become
Svelte scoped <style> classes; `!important` preserved (upstream issue #58). -->
<style>
	.iconState {
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
		transform-origin: center;
	}
	.visibleScaled {
		opacity: 1 !important;
		transform: scale(1);
	}
	.hiddenScaled {
		opacity: 0 !important;
		transform: scale(0.8);
	}
</style>
