<script module lang="ts">
	// DIVERGENCE(upstream): upstream's module-scope helper lives in a Svelte
	// `<script module>` block (runs once, shared across instances) — same scope
	// upstream's bare `function focusBypassingTraps` had.

	/** Focus an element while temporarily blocking focus-trap libraries (e.g. Radix
	 *  FocusScope) from reclaiming focus via focusin/focusout handlers. */
	function focusBypassingTraps(el: HTMLElement | null) {
		if (!el) return;
		const trap = (e: Event) => e.stopImmediatePropagation();
		document.addEventListener('focusin', trap, true);
		document.addEventListener('focusout', trap, true);
		try {
			el.focus();
		} finally {
			document.removeEventListener('focusin', trap, true);
			document.removeEventListener('focusout', trap, true);
		}
	}

	// =============================================================================
	// Types
	// =============================================================================

	// DIVERGENCE(upstream): `AnnotationPopupCSSProps` field names/semantics kept
	// verbatim; React types translated — `onSubmit`/`onCancel`/`onDelete` stay as
	// function props, `style?: React.CSSProperties` becomes a CSS *string* (the
	// idiom for a Svelte `style={...}` attribute; the toolbar passes `left`/`top`
	// as a string in p2-09), and `computedStyles` keeps `Record<string,string>`.
	export interface AnnotationPopupCSSProps {
		/** Element name to display in header */
		element: string;
		/** Optional timestamp display (e.g., "@ 1.23s" for animation feedback) */
		timestamp?: string;
		/** Optional selected/highlighted text */
		selectedText?: string;
		/** Placeholder text for the textarea */
		placeholder?: string;
		/** Initial value for textarea (for edit mode) */
		initialValue?: string;
		/** Label for submit button (default: "Add") */
		submitLabel?: string;
		/** Called when annotation is submitted with text */
		onSubmit: (text: string) => void;
		/** Called when popup is cancelled/dismissed */
		onCancel: () => void;
		/** Called when delete button is clicked (only shown if provided) */
		onDelete?: () => void;
		/** Position styles (left, top) */
		style?: string;
		/** Custom color for submit button and textarea focus (hex) */
		accentColor?: string;
		/** External exit state (parent controls exit animation) */
		isExiting?: boolean;
		/** Light mode styling */
		lightMode?: boolean;
		/** Computed styles for the selected element */
		computedStyles?: Record<string, string>;
	}

	// DIVERGENCE(upstream): the React `AnnotationPopupCSSHandle` interface
	// (`{ shake: () => void }`) is replaced by the exported instance function
	// `shake()` below — the Svelte idiom for `forwardRef`/`useImperativeHandle`.
	// The parent captures it via `bind:this` and calls `popup.shake()`.
</script>

<script lang="ts">
	import { IconTrash } from '../icons';
	import { originalSetTimeout } from '../../utils/freeze-animations';

	let {
		element,
		timestamp,
		selectedText,
		placeholder = 'What should change?',
		initialValue = '',
		submitLabel = 'Add',
		onSubmit,
		onCancel,
		onDelete,
		style,
		accentColor = '#3c82f7',
		isExiting = false,
		lightMode = false,
		computedStyles
	}: AnnotationPopupCSSProps = $props();

	// DIVERGENCE(upstream): React `useState` → `$state`; `useRef` → `bind:this` /
	// plain locals. Same fields, same semantics. (Upstream's `popupRef` is set but
	// never read, so it is dropped.) `$state(initialValue)` intentionally captures
	// the prop's initial value once, exactly like upstream's `useState(initialValue)`.
	// svelte-ignore state_referenced_locally
	let text = $state(initialValue);
	let isShaking = $state(false);
	let animState = $state<'initial' | 'enter' | 'entered' | 'exit'>('initial');
	let isFocused = $state(false);
	let isStylesExpanded = $state(false); // Computed styles accordion state
	let textareaEl: HTMLTextAreaElement | null = null;
	let cancelTimer: ReturnType<typeof originalSetTimeout> | null = null;
	let shakeTimer: ReturnType<typeof originalSetTimeout> | null = null;

	// DIVERGENCE(upstream): the `computedStyles` truthiness guard is read twice in
	// upstream's JSX; hoisted to a single `$derived` here.
	const hasComputedStyles = $derived(!!computedStyles && Object.keys(computedStyles).length > 0);

	// Sync with parent exit state
	// DIVERGENCE(upstream): `useEffect([isExiting, animState])` → `$effect`.
	$effect(() => {
		if (isExiting && animState !== 'exit') {
			animState = 'exit';
		}
	});

	// Animate in on mount and focus textarea
	// DIVERGENCE(upstream): `useEffect(…, [])` → a mount `$effect` (runs once;
	// reads no reactive state). Timers use `originalSetTimeout` to bypass the
	// freeze patch, exactly as upstream.
	$effect(() => {
		// Start enter animation (use originalSetTimeout to bypass freeze patch)
		originalSetTimeout(() => {
			animState = 'enter';
		}, 0);
		// Transition to entered state after animation completes
		const enterTimer = originalSetTimeout(() => {
			animState = 'entered';
		}, 200); // Match animation duration
		const focusTimer = originalSetTimeout(() => {
			const textarea = textareaEl;
			if (textarea) {
				focusBypassingTraps(textarea);
				textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
				textarea.scrollTop = textarea.scrollHeight;
			}
		}, 50);
		return () => {
			clearTimeout(enterTimer);
			clearTimeout(focusTimer);
			if (cancelTimer) clearTimeout(cancelTimer);
			if (shakeTimer) clearTimeout(shakeTimer);
		};
	});

	// Shake animation
	// DIVERGENCE(upstream): React's `useCallback` shake exposed through
	// `useImperativeHandle` becomes an exported instance function — the parent
	// calls it via `bind:this` (see the type comment above).
	export function shake() {
		if (shakeTimer) clearTimeout(shakeTimer);
		isShaking = true;
		shakeTimer = originalSetTimeout(() => {
			isShaking = false;
			focusBypassingTraps(textareaEl);
		}, 250);
	}

	// Handle cancel with exit animation
	function handleCancel() {
		animState = 'exit';
		cancelTimer = originalSetTimeout(() => {
			onCancel();
		}, 150); // Match exit animation duration
	}

	// Handle submit
	function handleSubmit() {
		if (!text.trim()) return;
		onSubmit(text.trim());
	}

	// Handle keyboard
	function handleKeyDown(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.isComposing) return;
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === 'Escape') {
			handleCancel();
		}
	}

	function toggleStyles() {
		const wasExpanded = isStylesExpanded;
		isStylesExpanded = !isStylesExpanded;
		if (wasExpanded) {
			// Refocus textarea when closing
			originalSetTimeout(() => focusBypassingTraps(textareaEl), 0);
		}
	}

	// DIVERGENCE(upstream): upstream maps `key.replace(/([A-Z])/g, "-$1").toLowerCase()`
	// inline in JSX; kept as a helper so the markup `{@const}` stays terse.
	function toKebab(key: string): string {
		return key.replace(/([A-Z])/g, '-$1').toLowerCase();
	}
</script>

<!-- DIVERGENCE(upstream): React `className` string-concat → Svelte `class:` directives;
`data-annotation-popup` kept verbatim (NOT `data-feedback-toolbar`) — it is the attribute
upstream uses on this element, it is already in `freeze-animations`' `EXCLUDE_ATTRS` (so the
freeze-exclusion contract holds), and `design-mode/rearrange.tsx` keys on it specifically.
`onClick={(e) => e.stopPropagation()}` → `onclick`. `style={style}` passes the position string. -->
<div
	class="popup"
	class:light={lightMode}
	class:enter={animState === 'enter'}
	class:entered={animState === 'entered'}
	class:exit={animState === 'exit'}
	class:shake={isShaking}
	data-annotation-popup
	{style}
	onclick={(e) => e.stopPropagation()}
	role="presentation"
>
	<div class="header">
		{#if hasComputedStyles}
			<button class="headerToggle" onclick={toggleStyles} type="button">
				<svg
					class="chevron"
					class:expanded={isStylesExpanded}
					width="14"
					height="14"
					viewBox="0 0 14 14"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M5.5 10.25L9 7.25L5.75 4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span class="element">{element}</span>
			</button>
		{:else}
			<span class="element">{element}</span>
		{/if}
		{#if timestamp}<span class="timestamp">{timestamp}</span>{/if}
	</div>

	<!-- Collapsible computed styles section - uses grid-template-rows for smooth animation -->
	{#if hasComputedStyles}
		<div class="stylesWrapper" class:expanded={isStylesExpanded}>
			<div class="stylesInner">
				<div class="stylesBlock">
					{#each Object.entries(computedStyles ?? {}) as [key, value] (key)}
						<div class="styleLine">
							<span class="styleProperty">{toKebab(key)}</span>:
							<span class="styleValue">{value}</span>;
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if selectedText}
		<div class="quote">
			&ldquo;{selectedText.slice(0, 80)}{selectedText.length > 80 ? '...' : ''}&rdquo;
		</div>
	{/if}

	<!-- DIVERGENCE(upstream): React controlled `value`/`onChange` → `bind:value`; the
	inline `borderColor: isFocused ? accentColor : undefined` focus tint → a `style:`
	directive (CSS `:focus` rule below is the static fallback, overridden by the inline
	accent exactly as upstream). `onChange`→`oninput` is implicit in `bind:value`. -->
	<textarea
		bind:this={textareaEl}
		class="textarea"
		style:border-color={isFocused ? accentColor : undefined}
		{placeholder}
		bind:value={text}
		onfocus={() => (isFocused = true)}
		onblur={() => (isFocused = false)}
		rows="2"
		onkeydown={handleKeyDown}
	></textarea>

	<div class="actions">
		{#if onDelete}
			<div class="deleteWrapper">
				<button class="deleteButton" onclick={onDelete} type="button">
					<IconTrash size={22} />
				</button>
			</div>
		{/if}
		<button class="cancel" onclick={handleCancel}>Cancel</button>
		<button
			class="submit"
			style:background-color={accentColor}
			style:opacity={text.trim() ? 1 : 0.4}
			onclick={handleSubmit}
			disabled={!text.trim()}
		>
			{submitLabel}
		</button>
	</div>
</div>

<!-- DIVERGENCE(upstream): `styles.module.scss` → scoped `<style>`. Class names kept
verbatim; SCSS `&` nesting flattened to plain CSS (no preprocessor in this repo) and
the per-component Svelte hash replaces the CSS-module hash. The `.popup svg[fill="none"]`
guard (upstream issue #58), the shake/enter/exit keyframes, and the grid-rows accordion
are preserved. Dropped: the `.textarea.green:focus` rule — no element ever receives a
`green` class in this component (upstream's too is dead; the green focus border is produced
at runtime via the inline `accentColor`), so keeping it would only trip Svelte's
unused-CSS-selector warning. -->
<style>
	/* Protect stroke-based icons from host page `svg { fill: currentColor }` rules.
	   Scoped to agentation's own containers to avoid breaking host SVGs that use
	   fill="none" with CSS-based fills (e.g. Tailwind's fill-current).
	   See: https://github.com/benjitaylor/agentation/issues/58 */
	.popup svg[fill='none'] {
		fill: none !important;
	}

	.popup svg[fill='none'] :not([fill]) {
		fill: none !important;
	}

	/* =============================================================================
	   Animation Keyframes
	   ============================================================================= */

	@keyframes popupEnter {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(0.95) translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1) translateY(0);
		}
	}

	@keyframes popupExit {
		from {
			opacity: 1;
			transform: translateX(-50%) scale(1) translateY(0);
		}
		to {
			opacity: 0;
			transform: translateX(-50%) scale(0.95) translateY(4px);
		}
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(-50%) scale(1) translateY(0) translateX(0);
		}
		20% {
			transform: translateX(-50%) scale(1) translateY(0) translateX(-3px);
		}
		40% {
			transform: translateX(-50%) scale(1) translateY(0) translateX(3px);
		}
		60% {
			transform: translateX(-50%) scale(1) translateY(0) translateX(-2px);
		}
		80% {
			transform: translateX(-50%) scale(1) translateY(0) translateX(2px);
		}
	}

	/* =============================================================================
	   Popup Container
	   ============================================================================= */

	.popup {
		position: fixed;
		transform: translateX(-50%);
		width: 280px;
		padding: 0.75rem 1rem 14px;
		background: #1a1a1a;
		border-radius: 16px;
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.3),
			0 0 0 1px rgba(255, 255, 255, 0.08);
		z-index: 100001;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		will-change: transform, opacity;

		/* Initial state (before animation) */
		opacity: 0;
	}

	.popup.enter {
		animation: popupEnter 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	/* After enter animation completes, set stable state */
	.popup.entered {
		opacity: 1;
		transform: translateX(-50%) scale(1) translateY(0);
	}

	.popup.exit {
		animation: popupExit 0.15s ease-in forwards;
	}

	/* Shake needs entered state to be stable first */
	.popup.entered.shake {
		animation: shake 0.25s ease-out;
	}

	/* =============================================================================
	   Header
	   ============================================================================= */

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5625rem;
	}

	.element {
		font-size: 0.75rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.5);
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.headerToggle {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.headerToggle .element {
		flex: 1;
	}

	/* Chevron icon that rotates when computed styles are expanded */
	.chevron {
		color: rgba(255, 255, 255, 0.5);
		transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); /* Matches FAQ accordion easing */
		flex-shrink: 0;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	/* =============================================================================
	   Computed Styles Block
	   ============================================================================= */

	/* Accordion animation using grid-template-rows technique for smooth height transitions
	   See: https://css-tricks.com/css-grid-can-do-auto-height-transitions/ */
	.stylesWrapper {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1); /* Matches FAQ accordion easing */
	}

	.stylesWrapper.expanded {
		grid-template-rows: 1fr;
	}

	/* Inner container with overflow:hidden is required for the grid animation to work */
	.stylesInner {
		overflow: hidden;
	}

	/* Code-block styling for computed CSS properties display */
	.stylesBlock {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.375rem;
		padding: 0.5rem 0.625rem;
		margin-bottom: 0.5rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.6875rem;
		line-height: 1.5;
	}

	.styleLine {
		color: rgba(255, 255, 255, 0.85);
		word-break: break-word;
	}

	/* Syntax highlighting colors (purple for properties, light for values) */
	.styleProperty {
		color: #c792ea;
	}

	.styleValue {
		color: rgba(255, 255, 255, 0.85);
	}

	.timestamp {
		font-size: 0.625rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.35);
		font-variant-numeric: tabular-nums;
		margin-left: 0.5rem;
		flex-shrink: 0;
	}

	/* =============================================================================
	   Quote
	   ============================================================================= */

	.quote {
		font-size: 12px;
		font-style: italic;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.5rem;
		padding: 0.4rem 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.25rem;
		line-height: 1.45;
	}

	/* =============================================================================
	   Textarea
	   ============================================================================= */

	.textarea {
		box-sizing: border-box;
		width: 100%;
		padding: 0.5rem 0.625rem;
		font-size: 0.8125rem;
		font-family: inherit;
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		resize: none;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.textarea:focus {
		border-color: var(--agentation-color-blue);
	}

	.textarea::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.textarea::-webkit-scrollbar {
		width: 6px;
	}

	.textarea::-webkit-scrollbar-track {
		background: transparent;
	}

	.textarea::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	/* =============================================================================
	   Actions
	   ============================================================================= */

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.375rem;
		margin-top: 0.5rem;
	}

	.cancel,
	.submit {
		padding: 0.4rem 0.875rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 1rem;
		border: none;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			opacity 0.15s ease;
	}

	.cancel {
		background: transparent;
		color: rgba(255, 255, 255, 0.5);
	}

	.cancel:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.submit {
		color: white;
	}

	.submit:hover:not(:disabled) {
		filter: brightness(0.9);
	}

	.submit:disabled {
		cursor: not-allowed;
	}

	/* Delete button wrapper */
	.deleteWrapper {
		margin-right: auto;
	}

	.deleteButton {
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.4);
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			transform 0.1s ease;
	}

	.deleteButton:hover {
		background-color: color-mix(in srgb, var(--agentation-color-red) 25%, transparent);
		color: var(--agentation-color-red);
	}

	.deleteButton:active {
		transform: scale(0.92);
	}

	/* =============================================================================
	   Light Mode
	   ============================================================================= */

	.light.popup {
		background: #fff;
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.12),
			0 0 0 1px rgba(0, 0, 0, 0.06);
	}

	.light .element {
		color: rgba(0, 0, 0, 0.6);
	}

	.light .timestamp {
		color: rgba(0, 0, 0, 0.4);
	}

	.light .chevron {
		color: rgba(0, 0, 0, 0.4);
	}

	.light .stylesBlock {
		background: rgba(0, 0, 0, 0.03);
	}

	.light .styleLine {
		color: rgba(0, 0, 0, 0.75);
	}

	.light .styleProperty {
		color: #7c3aed;
	}

	.light .styleValue {
		color: rgba(0, 0, 0, 0.75);
	}

	.light .quote {
		color: rgba(0, 0, 0, 0.55);
		background: rgba(0, 0, 0, 0.04);
	}

	.light .textarea {
		background: rgba(0, 0, 0, 0.03);
		color: #1a1a1a;
		border-color: rgba(0, 0, 0, 0.12);
	}

	.light .textarea::placeholder {
		color: rgba(0, 0, 0, 0.4);
	}

	.light .textarea::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.15);
	}

	.light .cancel {
		color: rgba(0, 0, 0, 0.5);
	}

	.light .cancel:hover {
		background: rgba(0, 0, 0, 0.06);
		color: rgba(0, 0, 0, 0.75);
	}

	.light .deleteButton {
		color: rgba(0, 0, 0, 0.4);
	}

	.light .deleteButton:hover {
		background-color: color-mix(in srgb, var(--agentation-color-red) 25%, transparent);
		color: var(--agentation-color-red);
	}
</style>
