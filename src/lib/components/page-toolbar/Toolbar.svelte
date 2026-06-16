<script module lang="ts">
	// Plays the entrance animation only on the first toolbar mount of the page
	// load — not on SPA navigation / remounts (upstream module-scoped flag,
	// index.tsx L688–690). Module scope (not instance) so it survives remounts.
	let hasPlayedEntranceAnimation = false;
</script>

<script lang="ts">
	// =============================================================================
	// Toolbar — the page-toolbar UI shell (mounted into document.body via index.svelte)
	// =============================================================================
	//
	// Svelte rewrite of upstream's 4.7k-LOC React monolith
	// `package/src/components/page-toolbar-css/index.tsx`. This is the *composition*
	// layer: the three runes controllers (annotations #16, picker #17, markers #18)
	// plus the settings controller (#23) wired into the shell, badge, control row,
	// dragging, marker layers, overlay, and pending/edit popups. Upstream keeps all
	// of this — ~30 `useState`s and the render tree — inline; we decompose state into
	// the controllers and keep only shell-local UI state here. Upstream line ranges
	// are recorded in PORTING.md.
	//
	// IN SCOPE (issue #24): body mount + clean unmount (via index.svelte), the
	// body-level event-propagation blocker (L348–369), the collapsed-pill⇄expanded
	// morph + count badge + control buttons with CSS tooltips (L3565–3985), toolbar
	// dragging with viewport constraint + persisted position + post-drag click
	// suppression (L3216–3364, L740–754), the scrolling + fixed marker layers with
	// exiting ghosts (L4183–4265), the hover overlay (L4266–4438), pending/edit
	// popups with `PendingMarker` (L4500–4690), and the settings panel toggle with
	// its open/close animation (L636–648).
	//
	// PUBLIC SURFACE (issue #26, p2-11): the `PageFeedbackToolbarCSSProps` /
	// `AgentationProps` types live in `index.svelte`; the Phase-2 subset is wired
	// here — `className`, `copyToClipboard` (default `true`), `onCopy`, and the
	// four annotation callbacks (threaded into the annotations controller). The
	// inert props (`endpoint`/`sessionId`/`onSubmit`/`webhookUrl`/`demo*`) are
	// accepted by the type but drive nothing until Phases 4/5.
	//
	// OUT OF SCOPE — left as `// DIVERGENCE(upstream):` markers at the omission sites:
	//   - the copy *feedback UI* — the `copied` icon animation + `autoClearAfterCopy`
	//     (L3120–3125) — plus send / keyboard-shortcut / freeze end-to-end (p2-12):
	//     the pause + copy buttons render with minimal handlers (copy now fires
	//     `onCopy` + clipboard); clear is wired to the markers/annotations
	//     controllers. Send (webhook) and the keyboard handler are omitted (Phase 4 / p2-12).
	//   - design / layout / draw mode, multi-select overlays, server & demo paths
	//     (Phases 3 / 4 / 6): omitted.
	//
	// STYLE PARITY (issue #25, p2-10): the shell now carries full upstream parity —
	// the entrance + hide animations, the badge entrance, the light-mode override
	// cascade, and the theme-toggle transition-disable flash guard are all wired
	// here. Phase 3/4/6-only rules (server/MCP indicators, send button, draw canvas,
	// drag-selection, extra button states) ship with their features, not here.
	import { onMount } from 'svelte';
	import type { Annotation } from '../../types';
	import { AnnotationsController } from '../../internal/annotations.svelte';
	import { MarkersController } from '../../internal/markers.svelte';
	import { PickerController } from '../../internal/picker.svelte';
	import { SettingsController } from '../../internal/settings.svelte';
	import {
		originalSetTimeout,
		originalRequestAnimationFrame,
		freeze as freezeAll,
		unfreeze as unfreezeAll
	} from '../../utils/freeze-animations';
	import { parseComputedStylesString } from '../../utils/element-identification';
	import { loadToolbarHidden, saveToolbarHidden } from '../../utils/storage';
	import { generateOutput } from '../../utils/generate-output';
	import {
		IconListSparkle,
		IconPausePlayAnimated,
		IconEyeAnimated,
		IconCopyAnimated,
		IconTrashAlt,
		IconGear,
		IconXmarkLarge
	} from '../icons';
	import { AnnotationMarker, PendingMarker, ExitingMarker } from './annotation-marker';
	import AnnotationPopupCSS from '../annotation-popup/index.svelte';
	import SettingsPanel from './settings-panel/index.svelte';
	import type { PageFeedbackToolbarCSSProps } from './index.svelte';

	// The Phase-2 subset of the public surface is destructured + wired below; the
	// inert props (`endpoint`, `sessionId`, `onSubmit`, `webhookUrl`,
	// `onSessionCreated`, `demo*`) are accepted by the type but not destructured —
	// they drive nothing until Phases 4/5. See `index.svelte` for the full surface.
	let {
		onAnnotationAdd,
		onAnnotationUpdate,
		onAnnotationDelete,
		onAnnotationsClear,
		onCopy,
		copyToClipboard = true,
		className: userClassName
	}: PageFeedbackToolbarCSSProps = $props();

	// Storage namespace — upstream uses the page pathname (index.tsx L633–634).
	const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

	// DIVERGENCE(upstream): server sync is Phase 4; the connection is always
	// disconnected here. Typed as the full union (not a literal) so the drag/settings
	// width maths that branches on `"connected"` (upstream L3244) ports unchanged.
	const connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
	// DIVERGENCE(upstream): upstream gates the settings "React Components" toggle on
	// `process.env.NODE_ENV === "development"` (L577). React detection is entirely
	// unported (Phase 7), so the toggle drives nothing yet and is correctly shown
	// disabled — hardcoded `false`. (A Vite-only dev flag is avoided here so
	// `svelte-package` ships cleanly for non-Vite consumers.) Phase 7 wires real
	// dev detection when it lands the React path.
	const isDevMode = false;

	// --- Controllers (the three state clusters + settings) -----------------------
	const settings = new SettingsController();
	// The annotation callbacks (upstream props, index.tsx L292–299) are threaded
	// into the controller, which fires each at the moment the list actually
	// mutates — so `onAnnotationDelete`/`onAnnotationsClear` fire when removal is
	// committed (end of the exit/stagger animation, when the markers controller
	// calls through), not when the animation starts (issue #26 AC).
	// Forwarded through closures (not passed by reference): a bare `onAnnotationAdd`
	// would capture only the prop's initial value (Svelte `state_referenced_locally`),
	// so each wrapper reads the live prop at call time — harmless here (mount props
	// don't change) and correct if a host ever swaps a callback.
	const annotations = new AnnotationsController({
		pathname,
		onAnnotationAdd: (a) => onAnnotationAdd?.(a),
		onAnnotationUpdate: (a) => onAnnotationUpdate?.(a),
		onAnnotationDelete: (a) => onAnnotationDelete?.(a),
		onAnnotationsClear: (a) => onAnnotationsClear?.(a)
	});
	const markers = new MarkersController({
		getAnnotations: () => annotations.annotations,
		removeAnnotation: (id) => annotations.remove(id),
		clearAnnotations: () => annotations.clearAll()
	});
	const picker = new PickerController({
		onPick: (p) => (annotations.pending = p),
		isPending: () => annotations.pending !== null,
		isEditing: () => annotations.editing !== null,
		// When a click is declined because a popup is open, shake it (upstream
		// L1995–2009). The picker is popup-agnostic and just signals the block.
		onBlocked: () => {
			if (annotations.pending) pendingPopup?.shake();
			else if (annotations.editing) editPopup?.shake();
		}
	});

	// --- Shell-local UI state (upstream `useState`s kept inline) ------------------
	let showMarkers = $state(true); // upstream L344
	let toolbarPosition = $state<{ x: number; y: number } | null>(null); // L595
	let isDraggingToolbar = $state(false); // L599
	let dragStartPos = $state<{ x: number; y: number; toolbarX: number; toolbarY: number } | null>(
		null
	); // L600
	// ref-like flag (upstream `justFinishedToolbarDragRef`, L606): a plain local so
	// reading/writing it never triggers reactivity.
	let justFinishedToolbarDrag = false;
	let prevDragging = false; // upstream `prevDraggingRef` (L741)
	let showSettings = $state(false); // L430
	let showSettingsVisible = $state(false); // L431
	let settingsPage = $state<'main' | 'automations'>('main'); // L432
	let tooltipsHidden = $state(false); // L435
	let tooltipSessionActive = $state(false); // L500
	let tooltipSessionTimer: ReturnType<typeof originalSetTimeout> | null = null; // L501
	let isToolbarHidden = $state(loadToolbarHidden()); // L345
	let isToolbarHiding = $state(false); // L346 — plays the hide animation before unmount
	let showEntranceAnimation = $state(false); // L566 — first-load entrance animation
	let isFrozen = $state(false); // L429
	let copied = $state(false); // L404 — copy-feedback icon state (resets after 2s)

	// Component refs (`$state` so `bind:this` reactivity is tracked).
	let portalWrapper = $state<HTMLDivElement>();
	let pendingPopup = $state<{ shake: () => void }>();
	let editPopup = $state<{ shake: () => void }>();

	// --- Derived -----------------------------------------------------------------
	const isActive = $derived(picker.isActive);
	const hasAnnotations = $derived(annotations.annotations.length > 0);

	// Upstream's `visibleAnnotations` filter (L3511) also excludes markers currently
	// playing their exit animation — that set lives in the markers controller, so we
	// re-apply it here over the controller's renderable list.
	const renderable = $derived(annotations.visibleAnnotations);
	const visibleAnnotations = $derived(renderable.filter((a) => !markers.exitingMarkers.has(a.id)));
	const hasVisibleAnnotations = $derived(visibleAnnotations.length > 0);
	const exitingAnnotationsList = $derived(
		renderable.filter((a) => markers.exitingMarkers.has(a.id))
	);

	const scrollingMarkers = $derived(visibleAnnotations.filter((a) => !a.isFixed));
	const fixedMarkers = $derived(visibleAnnotations.filter((a) => a.isFixed));
	const exitingScrolling = $derived(exitingAnnotationsList.filter((a) => !a.isFixed));
	const exitingFixed = $derived(exitingAnnotationsList.filter((a) => a.isFixed));

	// Unified marker visibility (upstream `shouldShowMarkers`, L652 — the
	// `!isDesignMode` term is Phase 6 and omitted).
	const shouldShowMarkers = $derived(isActive && showMarkers);

	// --- Effects -----------------------------------------------------------------
	// Drive the markers controller's enter/exit animation from the derived flag —
	// the controller reproduces upstream's visibility `useEffect` (L650–679).
	$effect(() => {
		markers.setVisible(shouldShowMarkers);
	});

	// Reset-on-deactivate: when feedback mode turns off, unfreeze the page if it was
	// frozen (upstream reset effect, L1770–1784 — the `isFrozen` term). The pending/
	// editing/hover/settings resets that upstream also does here are handled by the
	// picker controller + `deactivate()`; the freeze flag is toolbar-owned, so the
	// unfreeze lives here. Tracks `isActive` only — the freeze read happens inside.
	$effect(() => {
		if (!isActive && isFrozen) unfreezeAnimations();
	});

	// Settings open/close exit animation (upstream L636–648).
	$effect(() => {
		if (showSettings) {
			showSettingsVisible = true;
		} else {
			tooltipsHidden = false; // reset so tooltips show after closing settings
			settingsPage = 'main'; // reset to main page on close
			const timer = originalSetTimeout(() => (showSettingsVisible = false), 0);
			return () => clearTimeout(timer);
		}
	});

	// Toolbar drag: mousemove/mouseup live only while a drag is armed (upstream
	// L3216–3284). Re-runs only when `dragStartPos` changes (armed on mousedown,
	// cleared on mouseup); the handlers read the other `$state` live via closure.
	$effect(() => {
		const start = dragStartPos;
		if (!start) return;

		const DRAG_THRESHOLD = 10; // pixels

		const handleMouseMove = (e: MouseEvent) => {
			const deltaX = e.clientX - start.x;
			const deltaY = e.clientY - start.y;
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			if (!isDraggingToolbar && distance > DRAG_THRESHOLD) {
				isDraggingToolbar = true;
			}

			if (isDraggingToolbar || distance > DRAG_THRESHOLD) {
				let newX = start.toolbarX + deltaX;
				let newY = start.toolbarY + deltaY;
				const { x, y } = constrain(newX, newY);
				newX = x;
				newY = y;
				toolbarPosition = { x: newX, y: newY };
			}
		};

		const handleMouseUp = () => {
			// If we were actually dragging, suppress the click that would expand the
			// collapsed pill (upstream L3270–3272).
			if (isDraggingToolbar) justFinishedToolbarDrag = true;
			isDraggingToolbar = false;
			dragStartPos = null;
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	});

	// Save position when a drag ends (upstream L740–753).
	$effect(() => {
		const dragging = isDraggingToolbar;
		const pos = toolbarPosition;
		const wasDragging = prevDragging;
		prevDragging = dragging;
		if (wasDragging && !dragging && pos) {
			try {
				localStorage.setItem('feedback-toolbar-position', JSON.stringify(pos));
			} catch {
				// Ignore localStorage errors.
			}
		}
	});

	// Keep the toolbar in view on resize and when it expands/collapses (upstream
	// L3318–3363). Mirrors upstream's dep set (`toolbarPosition`, `isActive`,
	// `connectionStatus`); the `if changed` guard inside `constrainPosition` keeps
	// the self-set from looping, exactly as upstream.
	$effect(() => {
		const pos = toolbarPosition;
		void isActive; // re-run on expand/collapse like upstream's dep array
		if (!pos) return;

		const constrainPosition = () => {
			const { x: newX, y: newY } = constrain(pos.x, pos.y);
			if (newX !== pos.x || newY !== pos.y) toolbarPosition = { x: newX, y: newY };
		};

		constrainPosition();
		window.addEventListener('resize', constrainPosition);
		return () => window.removeEventListener('resize', constrainPosition);
	});

	// Mount: hydrate settings, start scroll tracking, restore position, install the
	// body event-propagation blocker. Teardown reverses all of it.
	onMount(() => {
		settings.load();
		markers.start();

		// Trigger the entrance animation only on the first load of the page, not on
		// SPA navigation / remounts (upstream L687–693). The toolbar plays for 500ms,
		// the badge for 400ms delay + 300ms — the class is removed after 750ms.
		if (!hasPlayedEntranceAnimation) {
			showEntranceAnimation = true;
			hasPlayedEntranceAnimation = true;
			originalSetTimeout(() => (showEntranceAnimation = false), 750);
		}

		// Restore saved toolbar position (upstream L706–717).
		try {
			const saved = localStorage.getItem('feedback-toolbar-position');
			if (saved) {
				const pos = JSON.parse(saved);
				if (typeof pos.x === 'number' && typeof pos.y === 'number') toolbarPosition = pos;
			}
		} catch {
			// Ignore localStorage errors.
		}

		// Body-level event-propagation blocker (upstream L348–369): native events
		// originating inside the toolbar must not reach document-level "click
		// outside" handlers that close host modals/dropdowns/drawers.
		const stop = (e: Event) => {
			if (portalWrapper && portalWrapper.contains(e.target as Node)) {
				e.stopPropagation();
			}
		};
		const events = ['mousedown', 'click', 'pointerdown'] as const;
		events.forEach((evt) => document.body.addEventListener(evt, stop));

		// Keyboard shortcuts (upstream keydown effect, L3365–3486). Registered once —
		// the handler reads component `$state`/`$derived` live (Svelte compiles those
		// reads to getters), so a single listener replaces upstream's dep-array
		// re-registration with identical behavior.
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			events.forEach((evt) => document.body.removeEventListener(evt, stop));
			document.removeEventListener('keydown', handleKeyDown);
			if (tooltipSessionTimer) clearTimeout(tooltipSessionTimer);
			// Unmount safety (upstream L1786–1791): if the component is removed while
			// the page is frozen, unfreeze unconditionally so the host page is never
			// left with its animations/timers paused. Raw util (not the guarded
			// `unfreezeAnimations`) — the local `isFrozen` flag is irrelevant on teardown.
			unfreezeAll();
			picker.destroy();
			markers.destroy();
		};
	});

	// --- Geometry helpers --------------------------------------------------------
	// Viewport constraint shared by drag + resize (upstream L3237–3262 / L3322–3350).
	function constrain(x: number, y: number): { x: number; y: number } {
		const padding = 20;
		const wrapperWidth = 337; // .toolbar wrapper width
		const toolbarHeight = 44;
		// Content is right-aligned within the wrapper via margin-left:auto.
		const contentWidth = isActive ? (connectionStatus === 'connected' ? 297 : 257) : 44;
		const contentOffset = wrapperWidth - contentWidth;
		const minX = padding - contentOffset;
		const maxX = window.innerWidth - padding - wrapperWidth;
		return {
			x: Math.max(minX, Math.min(maxX, x)),
			y: Math.max(padding, Math.min(window.innerHeight - toolbarHeight - padding, y))
		};
	}

	// Viewport-aware marker tooltip positioning (upstream L3519–3563). Upstream
	// returns a `React.CSSProperties`; `AnnotationMarker.tooltipStyle` is a CSS
	// string (the Svelte idiom), so we serialise the same rules.
	function getTooltipPosition(annotation: Annotation): string {
		const tooltipMaxWidth = 200;
		const tooltipEstimatedHeight = 80;
		const markerSize = 22;
		const gap = 10;

		const markerX = (annotation.x / 100) * window.innerWidth;
		const markerY = typeof annotation.y === 'string' ? parseFloat(annotation.y) : annotation.y;

		const parts: string[] = [];

		const spaceBelow = window.innerHeight - markerY - markerSize - gap;
		if (spaceBelow < tooltipEstimatedHeight) {
			parts.push('top: auto', `bottom: calc(100% + ${gap}px)`);
		}

		const centerX = markerX - tooltipMaxWidth / 2;
		const edgePadding = 10;
		if (centerX < edgePadding) {
			parts.push(`left: calc(50% + ${edgePadding - centerX}px)`);
		} else if (centerX + tooltipMaxWidth > window.innerWidth - edgePadding) {
			const overflow = centerX + tooltipMaxWidth - (window.innerWidth - edgePadding);
			parts.push(`left: calc(50% - ${overflow}px)`);
		}

		return parts.join('; ');
	}

	// Popup placement string (upstream pending L4540–4554 / edit L4668–4687):
	// clamp the 280px-wide popup 160px from each edge, flip above the marker near
	// the bottom of the viewport.
	function popupStyle(xPercent: number, markerY: number): string {
		const left = Math.max(
			160,
			Math.min(window.innerWidth - 160, (xPercent / 100) * window.innerWidth)
		);
		const vert =
			markerY > window.innerHeight - 290
				? `bottom: ${window.innerHeight - markerY + 20}px`
				: `top: ${markerY + 20}px`;
		return `left: ${left}px; ${vert}`;
	}

	// --- Tooltip session (upstream L518–542) -------------------------------------
	function hideTooltipsUntilMouseLeave() {
		tooltipsHidden = true;
	}
	function handleControlsMouseEnter() {
		if (!tooltipSessionActive) {
			tooltipSessionTimer = originalSetTimeout(() => (tooltipSessionActive = true), 850);
		}
	}
	function handleControlsMouseLeave() {
		if (tooltipSessionTimer) {
			clearTimeout(tooltipSessionTimer);
			tooltipSessionTimer = null;
		}
		tooltipSessionActive = false;
		tooltipsHidden = false;
	}

	// --- Toolbar drag start + collapsed-pill activation --------------------------
	// Upstream `handleToolbarMouseDown` (L3286–3316).
	function handleToolbarMouseDown(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('button') || target.closest('[data-agentation-settings-panel]')) return;

		const toolbarParent = (e.currentTarget as HTMLElement).parentElement; // .toolbar wrapper
		if (!toolbarParent) return;

		const rect = toolbarParent.getBoundingClientRect();
		dragStartPos = {
			x: e.clientX,
			y: e.clientY,
			toolbarX: toolbarPosition?.x ?? rect.left,
			toolbarY: toolbarPosition?.y ?? rect.top
		};
	}

	// Collapsed pill click → enter feedback mode (upstream L3586–3597), suppressed
	// right after a drag.
	function handleContainerClick(e: MouseEvent) {
		if (isActive) return;
		if (justFinishedToolbarDrag) {
			justFinishedToolbarDrag = false;
			e.preventDefault();
			return;
		}
		picker.activate();
	}

	// --- Control button handlers -------------------------------------------------
	// Freeze/unfreeze page animations via `utils/freeze-animations.ts` (upstream
	// `freezeAnimations`/`unfreezeAnimations`/`toggleFreeze`, L1642–1661). The util
	// excludes `[data-feedback-toolbar]` subtrees, so the toolbar itself keeps
	// animating while the page is frozen. Idempotent guards match upstream.
	function freezeAnimations() {
		if (isFrozen) return;
		freezeAll();
		isFrozen = true;
	}
	function unfreezeAnimations() {
		if (!isFrozen) return;
		unfreezeAll();
		isFrozen = false;
	}
	function toggleFreeze() {
		if (isFrozen) unfreezeAnimations();
		else freezeAnimations();
	}
	// Copy the markdown output (upstream `copyOutput`, L2944–3142). The
	// annotation-only path is wired here: build the output, optionally write it to
	// the clipboard (gated on `copyToClipboard`, default `true`), then fire
	// `onCopy` with the markdown regardless of clipboard success.
	// DIVERGENCE(upstream): the draw-stroke / design / wireframe output branches
	// (L2951–3106) are Phases 3/6 — omitted, so an empty output is a no-op rather
	// than upstream's `"## Page Feedback: …"` draw-only fallback.
	async function copyOutput() {
		const displayUrl =
			typeof window !== 'undefined'
				? window.location.pathname + window.location.search + window.location.hash
				: pathname;

		const output = generateOutput(
			annotations.annotations,
			displayUrl,
			settings.settings.outputDetail
		);
		if (!output) return;

		if (copyToClipboard) {
			try {
				await navigator.clipboard.writeText(output);
			} catch {
				// Clipboard may fail (permissions, not HTTPS, etc.) — continue anyway.
			}
		}

		// Fire callback with markdown output (always, regardless of clipboard success).
		onCopy?.(output);

		// Copy-feedback UI (upstream L3120–3121): flash the copied icon state for 2s.
		// `originalSetTimeout` so a frozen page can't stall the reset.
		copied = true;
		originalSetTimeout(() => (copied = false), 2000);

		// Auto-clear after copy (upstream L3123–3125): staggered clear 500ms later,
		// honoring the setting. Routed through the markers controller's staggered
		// clear (upstream `clearAll`), same path as the trash button / `X` shortcut.
		if (settings.settings.autoClearAfterCopy) {
			originalSetTimeout(() => markers.startClear(), 500);
		}
	}
	function deactivate() {
		picker.deactivate();
		annotations.cancelPending();
		annotations.cancelEdit();
		showSettings = false;
	}

	// Keyboard shortcuts (upstream `handleKeyDown`, L3367–3482). Installed once in
	// `onMount`; reads live component state. The typing guard (L3368–3373) blocks the
	// single-key shortcuts inside inputs/textareas/contenteditable.
	// DIVERGENCE(upstream): the Escape cascade's design-mode (L3377–3384), draw-mode
	// (L3386–3389), and multi-select (L3391–3394) branches are Phases 6/3; the `L`
	// layout (L3426–3437) and `S` send (L3469–3481) shortcuts stay unwired (Phases 6/4).
	function handleKeyDown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isTyping =
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		if (e.key === 'Escape') {
			if (annotations.pending) {
				// Let the popup handle Escape — its textarea keydown cancels + stops
				// propagation, so this document handler is a no-op while pending (L3395–3396).
			} else if (isActive) {
				hideTooltipsUntilMouseLeave();
				deactivate();
			}
		}

		// Cmd+Shift+F / Ctrl+Shift+F to toggle feedback mode (L3404–3413).
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
			e.preventDefault();
			hideTooltipsUntilMouseLeave();
			if (isActive) deactivate();
			else picker.activate();
			return;
		}

		// Skip the remaining single-key shortcuts while typing or holding a modifier (L3416).
		if (isTyping || e.metaKey || e.ctrlKey) return;

		// "P" to toggle pause/freeze (L3419–3423).
		if (e.key === 'p' || e.key === 'P') {
			e.preventDefault();
			hideTooltipsUntilMouseLeave();
			toggleFreeze();
		}

		// "H" to toggle marker visibility — only with annotations (L3440–3446).
		if (e.key === 'h' || e.key === 'H') {
			if (annotations.annotations.length > 0) {
				e.preventDefault();
				hideTooltipsUntilMouseLeave();
				showMarkers = !showMarkers;
			}
		}

		// "C" to copy output — only with annotations (L3449–3455).
		if (e.key === 'c' || e.key === 'C') {
			if (annotations.annotations.length > 0) {
				e.preventDefault();
				hideTooltipsUntilMouseLeave();
				copyOutput();
			}
		}

		// "X" to clear all — only with annotations (L3458–3466). Routed through the
		// markers controller's staggered clear (same path as the trash button).
		if (e.key === 'x' || e.key === 'X') {
			if (annotations.annotations.length > 0) {
				e.preventDefault();
				hideTooltipsUntilMouseLeave();
				markers.startClear();
			}
		}
	}

	// Theme toggle with the flash guard (upstream `toggleTheme`, L568–573): adding
	// `disableTransitions` to the portal wrapper for one frame suppresses the
	// color/box-shadow transitions that would otherwise animate during the switch,
	// then removes it on the next animation frame. DIVERGENCE(upstream): applied
	// imperatively via `classList` (matching upstream) with the class name kept
	// global (`:global(.disableTransitions …)` in the stylesheet) rather than a
	// scoped reactive `class:` — the rule targets every descendant via `*`, which
	// scoped styles can't express cleanly.
	function handleToggleTheme() {
		portalWrapper?.classList.add('disableTransitions');
		settings.toggleTheme();
		originalRequestAnimationFrame(() => {
			portalWrapper?.classList.remove('disableTransitions');
		});
	}

	// Hide the toolbar with the exit animation (upstream `hideToolbarTemporarily`,
	// L1131–1141): collapse + close settings, play `toolbarHide` for 400ms, then
	// persist hidden and unmount the shell.
	function hideToolbarTemporarily() {
		if (isToolbarHiding) return;
		isToolbarHiding = true;
		showSettings = false;
		picker.deactivate();
		originalSetTimeout(() => {
			saveToolbarHidden(true);
			isToolbarHidden = true;
			isToolbarHiding = false;
		}, 400);
	}

	// Marker interaction wiring (upstream L4204–4215).
	function onMarkerClick(a: Annotation) {
		if (settings.settings.markerClickBehavior === 'delete') markers.startDelete(a.id);
		else annotations.startEdit(a);
	}
	function onMarkerHoverEnter(a: Annotation) {
		if (!markers.markersExiting) markers.handleMarkerHover(a);
	}
</script>

<!-- DIVERGENCE(upstream): React `createPortal(jsx, document.body)` → this tree is
mounted into `document.body` by `index.svelte`. The wrapper keeps upstream's
`display:contents` plus the `data-agentation-theme`/`-accent`/`-root` attributes
(L3566) — the theme/accent attrs drive the scoped light-mode + accent-colour CSS
and `-root` is what the picker's cursor injection excludes. -->
{#if !isToolbarHidden}
	<div
		bind:this={portalWrapper}
		style="display: contents"
		data-agentation-theme={settings.theme}
		data-agentation-accent={settings.settings.annotationColorId}
		data-agentation-root=""
	>
		<!-- Toolbar -->
		<div
			class="toolbar {userClassName ?? ''}"
			data-feedback-toolbar
			data-agentation-toolbar
			style:left={toolbarPosition ? `${toolbarPosition.x}px` : undefined}
			style:top={toolbarPosition ? `${toolbarPosition.y}px` : undefined}
			style:right={toolbarPosition ? 'auto' : undefined}
			style:bottom={toolbarPosition ? 'auto' : undefined}
		>
			<!-- Morphing container -->
			<!-- DIVERGENCE(upstream): upstream gives the collapsed pill `role="button"` +
			`tabIndex={0}` and the expanded shell no role + `tabIndex={-1}`; the latter is
			a noninteractive element with a (negative, harmless) tabindex, which trips the
			a11y lint statically — suppressed, matching upstream's markup exactly. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="toolbarContainer"
				class:expanded={isActive}
				class:collapsed={!isActive}
				class:entrance={showEntranceAnimation}
				class:hiding={isToolbarHiding}
				onclick={handleContainerClick}
				onmousedown={handleToolbarMouseDown}
				role={!isActive ? 'button' : undefined}
				tabindex={!isActive ? 0 : -1}
				title={!isActive ? 'Start feedback mode' : undefined}
			>
				<!-- Toggle content — visible when collapsed -->
				<div class="toggleContent" class:visible={!isActive} class:hidden={isActive}>
					<IconListSparkle size={24} />
					{#if hasVisibleAnnotations}
						<span class="badge" class:fadeOut={isActive} class:entrance={showEntranceAnimation}
							>{visibleAnnotations.length}</span
						>
					{/if}
				</div>

				<!-- Controls content — visible when expanded -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="controlsContent"
					class:visible={isActive}
					class:hidden={!isActive}
					class:tooltipBelow={toolbarPosition !== null && toolbarPosition.y < 100}
					class:tooltipsHidden={tooltipsHidden || showSettings}
					class:tooltipsInSession={tooltipSessionActive}
					onmouseenter={handleControlsMouseEnter}
					onmouseleave={handleControlsMouseLeave}
				>
					<!-- DIVERGENCE(upstream): the layout-mode + draw-mode + send buttons
					(L3652–3697, L3738–3776) are Phase 6 / Phase 4 — omitted here. -->
					<div
						class="buttonWrapper"
						class:buttonWrapperAlignLeft={toolbarPosition !== null && toolbarPosition.x < 120}
					>
						<button
							class="controlButton"
							onclick={(e) => {
								e.stopPropagation();
								hideTooltipsUntilMouseLeave();
								toggleFreeze();
							}}
							data-active={isFrozen}
						>
							<IconPausePlayAnimated size={24} isPaused={isFrozen} />
						</button>
						<span class="buttonTooltip">
							{isFrozen ? 'Resume animations' : 'Pause animations'}
							<span class="shortcut">P</span>
						</span>
					</div>

					<div class="buttonWrapper">
						<button
							class="controlButton"
							onclick={(e) => {
								e.stopPropagation();
								hideTooltipsUntilMouseLeave();
								showMarkers = !showMarkers;
							}}
							disabled={!hasAnnotations}
						>
							<IconEyeAnimated size={24} isOpen={showMarkers} />
						</button>
						<span class="buttonTooltip">
							{showMarkers ? 'Hide markers' : 'Show markers'}
							<span class="shortcut">H</span>
						</span>
					</div>

					<div class="buttonWrapper">
						<button
							class="controlButton"
							class:statusShowing={copied}
							onclick={(e) => {
								e.stopPropagation();
								hideTooltipsUntilMouseLeave();
								copyOutput();
							}}
							disabled={!hasAnnotations}
							data-active={copied}
						>
							<IconCopyAnimated size={24} {copied} />
						</button>
						<span class="buttonTooltip">
							Copy feedback
							<span class="shortcut">C</span>
						</span>
					</div>

					<div class="buttonWrapper">
						<button
							class="controlButton"
							onclick={(e) => {
								e.stopPropagation();
								hideTooltipsUntilMouseLeave();
								markers.startClear();
							}}
							disabled={!hasAnnotations}
							data-danger
						>
							<IconTrashAlt size={24} />
						</button>
						<span class="buttonTooltip">
							Clear all
							<span class="shortcut">X</span>
						</span>
					</div>

					<div class="buttonWrapper">
						<button
							class="controlButton"
							onclick={(e) => {
								e.stopPropagation();
								hideTooltipsUntilMouseLeave();
								showSettings = !showSettings;
							}}
						>
							<IconGear size={24} />
						</button>
						<span class="buttonTooltip">Settings</span>
					</div>

					<div class="divider"></div>

					<div
						class="buttonWrapper"
						class:buttonWrapperAlignRight={toolbarPosition !== null &&
							typeof window !== 'undefined' &&
							toolbarPosition.x > window.innerWidth - 120}
					>
						<button
							class="controlButton"
							onclick={(e) => {
								e.stopPropagation();
								hideTooltipsUntilMouseLeave();
								deactivate();
							}}
						>
							<IconXmarkLarge size={24} />
						</button>
						<span class="buttonTooltip">
							Exit
							<span class="shortcut">Esc</span>
						</span>
					</div>
				</div>

				<SettingsPanel
					settings={settings.settings}
					onSettingsChange={(patch) => settings.patch(patch)}
					isDarkMode={settings.isDarkMode}
					onToggleTheme={handleToggleTheme}
					{isDevMode}
					{connectionStatus}
					endpoint={undefined}
					isVisible={showSettingsVisible}
					toolbarNearBottom={toolbarPosition !== null && toolbarPosition.y < 230}
					{settingsPage}
					onSettingsPageChange={(page) => (settingsPage = page)}
					onHideToolbar={hideToolbarTemporarily}
				/>
			</div>
		</div>

		<!-- Markers layer — normal scrolling markers (upstream L4183–4223) -->
		<div class="markersLayer" data-feedback-toolbar>
			{#if markers.markersVisible}
				{#each scrollingMarkers as annotation, layerIndex (annotation.id)}
					<AnnotationMarker
						{annotation}
						globalIndex={visibleAnnotations.findIndex((a) => a.id === annotation.id)}
						{layerIndex}
						layerSize={scrollingMarkers.length}
						isExiting={markers.markersExiting}
						isClearing={markers.isClearing}
						isAnimated={markers.animatedMarkers.has(annotation.id)}
						isHovered={!markers.markersExiting && markers.hoveredMarkerId === annotation.id}
						isDeleting={markers.deletingMarkerId === annotation.id}
						isEditingAny={annotations.editing !== null}
						renumberFrom={markers.renumberFrom}
						markerClickBehavior={settings.settings.markerClickBehavior}
						tooltipStyle={getTooltipPosition(annotation)}
						onHoverEnter={onMarkerHoverEnter}
						onHoverLeave={() => markers.handleMarkerHover(null)}
						onClick={onMarkerClick}
						onContextMenu={(a) => annotations.startEdit(a)}
					/>
				{/each}
				{#if !markers.markersExiting}
					{#each exitingScrolling as a (a.id)}
						<ExitingMarker annotation={a} />
					{/each}
				{/if}
			{/if}
		</div>

		<!-- Fixed markers layer (upstream L4225–4265) -->
		<div class="fixedMarkersLayer" data-feedback-toolbar>
			{#if markers.markersVisible}
				{#each fixedMarkers as annotation, layerIndex (annotation.id)}
					<AnnotationMarker
						{annotation}
						globalIndex={visibleAnnotations.findIndex((a) => a.id === annotation.id)}
						{layerIndex}
						layerSize={fixedMarkers.length}
						isExiting={markers.markersExiting}
						isClearing={markers.isClearing}
						isAnimated={markers.animatedMarkers.has(annotation.id)}
						isHovered={!markers.markersExiting && markers.hoveredMarkerId === annotation.id}
						isDeleting={markers.deletingMarkerId === annotation.id}
						isEditingAny={annotations.editing !== null}
						renumberFrom={markers.renumberFrom}
						markerClickBehavior={settings.settings.markerClickBehavior}
						tooltipStyle={getTooltipPosition(annotation)}
						onHoverEnter={onMarkerHoverEnter}
						onHoverLeave={() => markers.handleMarkerHover(null)}
						onClick={onMarkerClick}
						onContextMenu={(a) => annotations.startEdit(a)}
					/>
				{/each}
				{#if !markers.markersExiting}
					{#each exitingFixed as a (a.id)}
						<ExitingMarker annotation={a} fixed />
					{/each}
				{/if}
			{/if}
		</div>

		<!-- Interactive overlay (upstream L4268–4703) -->
		{#if isActive}
			<div
				class="overlay"
				data-feedback-toolbar
				style:z-index={annotations.pending || annotations.editing ? 99999 : undefined}
			>
				<!-- Hover highlight (upstream L4279–4295). DIVERGENCE: `isDragging`
				(multi-select drag) is Phase 3 and always false. -->
				{#if picker.hoverInfo?.rect && !annotations.pending && !markers.isScrolling}
					{@const r = picker.hoverInfo.rect}
					<div
						class="hoverHighlight enter"
						style:left={`${r.left}px`}
						style:top={`${r.top}px`}
						style:width={`${r.width}px`}
						style:height={`${r.height}px`}
					></div>
				{/if}

				<!-- Marker hover outline (upstream L4329–4412). DIVERGENCE: the
				multi-select (`elementBoundingBoxes`) branch is Phase 3 — single only. -->
				{#if markers.hoveredMarkerId && !annotations.pending}
					{@const ha = annotations.annotations.find((a) => a.id === markers.hoveredMarkerId)}
					{#if ha?.boundingBox}
						{@const live =
							markers.hoveredTargetElement && document.contains(markers.hoveredTargetElement)
								? markers.hoveredTargetElement.getBoundingClientRect()
								: null}
						{@const bb = live
							? { x: live.left, y: live.top, width: live.width, height: live.height }
							: {
									x: ha.boundingBox.x,
									y: ha.isFixed ? ha.boundingBox.y : ha.boundingBox.y - markers.scrollY,
									width: ha.boundingBox.width,
									height: ha.boundingBox.height
								}}
						<div
							class="enter"
							class:multiSelectOutline={ha.isMultiSelect}
							class:singleSelectOutline={!ha.isMultiSelect}
							style:left={`${bb.x}px`}
							style:top={`${bb.y}px`}
							style:width={`${bb.width}px`}
							style:height={`${bb.height}px`}
						></div>
					{/if}
				{/if}

				<!-- Hover tooltip (upstream L4414–4438). DIVERGENCE: `reactComponents`
				is unpopulated (Phase 7), so the react-path line never renders. -->
				{#if picker.hoverInfo && !annotations.pending && !markers.isScrolling}
					<div
						class="hoverTooltip enter"
						style:left={`${Math.max(8, Math.min(picker.hoverPosition.x, window.innerWidth - 100))}px`}
						style:top={`${Math.max(picker.hoverPosition.y - 32, 8)}px`}
					>
						<div class="hoverElementName">{picker.hoverInfo.elementName}</div>
					</div>
				{/if}

				<!-- Pending annotation marker + popup (upstream L4440–4560). DIVERGENCE:
				multi-select outlines (`multiSelectElements`) are Phase 3; the
				`pendingExiting` outline-exit flag is dropped — the popup self-animates
				its own exit before `onCancel` nulls the pending state. -->
				{#if annotations.pending}
					{@const p = annotations.pending}
					{#if p.targetElement && document.contains(p.targetElement)}
						{@const r = p.targetElement.getBoundingClientRect()}
						<div
							class="singleSelectOutline enter"
							style:left={`${r.left}px`}
							style:top={`${r.top}px`}
							style:width={`${r.width}px`}
							style:height={`${r.height}px`}
						></div>
					{:else if p.boundingBox}
						<div
							class="enter"
							class:multiSelectOutline={p.isMultiSelect}
							class:singleSelectOutline={!p.isMultiSelect}
							style:left={`${p.boundingBox.x}px`}
							style:top={`${p.boundingBox.y - markers.scrollY}px`}
							style:width={`${p.boundingBox.width}px`}
							style:height={`${p.boundingBox.height}px`}
						></div>
					{/if}

					{@const markerX = p.x}
					{@const markerY = p.isFixed ? p.y : p.y - markers.scrollY}
					<PendingMarker
						x={markerX}
						y={markerY}
						isMultiSelect={p.isMultiSelect}
						isExiting={false}
					/>

					<AnnotationPopupCSS
						bind:this={pendingPopup}
						element={p.element}
						selectedText={p.selectedText}
						computedStyles={p.computedStylesObj}
						placeholder={p.element === 'Area selection'
							? 'What should change in this area?'
							: p.isMultiSelect
								? 'Feedback for this group of elements...'
								: 'What should change?'}
						onSubmit={(text) => annotations.add(text)}
						onCancel={() => annotations.cancelPending()}
						lightMode={!settings.isDarkMode}
						accentColor={p.isMultiSelect
							? 'var(--agentation-color-green)'
							: 'var(--agentation-color-accent)'}
						style={popupStyle(markerX, markerY)}
					/>
				{/if}

				<!-- Edit annotation popup (upstream L4562–4690). DIVERGENCE: live
				editing-element tracking (`editingTargetElement`) is out of scope, so the
				outline uses the stored bounding box. -->
				{#if annotations.editing}
					{@const ea = annotations.editing}
					{#if ea.boundingBox}
						<div
							class="enter"
							class:multiSelectOutline={ea.isMultiSelect}
							class:singleSelectOutline={!ea.isMultiSelect}
							style:left={`${ea.boundingBox.x}px`}
							style:top={`${ea.isFixed ? ea.boundingBox.y : ea.boundingBox.y - markers.scrollY}px`}
							style:width={`${ea.boundingBox.width}px`}
							style:height={`${ea.boundingBox.height}px`}
						></div>
					{/if}

					{@const markerY = ea.isFixed ? ea.y : ea.y - markers.scrollY}
					<AnnotationPopupCSS
						bind:this={editPopup}
						element={ea.element}
						selectedText={ea.selectedText}
						computedStyles={parseComputedStylesString(ea.computedStyles)}
						placeholder="Edit your feedback..."
						initialValue={ea.comment}
						submitLabel="Save"
						onSubmit={(text) => annotations.update(text)}
						onCancel={() => annotations.cancelEdit()}
						onDelete={() => markers.startDelete(ea.id)}
						lightMode={!settings.isDarkMode}
						accentColor={ea.isMultiSelect
							? 'var(--agentation-color-green)'
							: 'var(--agentation-color-accent)'}
						style={popupStyle(ea.x, markerY)}
					/>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<!-- DIVERGENCE(upstream): `styles.module.scss` (2.2k LOC) → scoped `<style>`. This
carries the toolbar shell's full upstream parity (issue #25, p2-10): the host-CSS-leak
guards (`:where()` reset + the `svg[fill="none"]` protection), the `:where(.toolbar)`
zero-specificity positional defaults, the shell morph + entrance/hide animations,
control buttons + CSS tooltips (incl. corner-aligned + tooltip-below variants), the
badge + its entrance, marker layers, the overlay outlines/tooltip, the full light-mode
override cascade, and the theme-toggle flash guard. Class names are kept verbatim;
SCSS `&` nesting is flattened to plain CSS (no preprocessor in this repo) and the
per-component Svelte hash replaces the CSS-module hash.

NOT carried (they ship with their features, not here): the settings-panel / marker /
popup rules (own components, p2-06/07/08); and the Phase 3/4/6 rules — server/MCP
indicators, connection dot, send button, the `serverConnected` width, the extra
control-button server states (`data-error`/`data-auto-sync`/`data-failed`/
`data-no-hover`), draw canvas, drag-selection, and design/layout styles. Adding their
(unused) selectors now would only trip Svelte's unused-CSS check. -->

<style>
	/* Protect stroke-based icons from host `svg { fill: currentColor }` (upstream
	   L8–18; agentation issue #58). */
	.toolbar :global(svg[fill='none']),
	.markersLayer :global(svg[fill='none']),
	.fixedMarkersLayer :global(svg[fill='none']) {
		fill: none !important;
	}

	/* Zero-specificity reset so host global `button {…}` rules can't leak into the
	   portaled toolbar (upstream L27–43). DIVERGENCE(upstream): upstream resets
	   `button, input, select, textarea, label`; this component's `.controlsContent`
	   only ever contains buttons (the settings inputs live in the child
	   `SettingsPanel`, separately scoped), so the unused selectors are trimmed to
	   keep Svelte's unused-CSS check clean. */
	.controlsContent :where(button) {
		background: unset;
		border: unset;
		border-radius: unset;
		padding: unset;
		margin: unset;
		color: unset;
		font-family: unset;
		font-weight: unset;
		font-style: unset;
		line-height: unset;
		letter-spacing: unset;
		text-transform: unset;
		text-decoration: unset;
		box-shadow: unset;
		outline: unset;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes toolbarEnter {
		from {
			opacity: 0;
			transform: scale(0.5) rotate(90deg);
		}
		to {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	@keyframes toolbarHide {
		from {
			opacity: 1;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(0.8);
		}
	}

	@keyframes badgeEnter {
		from {
			opacity: 0;
			transform: scale(0);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes hoverHighlightIn {
		from {
			opacity: 0;
			transform: scale(0.98);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes hoverTooltipIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* ── Toolbar shell ── */
	.toolbar {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		width: 337px;
		z-index: 100000;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		pointer-events: none;
		transition:
			left 0s,
			top 0s,
			right 0s,
			bottom 0s; /* Instant positioning changes */
	}

	/* Positional defaults use :where() for zero specificity so a consumer
	   className can override them (upstream L196–201; agentation issue #146). */
	:where(.toolbar) {
		bottom: 1.25rem;
		right: 1.25rem;
	}

	.toolbarContainer {
		position: relative;
		user-select: none;
		margin-left: auto;
		align-self: flex-end;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1a1a1a;
		color: #fff;
		border: none;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.2),
			0 4px 16px rgba(0, 0, 0, 0.1);
		pointer-events: auto;
		transition:
			width 0.4s cubic-bezier(0.19, 1, 0.22, 1),
			transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
	}

	.toolbarContainer.entrance {
		animation: toolbarEnter 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
	}

	.toolbarContainer.hiding {
		animation: toolbarHide 0.4s cubic-bezier(0.4, 0, 1, 1) forwards;
		pointer-events: none;
	}

	.toolbarContainer.collapsed {
		width: 44px;
		height: 44px;
		border-radius: 22px;
		padding: 0;
		cursor: pointer;
	}

	/* The collapsed pill's icon is optically nudged up 1px (upstream L240–242).
	   `:global` because the SVG is rendered by the IconListSparkle child component
	   and scoped styles do not pierce component boundaries. */
	.toolbarContainer.collapsed :global(svg) {
		margin-top: -1px;
	}

	.toolbarContainer.collapsed:hover {
		background: #2a2a2a;
	}

	.toolbarContainer.collapsed:active {
		transform: scale(0.95);
	}

	.toolbarContainer.expanded {
		height: 44px;
		border-radius: 1.5rem;
		padding: 0.375rem;
		width: 297px;
	}

	.toggleContent {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.1s cubic-bezier(0.19, 1, 0.22, 1);
	}

	.toggleContent.visible {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}

	.toggleContent.hidden {
		opacity: 0;
		pointer-events: none;
	}

	.controlsContent {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		transition:
			filter 0.8s cubic-bezier(0.19, 1, 0.22, 1),
			opacity 0.8s cubic-bezier(0.19, 1, 0.22, 1),
			transform 0.6s cubic-bezier(0.19, 1, 0.22, 1);
	}

	.controlsContent.visible {
		opacity: 1;
		filter: blur(0px);
		transform: scale(1);
		visibility: visible;
		pointer-events: auto;
	}

	.controlsContent.hidden {
		pointer-events: none;
		opacity: 0;
		filter: blur(10px);
		transform: scale(0.4);
	}

	.badge {
		position: absolute;
		top: -13px;
		right: -13px;
		user-select: none;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		background-color: var(--agentation-color-accent);
		color: white;
		font-size: 0.625rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.15),
			inset 0 0 0 1px rgba(255, 255, 255, 0.04);
		opacity: 1;
		transition:
			transform 0.3s ease,
			opacity 0.2s ease;
		transform: scale(1);
	}

	.badge.fadeOut {
		opacity: 0;
		transform: scale(0);
		pointer-events: none;
	}

	.badge.entrance {
		animation: badgeEnter 0.3s cubic-bezier(0.34, 1.2, 0.64, 1) 0.4s both;
	}

	/* ── Control buttons ── */
	.controlButton {
		position: relative;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.85);
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			transform 0.1s ease,
			opacity 0.2s ease;
	}

	.controlButton:hover:not(:disabled):not([data-active='true']) {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}

	.controlButton:active:not(:disabled) {
		transform: scale(0.92);
	}

	.controlButton:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.controlButton[data-active='true'] {
		color: var(--agentation-color-blue);
		background-color: color-mix(in srgb, var(--agentation-color-blue) 25%, transparent);
	}

	.controlButton[data-danger]:hover:not(:disabled):not([data-active='true']) {
		background-color: color-mix(in srgb, var(--agentation-color-red) 25%, transparent);
		color: var(--agentation-color-red);
	}

	.controlButton.statusShowing {
		cursor: default;
		pointer-events: none;
		background: transparent !important;
	}

	/* ── Button tooltips ── */
	.buttonWrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.buttonWrapper:hover .buttonTooltip {
		opacity: 1;
		visibility: visible;
		transform: translateX(-50%) scale(1);
		transition-delay: 0.85s;
	}

	.buttonWrapper:has(.controlButton:disabled):hover .buttonTooltip {
		opacity: 0;
		visibility: hidden;
	}

	.tooltipsInSession .buttonWrapper:hover .buttonTooltip {
		transition-delay: 0s;
	}

	.buttonTooltip {
		position: absolute;
		bottom: calc(100% + 14px);
		left: 50%;
		transform: translateX(-50%) scale(0.95);
		padding: 6px 10px;
		background: #1a1a1a;
		color: rgba(255, 255, 255, 0.9);
		font-size: 12px;
		font-weight: 500;
		border-radius: 8px;
		white-space: nowrap;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		z-index: 100001;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		transition:
			opacity 0.135s ease,
			transform 0.135s ease,
			visibility 0.135s ease;
	}

	.buttonTooltip::after {
		content: '';
		position: absolute;
		top: calc(100% - 4px);
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		width: 8px;
		height: 8px;
		background: #1a1a1a;
		border-radius: 0 0 2px 0;
	}

	.shortcut {
		margin-left: 4px;
		opacity: 0.5;
	}

	.tooltipBelow .buttonTooltip {
		bottom: auto;
		top: calc(100% + 14px);
		transform: translateX(-50%) scale(0.95);
	}

	.tooltipBelow .buttonTooltip::after {
		top: -4px;
		bottom: auto;
		border-radius: 2px 0 0 0;
	}

	.tooltipBelow .buttonWrapper:hover .buttonTooltip {
		transform: translateX(-50%) scale(1);
	}

	.tooltipsHidden .buttonTooltip {
		opacity: 0 !important;
		visibility: hidden !important;
		transition: none !important;
	}

	.buttonWrapperAlignLeft .buttonTooltip {
		transform: translateX(-12px) scale(0.95);
	}

	.buttonWrapperAlignLeft:hover .buttonTooltip {
		transform: translateX(-12px) scale(1);
	}

	.buttonWrapperAlignLeft .buttonTooltip::after {
		left: 16px;
	}

	.buttonWrapperAlignRight .buttonTooltip {
		transform: translateX(calc(-100% + 12px)) scale(0.95);
	}

	.buttonWrapperAlignRight:hover .buttonTooltip {
		transform: translateX(calc(-100% + 12px)) scale(1);
	}

	.buttonWrapperAlignRight .buttonTooltip::after {
		left: auto;
		right: 8px;
	}

	/* When the toolbar is dragged near the top, the tooltip flips below; the
	   corner-alignment offsets still apply (upstream L707–741). */
	.tooltipBelow .buttonWrapperAlignLeft .buttonTooltip {
		transform: translateX(-12px) scale(0.95);
	}

	.tooltipBelow .buttonWrapperAlignLeft:hover .buttonTooltip {
		transform: translateX(-12px) scale(1);
	}

	.tooltipBelow .buttonWrapperAlignRight .buttonTooltip {
		transform: translateX(calc(-100% + 12px)) scale(0.95);
	}

	.tooltipBelow .buttonWrapperAlignRight:hover .buttonTooltip {
		transform: translateX(calc(-100% + 12px)) scale(1);
	}

	.divider {
		width: 1px;
		height: 12px;
		background: rgba(255, 255, 255, 0.15);
		margin: 0 0.125rem;
	}

	/* ── Overlay ── */
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 99997;
		pointer-events: none;
	}

	.overlay > :global(*) {
		pointer-events: auto;
	}

	.hoverHighlight {
		position: fixed;
		border: 2px solid color-mix(in srgb, var(--agentation-color-accent) 50%, transparent);
		border-radius: 4px;
		background-color: color-mix(in srgb, var(--agentation-color-accent) 4%, transparent);
		pointer-events: none !important;
		box-sizing: border-box;
		will-change: opacity;
		contain: layout style;
	}

	.hoverHighlight.enter {
		animation: hoverHighlightIn 0.12s ease-out forwards;
	}

	.multiSelectOutline {
		position: fixed;
		border: 2px dashed color-mix(in srgb, var(--agentation-color-green) 60%, transparent);
		border-radius: 4px;
		pointer-events: none !important;
		background-color: color-mix(in srgb, var(--agentation-color-green) 5%, transparent);
		box-sizing: border-box;
		will-change: opacity;
	}

	.singleSelectOutline {
		position: fixed;
		border: 2px solid color-mix(in srgb, var(--agentation-color-blue) 60%, transparent);
		border-radius: 4px;
		pointer-events: none !important;
		background-color: color-mix(in srgb, var(--agentation-color-blue) 5%, transparent);
		box-sizing: border-box;
		will-change: opacity;
	}

	.multiSelectOutline.enter,
	.singleSelectOutline.enter {
		animation: fadeIn 0.15s ease-out forwards;
	}

	.hoverTooltip {
		position: fixed;
		font-size: 0.6875rem;
		font-weight: 500;
		color: #fff;
		background: rgba(0, 0, 0, 0.85);
		padding: 0.35rem 0.6rem;
		border-radius: 0.375rem;
		pointer-events: none !important;
		white-space: nowrap;
		max-width: 280px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.hoverTooltip.enter {
		animation: hoverTooltipIn 0.1s ease-out forwards;
	}

	.hoverElementName {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Marker layers ── */
	.markersLayer {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 0;
		z-index: 99998;
		pointer-events: none;
	}

	.markersLayer > :global(*) {
		pointer-events: auto;
	}

	.fixedMarkersLayer {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 99998;
		pointer-events: none;
	}

	.fixedMarkersLayer > :global(*) {
		pointer-events: auto;
	}

	/* ── Light mode (upstream L2137–2223) ──
	   The `[data-agentation-theme="light"]` ancestor is the portal wrapper rendered
	   by this component, so Svelte keeps these scoped rules. DIVERGENCE(upstream):
	   the server-state button variants (`data-error`/`data-auto-sync`/`data-failed`/
	   `data-no-hover`) are dropped here exactly as in the dark cascade above — those
	   states ship with the Phase 4 server path — so the hover `:not()` chains are
	   trimmed to the wired states. */
	[data-agentation-theme='light'] .toolbarContainer {
		background: #fff;
		color: rgba(0, 0, 0, 0.85);
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.06),
			0 0 0 1px rgba(0, 0, 0, 0.04);
	}

	[data-agentation-theme='light'] .toolbarContainer.collapsed:hover {
		background: #f5f5f5;
	}

	[data-agentation-theme='light'] .controlButton {
		color: rgba(0, 0, 0, 0.5);
	}

	[data-agentation-theme='light'] .controlButton:hover:not(:disabled):not([data-active='true']) {
		background: rgba(0, 0, 0, 0.06);
		color: rgba(0, 0, 0, 0.85);
	}

	[data-agentation-theme='light'] .controlButton[data-active='true'] {
		color: var(--agentation-color-blue);
		background: color-mix(in srgb, var(--agentation-color-blue) 15%, transparent);
	}

	[data-agentation-theme='light']
		.controlButton[data-danger]:hover:not(:disabled):not([data-active='true']) {
		color: var(--agentation-color-red);
		background: color-mix(in srgb, var(--agentation-color-red) 15%, transparent);
	}

	[data-agentation-theme='light'] .buttonTooltip {
		background: #fff;
		color: rgba(0, 0, 0, 0.85);
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.06),
			0 0 0 1px rgba(0, 0, 0, 0.04);
	}

	[data-agentation-theme='light'] .buttonTooltip::after {
		background: #fff;
	}

	[data-agentation-theme='light'] .divider {
		background: rgba(0, 0, 0, 0.1);
	}

	/* Theme-toggle flash guard (upstream L166–169). DIVERGENCE(upstream): the class
	   is added imperatively to the portal wrapper for one frame (see
	   `handleToggleTheme`), so the selector is kept `:global` — it disables
	   transitions on every descendant during the switch, which scoped styles can't
	   target via `*`. */
	:global(.disableTransitions :is(*, *::before, *::after)) {
		transition: none !important;
	}
</style>
