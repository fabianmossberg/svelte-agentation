<script module lang="ts">
	// =============================================================================
	// Page toolbar — body-mount entry point
	// =============================================================================
	//
	// Ports the *portal* of upstream `package/src/components/page-toolbar-css/index.tsx`
	// (the `createPortal(jsx, document.body)` at L3565/L4705). Svelte has no portal
	// primitive; the issue (#24) calls for `mount()` as the substitute. A component
	// can't `mount()` itself, so the port splits in two:
	//   - this file: the public component a host renders anywhere. On mount it
	//     `mount()`s the real UI (`Toolbar.svelte`) into `document.body`, and
	//     `unmount()`s it on teardown — the React-portal lifecycle, by hand.
	//   - `Toolbar.svelte`: the actual shell + controllers + all reactive state.
	//
	// Keeping every rune inside `Toolbar.svelte` matters: `mount()` does NOT make
	// its `props` reactive, so any state shared by the shell must live in the
	// mounted tree, not be threaded across the boundary as plain props.
	import type { Annotation } from '../../types';

	// The public prop surface — mirrors upstream `page-toolbar-css/index.tsx`
	// L282–315 (issue #26). Field names and signatures are kept identical to
	// upstream so `import { Agentation } from "svelte-agentation"` is a drop-in of
	// `import { Agentation } from "agentation"`; React types are translated to
	// their TS equivalents. The Phase-2 subset (`copyToClipboard`, `className`,
	// the annotation callbacks, `onCopy`) is wired in `Toolbar.svelte`; the rest
	// are declared and inert until the phase noted in each doc comment.

	/**
	 * A scripted annotation used to demo the toolbar without user interaction.
	 * Inert until Phase 5 (demo mode audit); declared now for prop-surface parity.
	 */
	export type DemoAnnotation = {
		selector: string;
		comment: string;
		selectedText?: string;
	};

	export type PageFeedbackToolbarCSSProps = {
		/** Scripted annotations for demo mode. Inert until Phase 5 (demo mode audit). */
		demoAnnotations?: DemoAnnotation[];
		/** Delay between scripted demo annotations, ms. Inert until Phase 5. */
		demoDelay?: number;
		/** Enable scripted demo playback. Inert until Phase 5. */
		enableDemoMode?: boolean;
		/** Callback fired when an annotation is added. */
		onAnnotationAdd?: (annotation: Annotation) => void;
		/** Callback fired when an annotation is deleted. */
		onAnnotationDelete?: (annotation: Annotation) => void;
		/** Callback fired when an annotation comment is edited. */
		onAnnotationUpdate?: (annotation: Annotation) => void;
		/** Callback fired when all annotations are cleared. Receives the annotations that were cleared. */
		onAnnotationsClear?: (annotations: Annotation[]) => void;
		/** Callback fired when the copy button is clicked. Receives the markdown output. */
		onCopy?: (markdown: string) => void;
		/** Callback fired when "Send to Agent" is clicked. Receives the markdown output and annotations. Inert until Phase 4 (send). */
		onSubmit?: (output: string, annotations: Annotation[]) => void;
		/** Whether to copy to clipboard when the copy button is clicked. Defaults to true. */
		copyToClipboard?: boolean;
		/** Server URL for sync (e.g., "http://localhost:4747"). If not provided, uses localStorage only. Inert until Phase 4 (server sync). */
		endpoint?: string;
		/** Pre-existing session ID to join. If not provided with endpoint, creates a new session. Inert until Phase 4. */
		sessionId?: string;
		/** Called when a new session is created (only when endpoint is provided without sessionId). Inert until Phase 4. */
		onSessionCreated?: (sessionId: string) => void;
		/** Webhook URL to receive annotation events. Inert until Phase 4 (webhook). */
		webhookUrl?: string;
		/**
		 * Custom class name applied to the toolbar container. Use to adjust
		 * positioning or z-index.
		 *
		 * DIVERGENCE(upstream): the prop keeps upstream's React name `className`
		 * (not Svelte's idiomatic `class`) — the compat contract is that consumers
		 * pass the *same* prop they would to the React `agentation` package, so
		 * `<Agentation className="…" />` is a drop-in. See CLAUDE.md non-negotiable #2.
		 */
		className?: string;
	};

	/** Alias for PageFeedbackToolbarCSSProps. */
	export type AgentationProps = PageFeedbackToolbarCSSProps;
</script>

<script lang="ts">
	import { mount, unmount, onMount } from 'svelte';
	import Toolbar from './Toolbar.svelte';

	// Forwarded whole (not field-by-field): the surface is now 15 props, and the
	// toolbar's reactive state lives in `Toolbar`, so passing the bag once at
	// mount is sufficient (see the module comment). `mount()` props are not
	// reactive across the boundary, but these are configuration + callbacks set
	// once at host-render, not live state.
	// Rest pattern (`{ ...props }`, not a bare `props`) so every field counts as
	// consumed here even though we forward them wholesale — otherwise each typed
	// member trips `svelte/no-unused-props` (this thin portal wrapper deliberately
	// uses none of them itself; `Toolbar.svelte` does).
	let { ...props }: PageFeedbackToolbarCSSProps = $props();

	// DIVERGENCE(upstream): React renders the portal during render; we defer the
	// `mount()` to `onMount` so it is browser-only (SSR-safe — `document` is
	// guaranteed) and so the cleanup that `unmount()`s the UI is tied to this
	// component's lifecycle, exactly like the portal unmounting with its owner.
	onMount(() => {
		const app = mount(Toolbar, { target: document.body, props });
		return () => unmount(app);
	});
</script>
