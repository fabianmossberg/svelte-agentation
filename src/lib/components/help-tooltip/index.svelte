<script lang="ts">
	import Tooltip from '../tooltip/index.svelte';
	import { IconHelp } from '../icons';

	// DIVERGENCE(upstream): React props object → Svelte `$props()`. Same single
	// `content` prop, forwarded to <Tooltip>.
	let { content }: { content: string } = $props();
</script>

<!-- DIVERGENCE(upstream): `import Tooltip from "../tooltip"` (named React export)
becomes a default import of the `.svelte` component. `styles.tooltip`/`styles.tooltipIcon`
are passed as plain class strings onto child-component roots (<Tooltip>'s span and
<IconHelp>'s svg); since the classes land in *child* scopes, this component's scope hash
never reaches them, so the rules below must be `:global` (see <style> note). -->
<Tooltip class="agentation-help-tooltip" {content}>
	<IconHelp class="agentation-help-tooltip-icon" />
</Tooltip>

<!-- DIVERGENCE(upstream): styles.module.scss → `:global` scoped <style>. The classes
are applied to elements rendered by *child* components (<Tooltip>'s span, <IconHelp>'s
svg), so Svelte can't add this component's scope hash to them — scoped selectors would
be flagged unused and never match. Upstream's CSS-module already produced collision-proof
unique names (`index_tooltip__hash`); since the toolbar mounts into the host page's
<body> (no shadow DOM), a bare global `.tooltip` would leak onto the host. We restore
that collision-proofness by namespacing the names (`tooltip` → `agentation-help-tooltip`,
`tooltipIcon` → `agentation-help-tooltip-icon`) and wrapping each rule in `:global(...)`.
The SCSS `&` nesting is flattened; `[data-agentation-theme="light"] &` becomes a
descendant selector under the theme root. -->
<style>
	:global(.agentation-help-tooltip) {
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: help;
	}

	:global(.agentation-help-tooltip-icon) {
		transform: translateY(0.5px);
		color: #fff;
		opacity: 0.2;
		transition: opacity 0.15s ease;
		will-change: transform;
	}

	:global(.agentation-help-tooltip:hover .agentation-help-tooltip-icon) {
		opacity: 0.5;
	}

	:global([data-agentation-theme='light'] .agentation-help-tooltip-icon) {
		color: #000;
	}
</style>
