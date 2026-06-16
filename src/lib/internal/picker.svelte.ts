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
// Out of scope (issue #17), left as `// DIVERGENCE(upstream):` markers at the
// omission sites:
//   - cmd+shift+click multi-select and multi-select drag (L1944–1980, L2080+)
//     → Phase 3.
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

	// Bound listener references so `removeEventListener` matches on teardown.
	#onMouseMove = (e: MouseEvent) => this.#handleMouseMove(e);
	#onClick = (e: MouseEvent) => this.#handleClick(e);

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
		this.#injectCursor();
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
			this.#removeCursor();
		}
		this.hoverInfo = null;
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
		// DIVERGENCE(upstream): `justFinishedDragRef` guard (L1932–1935) belongs
		// to multi-select drag — Phase 3.

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
