import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '../types.js';
import { getStorageKey, saveAnnotations } from '../utils/storage.js';
import {
	AnnotationsController,
	type AnnotationsControllerOptions,
	type PendingAnnotation
} from './annotations.svelte.js';

// New tests (no upstream equivalent — this controller is a Svelte rewrite of
// upstream's inline toolbar state, issue #16). They drive the full
// add → edit → delete → clear lifecycle and assert the localStorage round-trip
// through the ported `utils/storage.ts`, whose key/JSON shape is the compat
// contract.

afterEach(() => {
	localStorage.clear();
});

const PATHNAME = '/test-page';
// A fixed, recent base time: well inside `loadAnnotations`'s 7-day retention
// window so persisted fixtures survive a reload, but deterministic per run.
const NOW = 1_700_000_000_000 + 10 * 365 * 24 * 60 * 60 * 1000; // ~2033, always > cutoff

/** Build a controller with deterministic, collision-free id/clock for tests. */
function makeController(options: Partial<AnnotationsControllerOptions> = {}) {
	let seq = 0;
	return new AnnotationsController({
		pathname: PATHNAME,
		generateId: () => `id-${++seq}`,
		// Recent timestamp so the 7-day retention filter in `loadAnnotations`
		// keeps these on reload; `+ seq` keeps them distinct and deterministic.
		now: () => NOW + seq,
		...options
	});
}

/** Minimal pending annotation; override fields per-test. */
function makePending(overrides: Partial<PendingAnnotation> = {}): PendingAnnotation {
	return {
		x: 25,
		y: 100,
		clientY: 80,
		element: 'button',
		elementPath: 'body > button',
		...overrides
	};
}

function storedAnnotations(): Annotation[] {
	const raw = localStorage.getItem(getStorageKey(PATHNAME));
	return raw ? (JSON.parse(raw) as Annotation[]) : [];
}

describe('AnnotationsController — add', () => {
	it('commits the pending annotation, copying its data fields', () => {
		const c = makeController();
		c.pending = makePending({ selectedText: 'hello' });
		c.add('looks off');

		expect(c.annotations).toHaveLength(1);
		const a = c.annotations[0];
		expect(a).toMatchObject({
			id: 'id-1',
			x: 25,
			y: 100,
			comment: 'looks off',
			element: 'button',
			elementPath: 'body > button',
			selectedText: 'hello',
			timestamp: NOW + 1
		});
		// pending is consumed
		expect(c.pending).toBeNull();
	});

	it('is a no-op when nothing is pending', () => {
		const c = makeController();
		c.add('ignored');
		expect(c.annotations).toEqual([]);
	});

	it('persists to localStorage on add', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('persist me');

		const stored = storedAnnotations();
		expect(stored).toHaveLength(1);
		expect(stored[0].comment).toBe('persist me');
		expect(stored[0].id).toBe('id-1');
	});

	it('fires onAnnotationAdd with the new annotation', () => {
		const onAnnotationAdd = vi.fn();
		const c = makeController({ onAnnotationAdd });
		c.pending = makePending();
		c.add('hi');

		expect(onAnnotationAdd).toHaveBeenCalledTimes(1);
		expect(onAnnotationAdd.mock.calls[0][0]).toMatchObject({ id: 'id-1', comment: 'hi' });
	});
});

describe('AnnotationsController — cancelPending', () => {
	it('discards the pending annotation without committing', () => {
		const c = makeController();
		c.pending = makePending();
		c.cancelPending();
		expect(c.pending).toBeNull();
		expect(c.annotations).toEqual([]);
	});
});

describe('AnnotationsController — edit', () => {
	it('startEdit opens an annotation for editing', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('first');
		const target = c.annotations[0];

		c.startEdit(target);
		expect(c.editing).toEqual(target);
	});

	it('update changes only the comment and closes the editor', () => {
		const onAnnotationUpdate = vi.fn();
		const c = makeController({ onAnnotationUpdate });
		c.pending = makePending({ selectedText: 'keep me' });
		c.add('original');
		const target = c.annotations[0];

		c.startEdit(target);
		c.update('edited');

		const a = c.annotations[0];
		expect(a.comment).toBe('edited');
		// every other field is untouched (upstream L2820 only changes comment)
		expect(a.selectedText).toBe('keep me');
		expect(a.id).toBe(target.id);
		expect(a.timestamp).toBe(target.timestamp);
		expect(c.editing).toBeNull();
		expect(onAnnotationUpdate).toHaveBeenCalledTimes(1);
		expect(onAnnotationUpdate.mock.calls[0][0].comment).toBe('edited');
	});

	it('update persists the edited comment', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('original');
		c.startEdit(c.annotations[0]);
		c.update('edited');

		expect(storedAnnotations()[0].comment).toBe('edited');
	});

	it('update is a no-op when nothing is being edited', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('untouched');
		c.update('should not apply');
		expect(c.annotations[0].comment).toBe('untouched');
	});

	it('cancelEdit closes the editor without changing the annotation', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('original');
		c.startEdit(c.annotations[0]);
		c.cancelEdit();

		expect(c.editing).toBeNull();
		expect(c.annotations[0].comment).toBe('original');
	});
});

describe('AnnotationsController — remove', () => {
	it('deletes the annotation by id and persists', () => {
		const onAnnotationDelete = vi.fn();
		const c = makeController({ onAnnotationDelete });
		c.pending = makePending();
		c.add('one');
		c.pending = makePending();
		c.add('two');
		const [first] = c.annotations;

		c.remove(first.id);

		expect(c.annotations).toHaveLength(1);
		expect(c.annotations[0].comment).toBe('two');
		expect(storedAnnotations()).toHaveLength(1);
		expect(onAnnotationDelete).toHaveBeenCalledTimes(1);
		expect(onAnnotationDelete.mock.calls[0][0].id).toBe(first.id);
	});

	it('closes the editor when deleting the annotation being edited', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('one');
		const target = c.annotations[0];
		c.startEdit(target);

		c.remove(target.id);
		expect(c.editing).toBeNull();
	});

	it('clears storage when the last annotation is removed', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('only');
		c.remove(c.annotations[0].id);

		expect(localStorage.getItem(getStorageKey(PATHNAME))).toBeNull();
	});
});

describe('AnnotationsController — clearAll', () => {
	it('removes every annotation and fires the callback with the cleared list', () => {
		const onAnnotationsClear = vi.fn();
		const c = makeController({ onAnnotationsClear });
		c.pending = makePending();
		c.add('one');
		c.pending = makePending();
		c.add('two');
		const before = [...c.annotations];

		c.clearAll();

		expect(c.annotations).toEqual([]);
		expect(localStorage.getItem(getStorageKey(PATHNAME))).toBeNull();
		expect(onAnnotationsClear).toHaveBeenCalledTimes(1);
		expect(onAnnotationsClear.mock.calls[0][0]).toEqual(before);
	});

	it('resets pending and editing state', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('one');
		c.startEdit(c.annotations[0]);
		c.pending = makePending();

		c.clearAll();
		expect(c.editing).toBeNull();
		expect(c.pending).toBeNull();
	});

	it('is a no-op (no callback) when already empty', () => {
		const onAnnotationsClear = vi.fn();
		const c = makeController({ onAnnotationsClear });
		c.clearAll();
		expect(onAnnotationsClear).not.toHaveBeenCalled();
	});
});

describe('AnnotationsController — visibleAnnotations', () => {
	it('excludes resolved and dismissed annotations (renderable filter)', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('active');
		c.pending = makePending();
		c.add('to resolve');
		// simulate a status change via edit-then-mutate is not exposed; assert
		// through load instead (below). Here, drive the derived directly:
		const resolved = { ...c.annotations[1], status: 'resolved' as const };
		// reach in through update path is comment-only, so seed storage + reload
		saveAnnotations(PATHNAME, [c.annotations[0], resolved]);
		c.load();

		expect(c.annotations).toHaveLength(1);
		expect(c.visibleAnnotations).toHaveLength(1);
		expect(c.visibleAnnotations[0].comment).toBe('active');
	});

	it('excludes placement and rearrange kinds', () => {
		const c = makeController();
		saveAnnotations(PATHNAME, [
			{ ...makeStored('a1', 'feedback'), kind: 'feedback' },
			{ ...makeStored('a2', 'placement'), kind: 'placement' },
			{ ...makeStored('a3', 'rearrange'), kind: 'rearrange' }
		]);
		c.load();

		// load keeps all three (all renderable), but visible filters kinds out
		expect(c.annotations).toHaveLength(3);
		expect(c.visibleAnnotations.map((a) => a.id)).toEqual(['a1']);
	});

	it('recomputes reactively after a mutation', () => {
		const c = makeController();
		expect(c.visibleAnnotations).toHaveLength(0);
		c.pending = makePending();
		c.add('now visible');
		expect(c.visibleAnnotations).toHaveLength(1);
	});
});

describe('AnnotationsController — load & persistence', () => {
	it('loads renderable annotations from storage on construction', () => {
		saveAnnotations(PATHNAME, [makeStored('a1'), makeStored('a2')]);
		const c = makeController();
		expect(c.annotations.map((a) => a.id)).toEqual(['a1', 'a2']);
	});

	it('filters out non-renderable annotations on load (upstream L685)', () => {
		saveAnnotations(PATHNAME, [makeStored('a1'), { ...makeStored('a2'), status: 'dismissed' }]);
		const c = makeController();
		expect(c.annotations.map((a) => a.id)).toEqual(['a1']);
	});

	it('survives a full round-trip through a fresh controller', () => {
		const c1 = makeController();
		c1.pending = makePending();
		c1.add('survives reload');

		const c2 = makeController();
		expect(c2.annotations).toHaveLength(1);
		expect(c2.annotations[0].comment).toBe('survives reload');
	});

	it('stamps sync markers when a sessionId is provided', () => {
		const c = makeController({ sessionId: () => 'session-xyz' });
		c.pending = makePending();
		c.add('synced');

		const stored = storedAnnotations() as Array<Annotation & { _syncedTo?: string }>;
		expect(stored[0]._syncedTo).toBe('session-xyz');
	});

	it('saves without sync markers when no sessionId is present', () => {
		const c = makeController();
		c.pending = makePending();
		c.add('local only');

		const stored = storedAnnotations() as Array<Annotation & { _syncedTo?: string }>;
		expect(stored[0]._syncedTo).toBeUndefined();
	});
});

/** A complete stored annotation, as it would round-trip through storage. */
function makeStored(id: string, comment = 'stored'): Annotation {
	return {
		id,
		x: 10,
		y: 20,
		comment,
		element: 'div',
		elementPath: 'body > div',
		timestamp: NOW
	};
}
