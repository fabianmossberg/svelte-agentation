<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	// Help/Question mark icon for tooltips
	// DIVERGENCE(upstream): React's `...props` (React.SVGProps<SVGSVGElement>) spread
	// becomes a Svelte rest-props spread (`{...rest}`) onto the root <svg>.
	let { size = 20, ...rest }: { size?: number } & SVGAttributes<SVGSVGElement> = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 20 20"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	{...rest}
>
	<circle cx="10" cy="10" r="5.375" stroke="currentColor" stroke-width="1.25" />
	<path
		d="M8.5 8.5C8.73 7.85 9.31 7.49 10 7.5C10.86 7.51 11.5 8.13 11.5 9C11.5 10.08 10 10.5 10 10.5V10.75"
		stroke="currentColor"
		stroke-width="1.25"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<circle cx="10" cy="12.625" r="0.625" fill="currentColor" />
</svg>
