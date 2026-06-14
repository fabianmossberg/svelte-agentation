<script module lang="ts">
	// Ports the `ExitingMarker` component from upstream
	// `package/src/components/page-toolbar-css/annotation-marker/index.tsx` L176–190.
	// See `AnnotationMarker.svelte` for the one-file-per-component rationale.
	import type { Annotation } from '../../../types';

	export interface ExitingMarkerProps {
		annotation: Annotation;
		fixed?: boolean;
	}
</script>

<script lang="ts">
	import { IconXmark } from '../../icons';

	let { annotation, fixed }: ExitingMarkerProps = $props();

	const isMulti = $derived(annotation.isMultiSelect);
</script>

<!-- DIVERGENCE(upstream): React `className` concat → `class:` directives; `style` object
→ `style:` directives (React appends `px` to a numeric `top`; Svelte sets it explicitly).
This is the delete-animation "ghost" — always `.hovered` (red) + `.exit`. `data-annotation-marker`
kept verbatim (see `AnnotationMarker.svelte`). -->
<div
	class="marker hovered exit"
	class:fixed
	class:multiSelect={isMulti}
	data-annotation-marker
	style:left={`${annotation.x}%`}
	style:top={`${annotation.y}px`}
>
	<IconXmark size={isMulti ? 12 : 10} />
</div>

<!-- DIVERGENCE(upstream): `styles.module.scss` → scoped `<style>`; only the subset this
component applies is carried (marker base + `.exit`/`.fixed`/`.hovered`/`.multiSelect`).
The interactive `:hover`/transition rules are omitted — this ghost has `pointer-events: none`
via `.exit`, so they are inert. See `AnnotationMarker.svelte` for the SCSS-flattening notes. -->
<style>
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

	.marker.exit {
		animation: markerOut 0.2s ease-out both;
		pointer-events: none;
	}

	.marker.fixed {
		position: fixed;
	}

	.marker.multiSelect {
		background-color: var(--agentation-color-green);
		width: 26px;
		height: 26px;
		border-radius: 6px;
		font-size: 0.75rem;
	}

	.marker.hovered {
		background-color: var(--agentation-color-red);
	}
</style>
