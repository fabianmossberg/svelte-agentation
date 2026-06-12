import { afterEach, describe, expect, it } from 'vitest';
import type { Annotation } from '../types.js';
import {
	getStorageKey,
	loadAnnotations,
	saveAnnotations,
	clearAnnotations,
	loadAllAnnotations,
	saveAnnotationsWithSyncMarker,
	getUnsyncedAnnotations,
	clearSyncMarkers,
	loadDesignPlacements,
	saveDesignPlacements,
	clearDesignPlacements,
	loadRearrangeState,
	saveRearrangeState,
	clearRearrangeState,
	loadWireframeState,
	saveWireframeState,
	clearWireframeState,
	getSessionStorageKey,
	loadSessionId,
	saveSessionId,
	clearSessionId,
	loadToolbarHidden,
	saveToolbarHidden
} from './storage.js';

// These are new tests (upstream ships none for this module). They exercise the
// localStorage/sessionStorage persistence surface under jsdom. The storage keys
// and persisted JSON shape are part of the compat contract (CLAUDE.md): a page
// annotated by upstream and reopened with our toolbar must read the same
// entries, so the tests assert exact key prefixes and round-trip equality.

afterEach(() => {
	localStorage.clear();
	sessionStorage.clear();
});

/** Minimal valid annotation; override fields per-test. */
function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
	return {
		id: 'a1',
		x: 10,
		y: 20,
		comment: 'looks off',
		element: 'button',
		elementPath: '#app > button',
		timestamp: Date.now(),
		...overrides
	};
}

describe('getStorageKey', () => {
	it('prefixes the pathname with the compat key prefix', () => {
		expect(getStorageKey('/dashboard')).toBe('feedback-annotations-/dashboard');
	});
});

describe('save/load/clear round-trip', () => {
	it('persists annotations under the feedback-annotations- key and reads them back', () => {
		const annotations = [makeAnnotation()];
		saveAnnotations('/dashboard', annotations);

		// The raw localStorage entry uses the compat key prefix.
		const raw = localStorage.getItem('feedback-annotations-/dashboard');
		expect(raw).toBe(JSON.stringify(annotations));

		expect(loadAnnotations('/dashboard')).toEqual(annotations);
	});

	it('returns an empty array for an unknown pathname', () => {
		expect(loadAnnotations('/never-visited')).toEqual([]);
	});

	it('returns an empty array when stored JSON is corrupt', () => {
		localStorage.setItem('feedback-annotations-/bad', '{not json');
		expect(loadAnnotations('/bad')).toEqual([]);
	});

	it('clears annotations for a pathname', () => {
		saveAnnotations('/dashboard', [makeAnnotation()]);
		clearAnnotations('/dashboard');
		expect(loadAnnotations('/dashboard')).toEqual([]);
		expect(localStorage.getItem('feedback-annotations-/dashboard')).toBeNull();
	});
});

describe('retention expiry', () => {
	const DAY = 24 * 60 * 60 * 1000;

	it('filters out annotations older than the 7-day retention window', () => {
		const fresh = makeAnnotation({ id: 'fresh', timestamp: Date.now() - DAY });
		const stale = makeAnnotation({ id: 'stale', timestamp: Date.now() - 8 * DAY });
		saveAnnotations('/dashboard', [fresh, stale]);

		const loaded = loadAnnotations('/dashboard');
		expect(loaded.map((a) => a.id)).toEqual(['fresh']);
	});

	it('keeps annotations without a timestamp', () => {
		const noTimestamp = { id: 'legacy', comment: 'old shape' };
		localStorage.setItem('feedback-annotations-/dashboard', JSON.stringify([noTimestamp]));
		expect(loadAnnotations('/dashboard')).toEqual([noTimestamp]);
	});
});

describe('loadAllAnnotations', () => {
	it('returns a map of pathname -> annotations across all pages', () => {
		saveAnnotations('/a', [makeAnnotation({ id: 'a' })]);
		saveAnnotations('/b', [makeAnnotation({ id: 'b' })]);

		const all = loadAllAnnotations();
		expect(all.size).toBe(2);
		expect(all.get('/a')?.[0].id).toBe('a');
		expect(all.get('/b')?.[0].id).toBe('b');
	});

	it('ignores localStorage keys without the feedback-annotations- prefix', () => {
		saveAnnotations('/a', [makeAnnotation({ id: 'a' })]);
		localStorage.setItem('unrelated-key', JSON.stringify([{ id: 'x' }]));

		const all = loadAllAnnotations();
		expect([...all.keys()]).toEqual(['/a']);
	});

	it('omits pages whose annotations are all expired', () => {
		const DAY = 24 * 60 * 60 * 1000;
		saveAnnotations('/stale', [makeAnnotation({ timestamp: Date.now() - 8 * DAY })]);
		saveAnnotations('/fresh', [makeAnnotation({ timestamp: Date.now() })]);

		const all = loadAllAnnotations();
		expect([...all.keys()]).toEqual(['/fresh']);
	});
});

describe('sync markers', () => {
	it('stamps each annotation with _syncedTo when saving with a sync marker', () => {
		saveAnnotationsWithSyncMarker('/dashboard', [makeAnnotation()], 'session-1');

		const raw = JSON.parse(localStorage.getItem('feedback-annotations-/dashboard')!);
		expect(raw[0]._syncedTo).toBe('session-1');
	});

	it('getUnsyncedAnnotations returns annotations with no sync marker', () => {
		saveAnnotations('/dashboard', [makeAnnotation({ id: 'unsynced' })]);
		expect(getUnsyncedAnnotations('/dashboard').map((a) => a.id)).toEqual(['unsynced']);
	});

	it('getUnsyncedAnnotations excludes annotations synced to the given session', () => {
		saveAnnotationsWithSyncMarker('/dashboard', [makeAnnotation()], 'session-1');
		expect(getUnsyncedAnnotations('/dashboard', 'session-1')).toEqual([]);
	});

	it('getUnsyncedAnnotations includes annotations synced to a different session', () => {
		saveAnnotationsWithSyncMarker('/dashboard', [makeAnnotation({ id: 'other' })], 'session-1');
		expect(getUnsyncedAnnotations('/dashboard', 'session-2').map((a) => a.id)).toEqual(['other']);
	});

	it('clearSyncMarkers strips the _syncedTo field from all annotations', () => {
		saveAnnotationsWithSyncMarker('/dashboard', [makeAnnotation()], 'session-1');
		clearSyncMarkers('/dashboard');

		const raw = JSON.parse(localStorage.getItem('feedback-annotations-/dashboard')!);
		expect(raw[0]._syncedTo).toBeUndefined();
		// Everything except the marker survives the round-trip.
		expect(getUnsyncedAnnotations('/dashboard', 'session-1').length).toBe(1);
	});
});

describe('design placement storage', () => {
	it('round-trips placements under the agentation-design- key', () => {
		const placements = [{ componentType: 'card', width: 100, height: 50 }];
		saveDesignPlacements('/dashboard', placements);
		expect(localStorage.getItem('agentation-design-/dashboard')).toBe(JSON.stringify(placements));
		expect(loadDesignPlacements('/dashboard')).toEqual(placements);
		clearDesignPlacements('/dashboard');
		expect(loadDesignPlacements('/dashboard')).toEqual([]);
	});
});

describe('rearrange state storage', () => {
	it('round-trips rearrange state under the agentation-rearrange- key', () => {
		const state = { moved: true };
		saveRearrangeState('/dashboard', state);
		expect(localStorage.getItem('agentation-rearrange-/dashboard')).toBe(JSON.stringify(state));
		expect(loadRearrangeState('/dashboard')).toEqual(state);
		clearRearrangeState('/dashboard');
		expect(loadRearrangeState('/dashboard')).toBeNull();
	});

	it('returns null for an unknown pathname', () => {
		expect(loadRearrangeState('/none')).toBeNull();
	});
});

describe('wireframe state storage', () => {
	it('round-trips wireframe state under the agentation-wireframe- key', () => {
		const state = { rearrange: null, placements: [], purpose: 'hero' };
		saveWireframeState('/dashboard', state);
		expect(localStorage.getItem('agentation-wireframe-/dashboard')).toBe(JSON.stringify(state));
		expect(loadWireframeState('/dashboard')).toEqual(state);
		clearWireframeState('/dashboard');
		expect(loadWireframeState('/dashboard')).toBeNull();
	});
});

describe('session id storage', () => {
	it('uses the agentation-session- key prefix', () => {
		expect(getSessionStorageKey('/dashboard')).toBe('agentation-session-/dashboard');
	});

	it('round-trips a session id', () => {
		saveSessionId('/dashboard', 'session-42');
		expect(localStorage.getItem('agentation-session-/dashboard')).toBe('session-42');
		expect(loadSessionId('/dashboard')).toBe('session-42');
		clearSessionId('/dashboard');
		expect(loadSessionId('/dashboard')).toBeNull();
	});

	it('returns null for an unknown pathname', () => {
		expect(loadSessionId('/none')).toBeNull();
	});
});

describe('toolbar hidden flag', () => {
	it('defaults to false (not hidden)', () => {
		expect(loadToolbarHidden()).toBe(false);
	});

	it('persists the hidden flag in sessionStorage as "1"', () => {
		saveToolbarHidden(true);
		expect(sessionStorage.getItem('agentation-session-toolbar-hidden')).toBe('1');
		expect(loadToolbarHidden()).toBe(true);
	});

	it('removes the flag when set back to visible', () => {
		saveToolbarHidden(true);
		saveToolbarHidden(false);
		expect(sessionStorage.getItem('agentation-session-toolbar-hidden')).toBeNull();
		expect(loadToolbarHidden()).toBe(false);
	});
});
