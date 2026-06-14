<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	// DIVERGENCE(upstream): React's `className` prop + `...props` spread (typed
	// `React.InputHTMLAttributes<HTMLInputElement>`) become a Svelte `class` prop
	// (renamed at destructure since `class` is reserved) + `{...rest}` spread onto
	// the native <input>. `class` styles the container; `rest` (checked, onchange,
	// disabled, …) passes through to the input, preserving upstream's passthrough.
	let { class: className = '', ...rest }: HTMLInputAttributes = $props();
</script>

<div class="switchContainer {className}">
	<input class="switchInput" type="checkbox" {...rest} />
	<div class="switchThumb"></div>
</div>

<!-- DIVERGENCE(upstream): styles.module.scss → scoped <style>. Class names are
preserved verbatim; Svelte's per-component hashing replaces the CSS-module hashing.
The SCSS `&` nesting is flattened to plain CSS (no preprocessor in this repo), and
the `[data-agentation-theme="dark"] &` ancestor selector — the theme attribute lives
on the toolbar root, outside this component — is wrapped in `:global(...)` so Svelte
reaches that out-of-scope ancestor; the rightmost class stays scoped, so nothing leaks. -->
<style>
	.switchContainer {
		display: flex;
		align-items: center;
		position: relative;
		padding: 2px;
		width: 24px;
		height: 16px;
		border-radius: 8px;
		background-color: #cdcdcd;
		transition:
			background-color 0.15s,
			opacity 0.15s;
	}

	:global([data-agentation-theme='dark']) .switchContainer {
		background-color: #484848;
	}

	.switchContainer:has(.switchInput:checked) {
		background-color: var(--agentation-color-blue);
	}

	.switchContainer:has(.switchInput:disabled) {
		opacity: 0.3;
	}

	.switchInput {
		position: absolute;
		z-index: 1;
		inset: 0;
		border-radius: inherit;
		opacity: 0;
		cursor: pointer;
	}

	.switchInput:disabled {
		cursor: not-allowed;
	}

	.switchThumb {
		border-radius: 50%;
		width: 12px;
		height: 12px;
		background-color: #fff;
		transition: transform 0.15s;
	}

	.switchContainer:has(.switchInput:checked) .switchThumb {
		transform: translateX(8px);
	}
</style>
