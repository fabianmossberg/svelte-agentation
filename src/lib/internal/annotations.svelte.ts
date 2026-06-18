// =============================================================================
// Annotations controller
// =============================================================================
//
// Svelte 5 runes controller owning the annotation list and its lifecycle
// (add → edit → delete → clear all), persisting through `utils/storage.ts`.
//
// This is a *rewrite* of the first of upstream's three toolbar state clusters.
// Upstream keeps this state as ~10 `useState`s inside the 4.7k-LOC monolith
// `components/page-toolbar-css/index.tsx`; we decompose it here. The upstream
// line ranges this mirrors are recorded in PORTING.md.
//
// Scope (issue #16): the pure list state machine only. Everything stripped
// from the upstream handlers below is out of scope and lives elsewhere:
//   - marker enter/exit animation, `exitingMarkers`, `deletingMarkerId`,
//     `renumberFrom`, `animatedMarkers`, every `originalSetTimeout` → markers
//     controller (p2-03).
//   - server sync (`syncAnnotation`/`deleteAnnotationFromServer`/…), webhooks,
//     the endpoint/session protocol-field stamping in `addAnnotation` → Phase 4.
//   - editing target-element DOM live-tracking (`editingTargetElement(s)`) →
//     picker/markers controllers.

import type { Annotation } from '../types';
import {
	loadAnnotations,
	saveAnnotations,
	saveAnnotationsWithSyncMarker,
	clearAnnotations
} from '../utils/storage';

// Mirrors upstream `isRenderableAnnotation` (index.tsx L265–268): resolved and
// dismissed annotations are not shown. Upstream filters with this on load and
// when computing `visibleAnnotations`; we do both.
function isRenderableAnnotation(annotation: Annotation): boolean {
	return annotation.status !== 'resolved' && annotation.status !== 'dismissed';
}

/**
 * Shape of a not-yet-committed annotation, mirroring upstream's
 * `pendingAnnotation` state (index.tsx L374–403). The picker (Phase 3)
 * produces this when the user clicks/selects an element; `add()` reads its
 * data fields to build the committed {@link Annotation}.
 *
 * The element references (`targetElement`, `multiSelectElements`) and
 * `clientY`/`computedStylesObj` exist on upstream's shape for live position
 * queries and are kept here for fidelity, but this controller never touches
 * them — they belong to the picker/markers controllers.
 */
export type PendingAnnotation = {
	x: number;
	y: number;
	clientY: number;
	element: string;
	elementPath: string;
	selectedText?: string;
	boundingBox?: { x: number; y: number; width: number; height: number };
	nearbyText?: string;
	cssClasses?: string;
	isMultiSelect?: boolean;
	isFixed?: boolean;
	fullPath?: string;
	accessibility?: string;
	computedStyles?: string;
	computedStylesObj?: Record<string, string>;
	nearbyElements?: string;
	reactComponents?: string;
	sourceFile?: string;
	elementBoundingBoxes?: Array<{ x: number; y: number; width: number; height: number }>;
	multiSelectElements?: HTMLElement[];
	targetElement?: HTMLElement;
};

/**
 * Options for {@link AnnotationsController}. The `on*` callbacks mirror
 * upstream's public props (index.tsx L292–299) so a later issue can wire the
 * toolbar's `onAnnotationAdd` / `onAnnotationUpdate` / `onAnnotationDelete` /
 * `onAnnotationsClear` without modifying the controller.
 */
export type AnnotationsControllerOptions = {
	/** Storage key namespace — upstream uses the page pathname. */
	pathname: string;
	/**
	 * Current sync session id, if connected. When present, persistence stamps
	 * each annotation with a `_syncedTo` marker (upstream save effect L1222–1230)
	 * to prevent re-upload on refresh. The actual syncing is Phase 4; this only
	 * preserves the marker that `utils/storage.ts` already understands.
	 */
	sessionId?: () => string | null | undefined;
	/** Fired after an annotation is added (upstream `onAnnotationAdd`). */
	onAnnotationAdd?: (annotation: Annotation) => void;
	/** Fired after an annotation's comment is edited (upstream `onAnnotationUpdate`). */
	onAnnotationUpdate?: (annotation: Annotation) => void;
	/** Fired after an annotation is deleted (upstream `onAnnotationDelete`). */
	onAnnotationDelete?: (annotation: Annotation) => void;
	/** Fired with all annotations before clearing (upstream `onAnnotationsClear`). */
	onAnnotationsClear?: (annotations: Annotation[]) => void;
	/**
	 * Clock for `timestamp` (defaults to `Date.now`). Injectable for tests.
	 * Upstream uses `Date.now()` directly (index.tsx L2602).
	 */
	now?: () => number;
	/**
	 * Id generator (defaults to `Date.now().toString()`, matching upstream
	 * index.tsx L2596). Injectable so tests can hand out collision-free ids.
	 */
	generateId?: () => string;
};

export class AnnotationsController {
	#options: AnnotationsControllerOptions;
	#now: () => number;
	#generateId: () => string;

	/** Committed annotations. Read-only to callers; mutate via the methods. */
	#annotations = $state<Annotation[]>([]);
	/** The element the user is annotating but hasn't committed a comment for. */
	pending = $state<PendingAnnotation | null>(null);
	/** The annotation whose comment is currently being edited, if any. */
	editing = $state<Annotation | null>(null);

	/**
	 * Annotations the toolbar renders, mirroring upstream's inline filter
	 * (index.tsx L3510–3513): exclude resolved/dismissed (L265–268) and the
	 * placement/rearrange kinds (those render through design mode, not markers).
	 * The `exitingMarkers` part of upstream's filter is animation state and
	 * lives in the markers controller (p2-03).
	 */
	readonly visibleAnnotations = $derived.by(() =>
		this.#annotations.filter(
			(a) => isRenderableAnnotation(a) && a.kind !== 'placement' && a.kind !== 'rearrange'
		)
	);

	constructor(options: AnnotationsControllerOptions) {
		this.#options = options;
		this.#now = options.now ?? (() => Date.now());
		this.#generateId = options.generateId ?? (() => Date.now().toString());
		this.load();
	}

	/** The committed annotation list (read-only view). */
	get annotations(): Annotation[] {
		return this.#annotations;
	}

	/**
	 * (Re)load annotations from storage, filtering out non-renderable ones —
	 * mirrors upstream's mount-and-load effect (index.tsx L684–685). SSR-safe:
	 * `loadAnnotations` returns `[]` when `window` is undefined.
	 */
	load(): void {
		const stored = loadAnnotations<Annotation>(this.#options.pathname);
		this.#annotations = stored.filter(isRenderableAnnotation);
	}

	/**
	 * Commit the pending annotation with `comment`. No-op if nothing is pending.
	 * Mirrors upstream `addAnnotation` (index.tsx L2591–2629, L2641) minus the
	 * animation and server-sync side effects. Clears the browser text selection
	 * on save (upstream L2651), so the text captured into `selectedText` stops
	 * being visually selected once it lives on the annotation.
	 */
	add(comment: string): void {
		const pending = this.pending;
		if (!pending) return;

		const newAnnotation: Annotation = {
			id: this.#generateId(),
			x: pending.x,
			y: pending.y,
			comment,
			element: pending.element,
			elementPath: pending.elementPath,
			timestamp: this.#now(),
			selectedText: pending.selectedText,
			boundingBox: pending.boundingBox,
			nearbyText: pending.nearbyText,
			cssClasses: pending.cssClasses,
			isMultiSelect: pending.isMultiSelect,
			isFixed: pending.isFixed,
			fullPath: pending.fullPath,
			accessibility: pending.accessibility,
			computedStyles: pending.computedStyles,
			nearbyElements: pending.nearbyElements,
			reactComponents: pending.reactComponents,
			sourceFile: pending.sourceFile,
			elementBoundingBoxes: pending.elementBoundingBoxes
		};

		this.#annotations = [...this.#annotations, newAnnotation];
		this.pending = null;
		this.#persist();
		this.#options.onAnnotationAdd?.(newAnnotation);

		// Clear the browser text selection the picker captured into `selectedText`
		// (upstream `window.getSelection()?.removeAllRanges()`, index.tsx L2651).
		// SSR-safe: no-op without `window`.
		if (typeof window !== 'undefined') {
			window.getSelection()?.removeAllRanges();
		}
	}

	/**
	 * Discard the pending annotation. Mirrors upstream `cancelAnnotation`
	 * (index.tsx L2690–2696) minus the exit animation.
	 */
	cancelPending(): void {
		this.pending = null;
	}

	/**
	 * Open `annotation` for comment editing. Mirrors upstream
	 * `startEditAnnotation` (index.tsx L1878–1879); the target-element DOM
	 * live-tracking it also sets up belongs to the picker/markers controllers.
	 */
	startEdit(annotation: Annotation): void {
		this.editing = annotation;
	}

	/**
	 * Apply `newComment` to the annotation being edited, then close the editor.
	 * No-op if nothing is being edited. Mirrors upstream `updateAnnotation`
	 * (index.tsx L2816–2829): only `comment` changes (L2820).
	 */
	update(newComment: string): void {
		const editing = this.editing;
		if (!editing) return;

		const updatedAnnotation: Annotation = { ...editing, comment: newComment };
		this.#annotations = this.#annotations.map((a) => (a.id === editing.id ? updatedAnnotation : a));
		this.editing = null;
		this.#persist();
		this.#options.onAnnotationUpdate?.(updatedAnnotation);
	}

	/**
	 * Close the editor without saving. Mirrors upstream `cancelEditAnnotation`
	 * (index.tsx L2857–2864) minus the exit animation.
	 */
	cancelEdit(): void {
		this.editing = null;
	}

	/**
	 * Delete the annotation with `id`. Mirrors upstream `deleteAnnotation`
	 * (index.tsx L2699–2736) minus the exit-animation, renumber bookkeeping
	 * (`deletedIndex`/`renumberFrom` → markers controller), and server sync.
	 * If the deleted annotation is the one being edited, the editor is closed
	 * (upstream L2705–2713).
	 */
	remove(id: string): void {
		const deletedAnnotation = this.#annotations.find((a) => a.id === id);

		if (this.editing?.id === id) {
			this.editing = null;
		}

		this.#annotations = this.#annotations.filter((a) => a.id !== id);
		this.#persist();

		if (deletedAnnotation) {
			this.#options.onAnnotationDelete?.(deletedAnnotation);
		}
	}

	/**
	 * Remove every annotation. No-op when the list is already empty. Mirrors
	 * upstream `clearAll` (index.tsx L2868–2941) minus the staggered animation,
	 * draw-stroke/design-placement clearing (other controllers), and server
	 * sync. The callback fires with the full list before clearing (upstream
	 * L2874). Pending/editing state is reset too so no popup dangles over a
	 * now-empty list.
	 */
	clearAll(): void {
		if (this.#annotations.length === 0) return;

		const cleared = this.#annotations;
		this.#options.onAnnotationsClear?.(cleared);

		this.#annotations = [];
		this.pending = null;
		this.editing = null;
		this.#persist();
	}

	/**
	 * Persist the current list through `utils/storage.ts`. Mirrors upstream's
	 * save effect (index.tsx L1222–1234): with a session id, stamp sync markers
	 * to avoid re-upload on refresh; without one, save plain; when empty, clear
	 * the storage key. No direct `localStorage` access — that contract lives in
	 * `utils/storage.ts`.
	 */
	#persist(): void {
		const { pathname } = this.#options;
		const sessionId = this.#options.sessionId?.();
		if (this.#annotations.length > 0) {
			if (sessionId) {
				saveAnnotationsWithSyncMarker(pathname, this.#annotations, sessionId);
			} else {
				saveAnnotations(pathname, this.#annotations);
			}
		} else {
			clearAnnotations(pathname);
		}
	}
}
