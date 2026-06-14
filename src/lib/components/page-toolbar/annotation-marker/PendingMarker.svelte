<script module lang="ts">
	// Ports the `PendingMarker` component from upstream
	// `package/src/components/page-toolbar-css/annotation-marker/index.tsx` L145–174.
	// See `AnnotationMarker.svelte` for the one-file-per-component rationale.
	export interface PendingMarkerProps {
		x: number;
		y: number;
		isMultiSelect?: boolean;
		isExiting: boolean;
	}
</script>

<script lang="ts">
	import { IconPlus } from '../../icons';

	let { x, y, isMultiSelect, isExiting }: PendingMarkerProps = $props();
</script>

<!-- DIVERGENCE(upstream): React `className` concat → `class:` directives; `style` object
→ `style:` directives (React appends `px` to a numeric `top`; Svelte sets it explicitly).
The toolbar passes `y` already offset by `scrollY` for non-fixed pending markers (p2-09). -->
<div
	class="marker pending"
	class:multiSelect={isMultiSelect}
	class:enter={!isExiting}
	class:exit={isExiting}
	style:left={`${x}%`}
	style:top={`${y}px`}
	style:background-color={isMultiSelect
		? 'var(--agentation-color-green)'
		: 'var(--agentation-color-accent)'}
>
	<IconPlus size={12} />
</div>

<!-- DIVERGENCE(upstream): `styles.module.scss` → scoped `<style>`; only the subset this
component applies is carried (the marker base + `.pending`/`.multiSelect`/enter/exit; no
`.hovered`/`.fixed`/`.renumber`/tooltip — those belong to the sibling markers). See
`AnnotationMarker.svelte` for the SCSS-flattening notes. -->
<style>
	@keyframes markerIn {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.3);
		}
		100% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}

	@keyframes markerOut {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.3);
		}
	}

	.marker {
		position: absolute;
		width: 22px;
		height: 22px;
		background: var(--agentation-color-blue);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6875rem;
		font-weight: 600;
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
		cursor: pointer;
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.2),
			inset 0 0 0 1px rgba(0, 0, 0, 0.04);
		user-select: none;
		will-change: transform, opacity;
		contain: layout style;
		z-index: 1;
	}

	.marker.enter {
		animation: markerIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.marker.exit {
		animation: markerOut 0.2s ease-out both;
		pointer-events: none;
	}

	.marker.pending {
		position: fixed;
		background-color: var(--agentation-color-blue);
		cursor: default;
	}

	.marker.multiSelect {
		background-color: var(--agentation-color-green);
		width: 26px;
		height: 26px;
		border-radius: 6px;
		font-size: 0.75rem;
	}

	.marker.multiSelect.pending {
		background-color: var(--agentation-color-green);
	}
</style>
