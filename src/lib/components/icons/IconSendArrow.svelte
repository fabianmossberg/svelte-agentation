<script lang="ts">
	// Animated send arrow icon (paper plane style with checkmark/error transition)
	let {
		size = 24,
		state = 'idle'
	}: { size?: number; state?: 'idle' | 'sending' | 'sent' | 'failed' } = $props();

	const showArrow = $derived(state === 'idle');
	const showCheck = $derived(state === 'sent');
	const showError = $derived(state === 'failed');
	const isSending = $derived(state === 'sending');
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
	<!-- Send arrow -->
	<g
		class="iconStateFast"
		class:visibleScaled={showArrow}
		class:sending={isSending}
		class:hiddenScaled={!showArrow && !isSending}
	>
		<path
			d="M9.875 14.125L12.3506 19.6951C12.7184 20.5227 13.9091 20.4741 14.2083 19.6193L18.8139 6.46032C19.0907 5.6695 18.3305 4.90933 17.5397 5.18611L4.38072 9.79174C3.52589 10.0909 3.47731 11.2816 4.30494 11.6494L9.875 14.125ZM9.875 14.125L13.375 10.625"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>
	<!-- Green checkmark circle -->
	<g class="iconStateFast" class:visibleScaled={showCheck} class:hiddenScaled={!showCheck}>
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
	<!-- Red error circle with exclamation -->
	<g class="iconStateFast" class:visibleScaled={showError} class:hiddenScaled={!showError}>
		<path
			d="M12 20C7.58172 20 4 16.4182 4 12C4 7.58172 7.58172 4 12 4C16.4182 4 20 7.58172 20 12C20 16.4182 16.4182 20 12 20Z"
			stroke="var(--agentation-color-red)"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M12 8V12"
			stroke="var(--agentation-color-red)"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
		<circle
			cx="12"
			cy="15"
			r="0.5"
			fill="var(--agentation-color-red)"
			stroke="var(--agentation-color-red)"
			stroke-width="1"
		/>
	</g>
</svg>

<!-- DIVERGENCE(upstream): CSS-module transition classes (icon-transitions.module.scss) become
Svelte scoped <style> classes; `!important` preserved (upstream issue #58). -->
<style>
	.iconStateFast {
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
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
	.sending {
		opacity: 0.5 !important;
		transform: scale(0.8);
	}
</style>
