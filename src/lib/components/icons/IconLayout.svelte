<script lang="ts">
	// Layout / grid icon for layout mode
	let { size = 24 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
	<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
	<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5" />
	<line x1="9" y1="9" x2="9" y2="21" stroke="currentColor" stroke-width="1.5" />
</svg>
