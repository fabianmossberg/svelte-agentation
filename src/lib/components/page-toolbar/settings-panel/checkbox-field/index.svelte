<script lang="ts">
	// Ports upstream `package/src/components/page-toolbar-css/settings-panel/checkbox-field/index.tsx`.
	import type { HTMLAttributes, HTMLInputAttributes } from 'svelte/elements';
	import Checkbox from '../../../checkbox/index.svelte';
	import HelpTooltip from '../../../help-tooltip/index.svelte';

	// DIVERGENCE(upstream): React's `CheckboxFieldProps extends
	// React.HTMLAttributes<HTMLDivElement>` (with `...props` spread onto the
	// container) → `HTMLAttributes<HTMLDivElement>` rest-spread. `onChange` is
	// narrowed to the input handler upstream, so we `Omit` the div's own
	// `onchange` and re-add the input one (avoids a structural clash). `className`
	// → `class` (reserved word, renamed at destructure).
	interface CheckboxFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onchange'> {
		label: string;
		tooltip?: string;
		checked?: boolean;
		onchange?: HTMLInputAttributes['onchange'];
	}

	let {
		class: className = '',
		label,
		tooltip,
		checked,
		onchange,
		...rest
	}: CheckboxFieldProps = $props();

	// DIVERGENCE(upstream): React `useId()` → Svelte's `$props.id()` (same purpose:
	// a stable unique id tying the <label> to the <input> via `for`/`id`).
	const id = $props.id();
</script>

<div class="container {className}" {...rest}>
	<Checkbox {id} {onchange} {checked} />
	<label class="label" for={id}>
		{label}
	</label>
	{#if tooltip}
		<HelpTooltip content={tooltip} />
	{/if}
</div>

<!-- DIVERGENCE(upstream): styles.module.scss → scoped <style>. Class names kept
verbatim, Svelte's per-component hashing replacing the CSS-module hashing. The
SCSS `&` nesting is flattened to plain CSS (no preprocessor in this repo), and the
`[data-agentation-theme="dark"] &` ancestor selector (the theme attribute lives on
the toolbar root, outside this component) is wrapped in `:global(...)` so the
rightmost class stays scoped — same treatment as the checkbox/switch ports. -->
<style>
	.container {
		display: flex;
		align-items: center;
		height: 24px;
	}

	.label {
		padding-inline: 8px 2px;
		line-height: 20px;
		font-size: 13px;
		letter-spacing: -0.15px;
		color: rgb(26 26 26 / 0.5);
		cursor: pointer;
	}

	:global([data-agentation-theme='dark']) .label {
		color: rgb(255 255 255 / 0.5);
	}
</style>
