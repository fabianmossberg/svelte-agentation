<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	// DIVERGENCE(upstream): React's `className` prop + `...props` spread (typed
	// `React.InputHTMLAttributes<HTMLInputElement>`) become a Svelte `class` prop
	// (renamed at destructure since `class` is reserved) + `{...rest}` spread onto
	// the native <input>. `class` styles the container; `rest` (checked, onchange,
	// disabled, …) passes through to the input, preserving upstream's passthrough.
	let { class: className = '', ...rest }: HTMLInputAttributes = $props();
</script>

<div class="checkboxContainer {className}">
	<input class="checkboxInput" type="checkbox" {...rest} />
	<svg class="checkboxCheck" width="14" height="14" viewBox="0 0 14 14" fill="none">
		<path
			class="checkboxCheckPath"
			d="M3.94 7L6.13 9.19L10.5 4.81"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</div>

<!-- DIVERGENCE(upstream): styles.module.scss → scoped <style>. Class names are
preserved verbatim; Svelte's per-component hashing replaces the CSS-module hashing.
The SCSS `&` nesting is flattened to plain CSS (no preprocessor in this repo), and
the `[data-agentation-theme="dark"] &` ancestor selector — the theme attribute lives
on the toolbar root, outside this component — is wrapped in `:global(...)` so Svelte
reaches that out-of-scope ancestor; the rightmost class stays scoped, so nothing leaks. -->
<style>
	.checkboxContainer {
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		border: 1px solid rgb(26 26 26 / 0.2);
		border-radius: 4px;
		width: 14px;
		height: 14px;
		background-color: #fff;
		transition: background-color 0.2s ease;
	}

	:global([data-agentation-theme='dark']) .checkboxContainer {
		border-color: rgb(255 255 255 / 0.2);
		background-color: #252525;
	}

	.checkboxContainer:has(.checkboxInput:checked) {
		background-color: #1a1a1a;
	}

	:global([data-agentation-theme='dark']) .checkboxContainer:has(.checkboxInput:checked) {
		background-color: #fff;
	}

	.checkboxInput {
		position: absolute;
		z-index: 1;
		inset: -1px;
		border-radius: inherit;
		opacity: 0;
		cursor: pointer;
	}

	.checkboxCheck {
		color: #fafafa;
	}

	:global([data-agentation-theme='dark']) .checkboxCheck {
		color: #1a1a1a;
	}

	.checkboxCheckPath {
		stroke-dasharray: 9.29px;
		stroke-dashoffset: 9.29px;
		color: #fafafa;
		transition: stroke-dashoffset 0.1s ease;
	}

	:global([data-agentation-theme='dark']) .checkboxCheckPath {
		color: #1a1a1a;
	}

	.checkboxContainer:has(.checkboxInput:checked) .checkboxCheckPath {
		transition-duration: 0.2s;
		stroke-dashoffset: 0;
	}
</style>
