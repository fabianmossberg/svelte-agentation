<script module lang="ts">
	// Ports the `AnnotationMarker` component from upstream
	// `package/src/components/page-toolbar-css/annotation-marker/index.tsx` L1–143.
	//
	// DIVERGENCE(upstream): upstream declares `AnnotationMarker`, `PendingMarker`
	// and `ExitingMarker` in a single `index.tsx`. Svelte allows one component per
	// file, so each becomes its own `.svelte` file re-exported under its upstream
	// name by the `index.ts` barrel (same shape as the `icons/` port). The shared
	// `styles.module.scss` becomes a per-component scoped style block carrying only the
	// subset of classes that component applies (Svelte's per-component hashing +
	// scoped `@keyframes` mean styles can't be shared across files).
	import type { Annotation } from '../../../types';

	// DIVERGENCE(upstream): upstream declares `MarkerClickBehavior` at module scope
	// in `index.tsx`. Exported here (and re-exported by the barrel) under the same name.
	export type MarkerClickBehavior = 'edit' | 'delete';

	// DIVERGENCE(upstream): `tooltipStyle?: React.CSSProperties` → `string` (the Svelte
	// `style={...}` idiom — the toolbar passes the computed position string in p2-09),
	// matching the `annotation-popup` port's treatment of `style`. React callback props
	// keep their upstream names/signatures.
	export interface AnnotationMarkerProps {
		annotation: Annotation;
		globalIndex: number;
		/** Display index within this layer (for staggered animation delays) */
		layerIndex: number;
		layerSize: number;
		isExiting: boolean;
		isClearing: boolean;
		isAnimated: boolean;
		isHovered: boolean;
		isDeleting: boolean;
		isEditingAny: boolean;
		renumberFrom: number | null;
		markerClickBehavior: MarkerClickBehavior;
		tooltipStyle?: string;
		onHoverEnter: (annotation: Annotation) => void;
		onHoverLeave: () => void;
		onClick: (annotation: Annotation) => void;
		onContextMenu?: (annotation: Annotation) => void;
	}
</script>

<script lang="ts">
	import { IconEdit, IconXmark } from '../../icons';

	let {
		annotation,
		globalIndex,
		layerIndex,
		layerSize,
		isExiting,
		isClearing,
		isAnimated,
		isHovered,
		isDeleting,
		isEditingAny,
		renumberFrom,
		markerClickBehavior,
		tooltipStyle,
		onHoverEnter,
		onHoverLeave,
		onClick,
		onContextMenu
	}: AnnotationMarkerProps = $props();

	const showDeleteState = $derived((isHovered || isDeleting) && !isEditingAny);
	const showDeleteHover = $derived(showDeleteState && markerClickBehavior === 'delete');
	const isMulti = $derived(annotation.isMultiSelect);

	const markerColor = $derived(
		isMulti ? 'var(--agentation-color-green)' : 'var(--agentation-color-accent)'
	);

	// DIVERGENCE(upstream): upstream's `animClass` (a single `styles.*` string) →
	// three `class:` directives below. The selection priority is identical:
	// exit ▸ clearing ▸ enter (only when not yet animated).
	const isEnter = $derived(!isExiting && !isClearing && !isAnimated);
	const isClearingAnim = $derived(!isExiting && isClearing);

	const animationDelay = $derived(
		isExiting ? `${(layerSize - 1 - layerIndex) * 20}ms` : `${layerIndex * 20}ms`
	);

	const showRenumber = $derived(renumberFrom !== null && globalIndex >= renumberFrom);

	// DIVERGENCE(upstream): the inline `selectedText` quote built in upstream's JSX
	// (element + optional ` "<slice>"`) hoisted to a derived so the markup stays terse.
	const quoteSuffix = $derived(
		annotation.selectedText
			? ` "${annotation.selectedText.slice(0, 30)}${annotation.selectedText.length > 30 ? '...' : ''}"`
			: ''
	);

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		if (!isExiting) onClick(annotation);
	}

	// DIVERGENCE(upstream): upstream passes `undefined` for `onContextMenu` when the
	// prop is absent. Here the handler always exists but no-ops unless the prop is set
	// and the behavior is `delete` — same observable contract.
	function handleContextMenu(e: MouseEvent) {
		if (onContextMenu && markerClickBehavior === 'delete') {
			e.preventDefault();
			e.stopPropagation();
			if (!isExiting) onContextMenu(annotation);
		}
	}
</script>

<!-- DIVERGENCE(upstream): React `className` concat → `class:` directives; `style` object
→ `style:` directives (React appends `px` to a numeric `top`; Svelte sets it explicitly).
`backgroundColor` is left unset while hovering-to-delete so the `.hovered` red rule wins,
matching upstream's `undefined`. `data-annotation-marker` kept verbatim (NOT
`data-feedback-toolbar`): it is the attribute upstream uses, it is already in
`freeze-animations`' `EXCLUDE_ATTRS` (freeze-exclusion holds), and the marker layer the
toolbar mounts these into (p2-09) carries `data-feedback-toolbar` itself. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<!-- Marker is a plain clickable div, exactly as upstream — keyboard interaction is not
part of upstream's marker contract (the toolbar list provides the accessible path). -->
<div
	class="marker"
	class:multiSelect={isMulti}
	class:enter={isEnter}
	class:exit={isExiting}
	class:clearing={isClearingAnim}
	class:hovered={showDeleteHover}
	data-annotation-marker
	style:left={`${annotation.x}%`}
	style:top={`${annotation.y}px`}
	style:background-color={showDeleteHover ? undefined : markerColor}
	style:animation-delay={animationDelay}
	onmouseenter={() => onHoverEnter(annotation)}
	onmouseleave={onHoverLeave}
	onclick={handleClick}
	oncontextmenu={handleContextMenu}
>
	{#if showDeleteState}
		{#if showDeleteHover}
			<IconXmark size={isMulti ? 18 : 16} />
		{:else}
			<IconEdit size={16} />
		{/if}
	{:else}
		<span class:renumber={showRenumber}>{globalIndex + 1}</span>
	{/if}

	{#if isHovered && !isEditingAny}
		<div class="markerTooltip enter" style={tooltipStyle}>
			<span class="markerQuote">{annotation.element}{quoteSuffix}</span>
			<span class="markerNote">{annotation.comment}</span>
		</div>
	{/if}
</div>

<!-- DIVERGENCE(upstream): `styles.module.scss` → scoped `<style>`; class names kept
verbatim, SCSS `&` nesting flattened to plain CSS (no preprocessor in this repo), the
per-component Svelte hash replacing the CSS-module hash. Only the subset this component
applies is carried (no `.pending`/`.fixed` — those belong to the sibling markers). The
`[data-agentation-theme="light"]` ancestor selector (the theme attribute lives on the
toolbar root, outside this component's scope) is wrapped in `:global(...)` so the rightmost
classes stay scoped — same treatment as the checkbox/switch ports. -->
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

	@keyframes tooltipIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(2px) scale(0.891);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(0.909);
		}
	}

	@keyframes renumberRoll {
		0% {
			transform: translateX(-40%);
			opacity: 0;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
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

	.marker:hover {
		z-index: 2;
	}

	.marker:not(.enter):not(.exit):not(.clearing) {
		transition:
			background-color 0.15s ease,
			transform 0.1s ease;
	}

	.marker.enter {
		animation: markerIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.marker.exit {
		animation: markerOut 0.2s ease-out both;
		pointer-events: none;
	}

	.marker.clearing {
		animation: markerOut 0.15s ease-out both;
		pointer-events: none;
	}

	.marker:not(.enter):not(.exit):not(.clearing):hover {
		transform: translate(-50%, -50%) scale(1.1);
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

	.renumber {
		display: block;
		animation: renumberRoll 0.2s ease-out;
	}

	.markerTooltip {
		position: absolute;
		top: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%) scale(0.909);
		z-index: 100002;
		background: #1a1a1a;
		padding: 8px 0.75rem;
		border-radius: 0.75rem;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		font-weight: 400;
		color: #fff;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.3),
			0 0 0 1px rgba(255, 255, 255, 0.08);
		min-width: 120px;
		max-width: 200px;
		pointer-events: none;
		cursor: default;
	}

	.markerTooltip.enter {
		animation: tooltipIn 0.1s ease-out forwards;
	}

	.markerQuote {
		display: block;
		font-size: 12px;
		font-style: italic;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.3125rem;
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.markerNote {
		display: block;
		font-size: 13px;
		font-weight: 400;
		line-height: 1.4;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding-bottom: 2px;
	}

	/* Light mode overrides */
	:global([data-agentation-theme='light']) .markerTooltip {
		background: #fff;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.12),
			0 0 0 1px rgba(0, 0, 0, 0.06);
	}

	:global([data-agentation-theme='light']) .markerTooltip .markerQuote {
		color: rgba(0, 0, 0, 0.5);
	}

	:global([data-agentation-theme='light']) .markerTooltip .markerNote {
		color: rgba(0, 0, 0, 0.85);
	}
</style>
