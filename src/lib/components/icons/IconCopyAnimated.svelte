<script lang="ts">
	// Animated copy/checkmark icon
	let {
		size = 24,
		copied = false,
		tint
	}: { size?: number; copied?: boolean; tint?: string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	style={tint ? `color: ${tint}; transition: color 0.3s ease` : undefined}
>
	<!-- Copy icon -->
	<g class="iconState" class:hiddenScaled={copied} class:visibleScaled={!copied}>
		<path
			d="M4.75 11.25C4.75 10.4216 5.42157 9.75 6.25 9.75H12.75C13.5784 9.75 14.25 10.4216 14.25 11.25V17.75C14.25 18.5784 13.5784 19.25 12.75 19.25H6.25C5.42157 19.25 4.75 18.5784 4.75 17.75V11.25Z"
			stroke="currentColor"
			stroke-width="1.5"
		/>
		<path
			d="M17.25 14.25H17.75C18.5784 14.25 19.25 13.5784 19.25 12.75V6.25C19.25 5.42157 18.5784 4.75 17.75 4.75H11.25C10.4216 4.75 9.75 5.42157 9.75 6.25V6.75"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
	</g>
	<!-- Checkmark circle -->
	<g class="iconState" class:visibleScaled={copied} class:hiddenScaled={!copied}>
		<path
			d="M12 20C7.58172 20 4 16.4182 4 12C4 7.58172 7.58172 4 12 4C16.4182 4 20 7.58172 20 12C20 16.4182 16.4182 20 12 20Z"
			stroke="var(--agentation-color-green)"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M15 10L11 14.25L9.25 12.25"
			stroke="var(--agentation-color-green)"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>
</svg>

<!-- DIVERGENCE(upstream): upstream's CSS-module transition classes (icon-transitions.module.scss,
imported as `s`) become Svelte scoped <style> classes — Svelte's per-component hashing replaces the
module's hashing, and the `!important` is preserved so a host `svg * { opacity: 1 !important }` can't
force both states visible (class specificity beats element selectors). See upstream issue #58. -->
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
