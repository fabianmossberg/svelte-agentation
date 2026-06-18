// =============================================================================
// Picker controller
// =============================================================================
//
// Svelte 5 runes controller for "feedback mode": the toolbar's active/inactive
// state, document-level hover tracking with shadow-DOM-aware hit-testing, and
// click-to-create-pending-annotation. The second of upstream's three toolbar
// state clusters (after `internal/annotations.svelte.ts`, issue #16).
//
// This is a *rewrite* of state upstream keeps inline in the 4.7k-LOC monolith
// `components/page-toolbar-css/index.tsx`. The upstream line ranges this
// mirrors are recorded in PORTING.md. In particular:
//   - `deepElementFromPoint` (L238–251) and `isElementFixed` (L252–264) →
//     the private hit-test helpers below (module-private upstream too).
//   - `isActive` (L342), `hoverInfo`/`hoverPosition` (L372–373) → `$state`.
//   - mousemove handler (L1838–1876) → `#handleMouseMove`.
//   - click handler (L1926–2079) → `#handleClick`.
//   - custom-cursor effect (L1793–1829) → `#injectCursor`/`#removeCursor`.
//   - reset-on-deactivate (L1769–1785) + unmount safety (L1786–1792) →
//     `deactivate()` / `destroy()` imperative teardown.
//
// Like the annotations controller, the lifecycle is driven imperatively
// (`activate`/`deactivate`/`destroy`) rather than through `$effect`, so it is
// deterministic and testable outside an effect-root. Upstream's React version
// expresses the same "listeners live only while active" contract through
// `useEffect` cleanup keyed on `isActive`; we express it by attaching in
// `activate()` and detaching in `deactivate()`.
//
// Multi-select drag (issue #29) is now part of this controller: the mousedown/
// mousemove/mouseup state machine (upstream L2125–2555) lives below alongside the
// hover/click handlers, with all drag visuals written through direct DOM handles
// (`setDragRect`/`setHighlightsContainer`) to avoid per-frame reactivity — exactly
// as upstream uses refs "to avoid re-renders" (index.tsx L616, L2190).
//
// Out of scope (issue #17), left as `// DIVERGENCE(upstream):` markers at the
// omission sites:
//   - cmd+shift+click multi-select (L1944–1980) → Phase 3 (p3-02).
//   - draw-mode / design-mode click branches → Phases 3/6.
//   - the `settings.blockInteractions` interactive-element handling and the
//     pending/editing popup `.shake()` → settings/popup wiring (later issues).
//   - React detection (`identifyElementWithReact`, monolith L97–237): we call
//     the plain `identifyElement` and leave React fields undefined
//     (RESEARCH.md §1).
//   - source-file detection (`detectSourceFile`): `utils/source-location.ts`
//     is React-fiber-bound and unported (Phase 7); `sourceFile` stays undefined.

import {
	closestCrossingShadow,
	identifyElement,
	getNearbyText,
	getNearbyElements,
	getElementClasses,
	getFullElementPath,
	getAccessibilityInfo,
	getDetailedComputedStyles,
	getForensicComputedStyles
} from '../utils/element-identification';
import type { PendingAnnotation } from './annotations.svelte';

/**
 * The element currently under the pointer while feedback mode is active.
 * Mirrors upstream's local `HoverInfo` type (index.tsx L134–140). `element`
 * is the display name and `elementName` the raw element name — identical for
 * us because the React path that would prefix `element` is unported, so they
 * always match. `reactComponents` is kept on the shape for fidelity but stays
 * undefined (React detection is Phase 7).
 */
export type HoverInfo = {
	element: string;
	elementName: string;
	elementPath: string;
	rect: DOMRect | null;
	reactComponents?: string | null;
};

/**
 * Options for {@link PickerController}. The picker never reaches into another
 * controller's state; it reads sibling state through getters and reports the
 * pending annotation it builds through {@link onPick} — the toolbar wires that
 * to the annotations controller's `pending` (issue #16).
 */
export type PickerControllerOptions = {
	/**
	 * Called when a click in feedback mode produces a new pending annotation.
	 * The toolbar assigns the result to the annotations controller's `pending`.
	 * Mirrors upstream's inline `setPendingAnnotation(...)` (index.tsx L2046).
	 */
	onPick: (pending: PendingAnnotation) => void;
	/**
	 * Whether an annotation is currently pending (its popup is open). When true,
	 * hover tracking freezes and clicks do not create a new annotation —
	 * mirroring upstream, whose mousemove effect skips while `pendingAnnotation`
	 * is set (L1840) and whose click handler returns early (L1995). Defaults to
	 * always-false until the toolbar wires it.
	 */
	isPending?: () => boolean;
	/**
	 * Whether an annotation is currently being edited. Same gating as
	 * {@link isPending} (upstream click handler L2003). Defaults to always-false.
	 */
	isEditing?: () => boolean;
	/**
	 * Fired when a click in feedback mode is declined because a popup is already
	 * open (pending or editing) and the click landed outside it. Mirrors upstream,
	 * which shakes the open popup in that case (index.tsx L1995–2009) via the
	 * popup's imperative handle. The toolbar wires this to `popup.shake()` (p2-09).
	 * The picker itself stays popup-agnostic — it only signals the block.
	 */
	onBlocked?: () => void;
};

/**
 * Recursively pierces open shadow roots to find the deepest element at a point.
 * `document.elementFromPoint()` stops at shadow hosts, so we drill into open
 * shadow roots to reach the real target. Port of upstream's module-private
 * `deepElementFromPoint` (index.tsx L238–251), kept verbatim.
 */
function deepElementFromPoint(x: number, y: number): HTMLElement | null {
	let element = document.elementFromPoint(x, y) as HTMLElement | null;
	if (!element) return null;

	// Keep drilling down through shadow roots
	while (element?.shadowRoot) {
		const deeper = element.shadowRoot.elementFromPoint(x, y) as HTMLElement | null;
		if (!deeper || deeper === element) break;
		element = deeper;
	}

	return element;
}

/**
 * Whether `element` (or any ancestor up to `document.body`) is positioned
 * `fixed` or `sticky`. Drives whether an annotation's coordinates are stored
 * viewport-relative (fixed) or document-relative (offset by `scrollY`). Port of
 * upstream's module-private `isElementFixed` (index.tsx L252–264), kept verbatim.
 */
function isElementFixed(element: HTMLElement): boolean {
	let current: HTMLElement | null = element;
	while (current && current !== document.body) {
		const style = window.getComputedStyle(current);
		const position = style.position;
		if (position === 'fixed' || position === 'sticky') {
			return true;
		}
		current = current.parentElement;
	}
	return false;
}

/** `<style>` element id for the injected feedback cursor (upstream L1812). */
const CURSOR_STYLE_ID = 'feedback-cursor-styles';

/** Text-bearing elements that get a `text` cursor instead of the crosshair (upstream L1797–1804). */
const TEXT_ELEMENTS_SELECTOR = [
	'p',
	'span',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'li',
	'td',
	'th',
	'label',
	'blockquote',
	'figcaption',
	'caption',
	'legend',
	'dt',
	'dd',
	'pre',
	'code',
	'em',
	'strong',
	'b',
	'i',
	'u',
	's',
	'a',
	'time',
	'address',
	'cite',
	'q',
	'abbr',
	'dfn',
	'mark',
	'small',
	'sub',
	'sup',
	'[contenteditable]'
].join(', ');

// --- Multi-select drag constants (upstream index.tsx) ------------------------

/** Minimum pointer travel (px) from mousedown before a drag begins (upstream L626). */
const DRAG_THRESHOLD = 8;
/** Min ms between live element-detection passes during a drag (upstream L627). */
const ELEMENT_UPDATE_THROTTLE = 50;
/** className stamped on each imperatively-created live-highlight div (upstream L2386). */
const SELECTED_HIGHLIGHT_CLASS = 'selectedElementHighlight';

/**
 * Tags that must NOT start a drag, so native text selection keeps working
 * (upstream's `textTags` set, L2138–2176). Uppercase to match `tagName`.
 */
const DRAG_EXCLUDED_TEXT_TAGS = new Set([
	'P',
	'SPAN',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'LI',
	'TD',
	'TH',
	'LABEL',
	'BLOCKQUOTE',
	'FIGCAPTION',
	'CAPTION',
	'LEGEND',
	'DT',
	'DD',
	'PRE',
	'CODE',
	'EM',
	'STRONG',
	'B',
	'I',
	'U',
	'S',
	'A',
	'TIME',
	'ADDRESS',
	'CITE',
	'Q',
	'ABBR',
	'DFN',
	'MARK',
	'SMALL',
	'SUB',
	'SUP'
]);

/** Broad query for live-highlight candidates while dragging (upstream L2258–2260). */
const DRAG_CANDIDATE_QUERY =
	'button, a, input, img, p, h1, h2, h3, h4, h5, h6, li, label, td, th, div, span, section, article, aside, nav';

/** Tags always treated as meaningful for the live highlight (upstream L2290–2310). */
const DRAG_MEANINGFUL_TAGS = new Set([
	'BUTTON',
	'A',
	'INPUT',
	'IMG',
	'P',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'LI',
	'LABEL',
	'TD',
	'TH',
	'SECTION',
	'ARTICLE',
	'ASIDE',
	'NAV'
]);

/** Final candidate selector used on mouseup to build the annotation (upstream L2420–2421). */
const MULTISELECT_FINAL_SELECTOR =
	'button, a, input, img, p, h1, h2, h3, h4, h5, h6, li, label, td, th';

export class PickerController {
	#options: PickerControllerOptions;
	#isPending: () => boolean;
	#isEditing: () => boolean;
	#onBlocked: () => void;

	/** Whether feedback mode is active. Read-only to callers; toggle via the methods. */
	#active = $state(false);
	/** The element under the pointer while active, or null. */
	hoverInfo = $state<HoverInfo | null>(null);
	/** Last pointer position (viewport coords) while active (upstream L373). */
	hoverPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });

	// --- Multi-select drag state (upstream L616–624) -------------------------
	// `isDragging` is reactive because it gates *mounting* the overlay's drag-rect
	// + highlights divs (a once-per-drag event). Everything else is a plain
	// "ref-like" field: upstream keeps these as `useRef` "to avoid re-renders"
	// (L616), and the per-frame visual writes go straight to the bound DOM handles
	// below — never through reactive state.

	/** Whether a multi-select drag is in progress (upstream `isDragging`, L617). */
	isDragging = $state(false);
	/** Pointer position at mousedown, before the threshold is crossed (`mouseDownPosRef`, L618). */
	#mouseDownPos: { x: number; y: number } | null = null;
	/** Anchor corner of the active drag rectangle (`dragStartRef`, L619). */
	#dragStart: { x: number; y: number } | null = null;
	/** Set on mouseup so the trailing `click` is swallowed (`justFinishedDragRef`, L622). */
	#justFinishedDrag = false;
	/** Timestamp of the last live element-detection pass (`lastElementUpdateRef`, L623). */
	#lastElementUpdate = 0;
	/** The drag-rectangle div (upstream `dragRectRef`, L620) — set by the toolbar. */
	#dragRectEl: HTMLElement | null = null;
	/** The live-highlights container div (upstream `highlightsContainerRef`, L621). */
	#highlightsContainerEl: HTMLElement | null = null;

	// Bound listener references so `removeEventListener` matches on teardown.
	#onMouseMove = (e: MouseEvent) => this.#handleMouseMove(e);
	#onClick = (e: MouseEvent) => this.#handleClick(e);
	#onMouseDown = (e: MouseEvent) => this.#handleMouseDown(e);
	#onDragMouseMove = (e: MouseEvent) => this.#handleDragMouseMove(e);
	#onMouseUp = (e: MouseEvent) => this.#handleMouseUp(e);

	constructor(options: PickerControllerOptions) {
		this.#options = options;
		this.#isPending = options.isPending ?? (() => false);
		this.#isEditing = options.isEditing ?? (() => false);
		this.#onBlocked = options.onBlocked ?? (() => {});
	}

	/** Whether feedback mode is active (read-only view). */
	get isActive(): boolean {
		return this.#active;
	}

	/**
	 * Enter feedback mode: register document listeners and inject the custom
	 * cursor. Idempotent. SSR-safe — no-op without a `document`. Mirrors the
	 * `setIsActive(true)` path plus the listener/cursor effects (upstream
	 * L1836–1837, L1828) firing on activation.
	 */
	activate(): void {
		if (this.#active) return;
		if (typeof document === 'undefined') return;

		this.#active = true;
		document.addEventListener('mousemove', this.#onMouseMove);
		// Capture phase to intercept before element handlers (upstream L2073).
		document.addEventListener('click', this.#onClick, true);
		// Multi-select drag listeners (upstream L2186/L2397/L2553). The drag
		// mousemove is passive to match upstream L2397 (its `preventDefault` call is
		// a deliberate no-op there too); mousedown's `preventDefault` is the one that
		// actually suppresses native text selection.
		document.addEventListener('mousedown', this.#onMouseDown);
		document.addEventListener('mousemove', this.#onDragMouseMove, { passive: true });
		document.addEventListener('mouseup', this.#onMouseUp);
		this.#injectCursor();
	}

	/**
	 * Hand the controller the overlay's drag-rectangle div (or null on unmount).
	 * The toolbar renders the div under `{#if picker.isDragging}` and binds it
	 * here; per-frame geometry is then written straight to it (upstream's
	 * `dragRectRef`, L620), bypassing reactivity for 60fps updates.
	 */
	setDragRect(el: HTMLElement | null): void {
		this.#dragRectEl = el;
	}

	/**
	 * Hand the controller the overlay's live-highlights container (or null on
	 * unmount). Highlight child divs are created/positioned imperatively inside it
	 * (upstream's `highlightsContainerRef`, L621).
	 */
	setHighlightsContainer(el: HTMLElement | null): void {
		this.#highlightsContainerEl = el;
	}

	/**
	 * Leave feedback mode: remove listeners, restore the cursor, and clear hover
	 * state. Idempotent. Mirrors upstream's `deactivate` (L1628–1641) followed
	 * by the reset-on-deactivate effect (L1769–1785) — minus the pending/editing
	 * reset, which is the annotations controller's state and is coordinated by
	 * the toolbar.
	 */
	deactivate(): void {
		if (!this.#active) return;

		this.#active = false;
		if (typeof document !== 'undefined') {
			document.removeEventListener('mousemove', this.#onMouseMove);
			document.removeEventListener('click', this.#onClick, true);
			document.removeEventListener('mousedown', this.#onMouseDown);
			document.removeEventListener('mousemove', this.#onDragMouseMove);
			document.removeEventListener('mouseup', this.#onMouseUp);
			this.#removeCursor();
		}
		this.hoverInfo = null;
		this.#resetDrag();
	}

	/**
	 * Tear down everything regardless of state — the component calls this on
	 * unmount so listeners and the injected cursor never outlive the toolbar.
	 * Mirrors upstream's unmount-safety effect cleanup (L1786–1792) and the
	 * listener/cursor effects' own cleanup on unmount.
	 */
	destroy(): void {
		this.deactivate();
	}

	/**
	 * Hover handler — port of upstream's mousemove effect body (index.tsx
	 * L1841–1871). Resolves the real target through `composedPath`/shadow DOM,
	 * ignores toolbar-owned elements, and records the hovered element's name,
	 * path, and rect plus the pointer position.
	 */
	#handleMouseMove(e: MouseEvent): void {
		// Hover freezes while a popup is open (upstream skips the effect entirely
		// when `pendingAnnotation`/draw/design is set — L1840).
		if (this.#isPending() || this.#isEditing()) return;

		// Use composedPath to get the actual target inside shadow DOM.
		const target = (e.composedPath()[0] || e.target) as HTMLElement;
		if (closestCrossingShadow(target, '[data-feedback-toolbar]')) {
			this.hoverInfo = null;
			return;
		}

		const elementUnder = deepElementFromPoint(e.clientX, e.clientY);
		if (!elementUnder || closestCrossingShadow(elementUnder, '[data-feedback-toolbar]')) {
			this.hoverInfo = null;
			return;
		}

		// DIVERGENCE(upstream): upstream calls `identifyElementWithReact` and
		// reads `{ name, elementName, path, reactComponents }`; we call the plain
		// `identifyElement` (React detection is Phase 7), so `name === elementName`
		// and `reactComponents` is undefined.
		const { name, path } = identifyElement(elementUnder);
		const rect = elementUnder.getBoundingClientRect();

		this.hoverInfo = {
			element: name,
			elementName: name,
			elementPath: path,
			rect,
			reactComponents: undefined
		};
		this.hoverPosition = { x: e.clientX, y: e.clientY };
	}

	/**
	 * Click handler — port of upstream's click effect body (index.tsx
	 * L1929–2071), reduced to the single-click create path. Hit-tests the point,
	 * identifies the element, and builds the pending-annotation data, handing it
	 * to {@link PickerControllerOptions.onPick}.
	 */
	#handleClick(e: MouseEvent): void {
		// Swallow the click that the browser fires right after a multi-select drag,
		// so a drag never also creates a single-element annotation (upstream
		// L1931–1934). `#justFinishedDrag` is set in `#handleMouseUp`.
		if (this.#justFinishedDrag) {
			this.#justFinishedDrag = false;
			return;
		}

		// Use composedPath to get the actual target inside shadow DOM, falling
		// back to e.target (upstream L1938).
		const target = (e.composedPath()[0] || e.target) as HTMLElement;

		if (closestCrossingShadow(target, '[data-feedback-toolbar]')) return;
		if (closestCrossingShadow(target, '[data-annotation-popup]')) return;
		if (closestCrossingShadow(target, '[data-annotation-marker]')) return;

		// DIVERGENCE(upstream): cmd+shift+click multi-select (L1944–1980) — Phase 3.
		// DIVERGENCE(upstream): the `settings.blockInteractions` interactive-element
		// branch (L1982–1993) — settings controller, later issue.

		// When a popup is open, upstream shakes it (L1995–2009) via the popup's
		// imperative handle. The picker stays popup-agnostic: it fires `onBlocked`
		// so the toolbar (which owns the popup refs) can call `popup.shake()`, and
		// declines to create a second pending annotation. The earlier
		// `[data-annotation-popup]` guard already lets clicks *inside* the popup
		// through, so `onBlocked` only fires for clicks outside it — matching
		// upstream's shake-on-outside-click semantics.
		if (this.#isPending() || this.#isEditing()) {
			this.#onBlocked();
			return;
		}

		e.preventDefault();

		const elementUnder = deepElementFromPoint(e.clientX, e.clientY);
		if (!elementUnder) return;

		// DIVERGENCE(upstream): plain `identifyElement` (see `#handleMouseMove`).
		const { name, path } = identifyElement(elementUnder);
		const rect = elementUnder.getBoundingClientRect();
		const x = (e.clientX / window.innerWidth) * 100;

		const isFixed = isElementFixed(elementUnder);
		const y = isFixed ? e.clientY : e.clientY + window.scrollY;

		const selection = window.getSelection();
		let selectedText: string | undefined;
		if (selection && selection.toString().trim().length > 0) {
			selectedText = selection.toString().trim().slice(0, 500);
		}

		// Capture computed styles — filtered for the popup, full for forensic output.
		const computedStylesObj = getDetailedComputedStyles(elementUnder);
		const computedStylesStr = getForensicComputedStyles(elementUnder);

		this.#options.onPick({
			x,
			y,
			clientY: e.clientY,
			element: name,
			elementPath: path,
			selectedText,
			boundingBox: {
				x: rect.left,
				y: isFixed ? rect.top : rect.top + window.scrollY,
				width: rect.width,
				height: rect.height
			},
			nearbyText: getNearbyText(elementUnder),
			cssClasses: getElementClasses(elementUnder),
			isFixed,
			fullPath: getFullElementPath(elementUnder),
			accessibility: getAccessibilityInfo(elementUnder),
			computedStyles: computedStylesStr,
			computedStylesObj,
			nearbyElements: getNearbyElements(elementUnder),
			// DIVERGENCE(upstream): React-only field (L2068) — unpopulated (Phase 7).
			reactComponents: undefined,
			// DIVERGENCE(upstream): `detectSourceFile` (L2069) is React-fiber-bound
			// (`utils/source-location.ts` unported) — stays undefined (Phase 7).
			sourceFile: undefined,
			targetElement: elementUnder // stored for live position queries
		});

		this.hoverInfo = null;
	}

	/**
	 * Drag mousedown — port of upstream's mousedown effect body (index.tsx
	 * L2129–2184). Records the anchor point unless the press lands on toolbar UI
	 * or a text-bearing/contentEditable element (which keep native text selection).
	 */
	#handleMouseDown(e: MouseEvent): void {
		// DIVERGENCE(upstream): the `isDrawMode`/`isDesignMode` gate (L2127) is
		// Phase 3/6; `isActive` is implicit (listener only attached while active).
		if (this.#isPending()) return;

		// Use composedPath to get the actual target inside shadow DOM (upstream L2131).
		const target = (e.composedPath()[0] || e.target) as HTMLElement;

		if (closestCrossingShadow(target, '[data-feedback-toolbar]')) return;
		if (closestCrossingShadow(target, '[data-annotation-marker]')) return;
		if (closestCrossingShadow(target, '[data-annotation-popup]')) return;

		// Don't start a drag on text elements — allow native text selection (L2178).
		if (DRAG_EXCLUDED_TEXT_TAGS.has(target.tagName) || target.isContentEditable) return;

		e.preventDefault(); // Prevent text selection during drag-area annotation (L2182).
		this.#mouseDownPos = { x: e.clientX, y: e.clientY };
	}

	/**
	 * Drag mousemove — port of upstream's optimized mousemove effect body
	 * (index.tsx L2194–2394). Once the threshold is crossed it sizes the drag
	 * rectangle and re-renders the live element highlights, all via direct DOM
	 * writes (no reactive state) so the rectangle tracks at 60fps.
	 */
	#handleDragMouseMove(e: MouseEvent): void {
		if (this.#isPending()) return;
		if (!this.#mouseDownPos) return;

		const dx = e.clientX - this.#mouseDownPos.x;
		const dy = e.clientY - this.#mouseDownPos.y;
		const distance = dx * dx + dy * dy;
		const thresholdSq = DRAG_THRESHOLD * DRAG_THRESHOLD;

		if (!this.isDragging && distance >= thresholdSq) {
			this.#dragStart = this.#mouseDownPos;
			this.isDragging = true;
			// DIVERGENCE(upstream): upstream calls `e.preventDefault()` here (L2205)
			// but registers this listener `{ passive: true }` (L2397), so it is a
			// no-op there too; mousedown's preventDefault is what suppresses selection.
		}

		if (!((this.isDragging || distance >= thresholdSq) && this.#dragStart)) return;

		// Direct DOM update for the drag rectangle — no reactive state (upstream
		// L2210). `#dragRectEl` is null for the first frame after `isDragging`
		// flips (the overlay div hasn't mounted yet) — same one-frame lag upstream
		// tolerates with `if (dragRectRef.current)`.
		if (this.#dragRectEl) {
			const left = Math.min(this.#dragStart.x, e.clientX);
			const top = Math.min(this.#dragStart.y, e.clientY);
			const width = Math.abs(e.clientX - this.#dragStart.x);
			const height = Math.abs(e.clientY - this.#dragStart.y);
			this.#dragRectEl.style.transform = `translate(${left}px, ${top}px)`;
			this.#dragRectEl.style.width = `${width}px`;
			this.#dragRectEl.style.height = `${height}px`;
		}

		// Throttle the (expensive) element detection (upstream L2221).
		const now = Date.now();
		if (now - this.#lastElementUpdate < ELEMENT_UPDATE_THROTTLE) return;
		this.#lastElementUpdate = now;

		const matching = this.#detectLiveHighlights(this.#dragStart, e.clientX, e.clientY);
		this.#renderLiveHighlights(matching);
	}

	/**
	 * Collect the bounding rects to highlight for the current drag box. Port of
	 * upstream's candidate gathering + filtering (index.tsx L2227–2373): sample
	 * nine points, union with a broad `querySelectorAll`, keep meaningful tags
	 * (and content-bearing div/span) that intersect the box and aren't dominated
	 * by an already-kept rect.
	 */
	#detectLiveHighlights(
		dragStart: { x: number; y: number },
		clientX: number,
		clientY: number
	): DOMRect[] {
		const left = Math.min(dragStart.x, clientX);
		const top = Math.min(dragStart.y, clientY);
		const right = Math.max(dragStart.x, clientX);
		const bottom = Math.max(dragStart.y, clientY);
		const midX = (left + right) / 2;
		const midY = (top + bottom) / 2;

		// Sample corners, edge midpoints, and center for element detection (L2238).
		// A plain Set is correct here: it's a transient per-call dedup accumulator,
		// not reactive state — `SvelteSet` would add proxy overhead to this hot,
		// throttled-per-frame path for nothing.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- transient local, never reactive
		const candidateElements = new Set<HTMLElement>();
		const points = [
			[left, top],
			[right, top],
			[left, bottom],
			[right, bottom],
			[midX, midY],
			[midX, top],
			[midX, bottom],
			[left, midY],
			[right, midY]
		];
		for (const [x, y] of points) {
			for (const el of document.elementsFromPoint(x, y)) {
				if (el instanceof HTMLElement) candidateElements.add(el);
			}
		}

		// Also fold in nearby elements whose center is inside the box or which
		// overlap it significantly (upstream L2258–2287).
		for (const el of document.querySelectorAll(DRAG_CANDIDATE_QUERY)) {
			if (!(el instanceof HTMLElement)) continue;
			const rect = el.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const centerInside =
				centerX >= left && centerX <= right && centerY >= top && centerY <= bottom;

			const overlapX = Math.min(rect.right, right) - Math.max(rect.left, left);
			const overlapY = Math.min(rect.bottom, bottom) - Math.max(rect.top, top);
			const overlapArea = overlapX > 0 && overlapY > 0 ? overlapX * overlapY : 0;
			const elementArea = rect.width * rect.height;
			const overlapRatio = elementArea > 0 ? overlapArea / elementArea : 0;

			if (centerInside || overlapRatio > 0.5) candidateElements.add(el);
		}

		const allMatching: DOMRect[] = [];
		for (const el of candidateElements) {
			if (
				closestCrossingShadow(el, '[data-feedback-toolbar]') ||
				closestCrossingShadow(el, '[data-annotation-marker]')
			)
				continue;

			const rect = el.getBoundingClientRect();
			if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.5) continue;
			if (rect.width < 10 || rect.height < 10) continue;

			if (!(rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top))
				continue;

			const tagName = el.tagName;
			let shouldInclude = DRAG_MEANINGFUL_TAGS.has(tagName);

			// For divs and spans, only include if they carry meaningful content and
			// aren't just a wrapper around other meaningful tags (upstream L2337–2353).
			if (!shouldInclude && (tagName === 'DIV' || tagName === 'SPAN')) {
				const hasText = !!el.textContent && el.textContent.trim().length > 0;
				const isInteractive =
					el.onclick !== null ||
					el.getAttribute('role') === 'button' ||
					el.getAttribute('role') === 'link' ||
					el.classList.contains('clickable') ||
					el.hasAttribute('data-clickable');

				if (
					(hasText || isInteractive) &&
					!el.querySelector('p, h1, h2, h3, h4, h5, h6, button, a')
				) {
					shouldInclude = true;
				}
			}

			if (!shouldInclude) continue;

			// Drop this rect if an already-kept rect fully contains it (keep the
			// smaller, more specific element — upstream L2356–2369).
			const dominated = allMatching.some(
				(existing) =>
					existing.left <= rect.left &&
					existing.right >= rect.right &&
					existing.top <= rect.top &&
					existing.bottom >= rect.bottom
			);
			if (!dominated) allMatching.push(rect);
		}

		return allMatching;
	}

	/**
	 * Reconcile the highlights container's child divs to `matching`, reusing and
	 * repositioning existing divs (upstream L2376–2392). Imperative DOM, so the
	 * divs carry a plain {@link SELECTED_HIGHLIGHT_CLASS} the toolbar styles via a
	 * scoped `:global(...)` rule.
	 */
	#renderLiveHighlights(matching: DOMRect[]): void {
		const container = this.#highlightsContainerEl;
		if (!container) return;

		while (container.children.length > matching.length) {
			container.removeChild(container.lastChild!);
		}
		matching.forEach((rect, i) => {
			let div = container.children[i] as HTMLDivElement | undefined;
			if (!div) {
				div = document.createElement('div');
				div.className = SELECTED_HIGHLIGHT_CLASS;
				container.appendChild(div);
			}
			div.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
			div.style.width = `${rect.width}px`;
			div.style.height = `${rect.height}px`;
		});
	}

	/**
	 * Drag mouseup — port of upstream's mouseup effect body (index.tsx
	 * L2405–2550). On a real drag it does a final element pass and builds either a
	 * multi-element pending annotation (combined bounds + first-element forensics)
	 * or, over empty space ≥ 20×20px, an "Area selection". Always resets drag state.
	 */
	#handleMouseUp(e: MouseEvent): void {
		const wasDragging = this.isDragging;
		const dragStart = this.#dragStart;

		if (this.isDragging && dragStart) {
			this.#justFinishedDrag = true;

			const left = Math.min(dragStart.x, e.clientX);
			const top = Math.min(dragStart.y, e.clientY);
			const right = Math.max(dragStart.x, e.clientX);
			const bottom = Math.max(dragStart.y, e.clientY);

			// Final element detection for an accurate count (upstream L2419–2448).
			const allMatching: { element: HTMLElement; rect: DOMRect }[] = [];
			document.querySelectorAll(MULTISELECT_FINAL_SELECTOR).forEach((el) => {
				if (!(el instanceof HTMLElement)) return;
				if (
					closestCrossingShadow(el, '[data-feedback-toolbar]') ||
					closestCrossingShadow(el, '[data-annotation-marker]')
				)
					return;

				const rect = el.getBoundingClientRect();
				if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.5) return;
				if (rect.width < 10 || rect.height < 10) return;

				if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
					allMatching.push({ element: el, rect });
				}
			});

			// Drop parents that contain another matched element (upstream L2450–2456).
			const finalElements = allMatching.filter(
				({ element: el }) =>
					!allMatching.some(({ element: other }) => other !== el && el.contains(other))
			);

			const x = (e.clientX / window.innerWidth) * 100;
			const y = e.clientY + window.scrollY;

			if (finalElements.length > 0) {
				const bounds = finalElements.reduce(
					(acc, { rect }) => ({
						left: Math.min(acc.left, rect.left),
						top: Math.min(acc.top, rect.top),
						right: Math.max(acc.right, rect.right),
						bottom: Math.max(acc.bottom, rect.bottom)
					}),
					{ left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
				);

				// DIVERGENCE(upstream): plain `identifyElement` (see `#handleMouseMove`).
				const elementNames = finalElements
					.slice(0, 5)
					.map(({ element }) => identifyElement(element).name)
					.join(', ');
				const suffix = finalElements.length > 5 ? ` +${finalElements.length - 5} more` : '';

				// Forensic fields come from the first element (upstream L2487–2514;
				// `generate-output.ts` L65–67 notes the data is the first element's).
				const firstElement = finalElements[0].element;

				this.#options.onPick({
					x,
					y,
					clientY: e.clientY,
					element: `${finalElements.length} elements: ${elementNames}${suffix}`,
					elementPath: 'multi-select',
					boundingBox: {
						x: bounds.left,
						y: bounds.top + window.scrollY,
						width: bounds.right - bounds.left,
						height: bounds.bottom - bounds.top
					},
					isMultiSelect: true,
					// Forensic data from the first element.
					fullPath: getFullElementPath(firstElement),
					accessibility: getAccessibilityInfo(firstElement),
					computedStyles: getForensicComputedStyles(firstElement),
					computedStylesObj: getDetailedComputedStyles(firstElement),
					nearbyElements: getNearbyElements(firstElement),
					cssClasses: getElementClasses(firstElement),
					nearbyText: getNearbyText(firstElement),
					// DIVERGENCE(upstream): `detectSourceFile` (L2514) is React-fiber-bound
					// (`utils/source-location.ts` unported) — stays undefined (Phase 7).
					sourceFile: undefined
				});
			} else {
				// No elements matched, but allow an annotation on a meaningful empty
				// area (upstream L2516–2538).
				const width = Math.abs(right - left);
				const height = Math.abs(bottom - top);
				if (width > 20 && height > 20) {
					this.#options.onPick({
						x,
						y,
						clientY: e.clientY,
						element: 'Area selection',
						elementPath: `region at (${Math.round(left)}, ${Math.round(top)})`,
						boundingBox: { x: left, y: top + window.scrollY, width, height },
						isMultiSelect: true
					});
				}
			}
			this.hoverInfo = null;
		} else if (wasDragging) {
			// Threshold crossed but no anchor (shouldn't normally happen) — still
			// swallow the trailing click (upstream L2540–2542).
			this.#justFinishedDrag = true;
		}

		this.#resetDrag();
	}

	/**
	 * Reset all drag state and empty the highlights container (upstream L2544–2550,
	 * reused on deactivate/destroy). Leaves `#justFinishedDrag` alone — it must
	 * survive until the trailing `click` reads it.
	 */
	#resetDrag(): void {
		this.#mouseDownPos = null;
		this.#dragStart = null;
		this.isDragging = false;
		if (this.#highlightsContainerEl) this.#highlightsContainerEl.innerHTML = '';
	}

	/**
	 * Inject the feedback cursor stylesheet (crosshair everywhere, text cursor
	 * over text elements), excluding the toolbar's own subtree. Port of
	 * upstream's custom-cursor effect (index.tsx L1793–1827).
	 */
	#injectCursor(): void {
		const notAgentationSelector = `:not([data-agentation-root]):not([data-agentation-root] *)`;

		const style = document.createElement('style');
		style.id = CURSOR_STYLE_ID;
		// Text elements get a text cursor (higher specificity via the body prefix);
		// everything else gets the crosshair.
		style.textContent = `
			body ${notAgentationSelector} {
				cursor: crosshair !important;
			}

			body :is(${TEXT_ELEMENTS_SELECTOR})${notAgentationSelector} {
				cursor: text !important;
			}
		`;
		document.head.appendChild(style);
	}

	/** Remove the injected cursor stylesheet (upstream effect cleanup L1824–1827). */
	#removeCursor(): void {
		const existingStyle = document.getElementById(CURSOR_STYLE_ID);
		if (existingStyle) existingStyle.remove();
	}
}
