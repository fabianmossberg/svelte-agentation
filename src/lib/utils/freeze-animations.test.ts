import { afterEach, describe, expect, it } from 'vitest';
import {
	freeze,
	unfreeze,
	originalSetTimeout,
	originalSetInterval,
	originalRequestAnimationFrame
} from './freeze-animations.js';

// These are new tests (upstream ships none for this module). Importing the
// module installs the monkey-patches as a side effect — `setTimeout`,
// `setInterval` and `requestAnimationFrame` on `window` are replaced, and the
// shared state is parked on `window.__agentation_freeze` so it survives HMR.
// We therefore reset that window state (frozen flag + queues) between tests to
// keep vitest workers deterministic, and use the unpatched `original*` timers
// to advance the clock without re-entering the patched path. See issue #9.

const STYLE_ID = 'feedback-freeze-styles';

interface FreezeWindowState {
	frozen: boolean;
	frozenTimeoutQueue: Array<() => void>;
	frozenRAFQueue: FrameRequestCallback[];
	pausedAnimations: Animation[];
	origRAF: typeof requestAnimationFrame;
}

function state(): FreezeWindowState {
	return (window as unknown as { __agentation_freeze: FreezeWindowState }).__agentation_freeze;
}

/** Wait `ms` using the unpatched timer so the wait itself isn't frozen. */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => originalSetTimeout(resolve, ms));
}

afterEach(() => {
	// Reset shared window state directly rather than via unfreeze() — unfreeze
	// replays queued callbacks asynchronously, which could leak into the next
	// test. Clearing the state is synchronous and total.
	const s = state();
	s.frozen = false;
	s.frozenTimeoutQueue = [];
	s.frozenRAFQueue = [];
	s.pausedAnimations = [];
	document.getElementById(STYLE_ID)?.remove();
});

describe('install side effect', () => {
	it('patches window timers but keeps the original* escape hatches unpatched', () => {
		// The patch reassigns window.setTimeout; the exported original is the
		// real one captured before the reassignment.
		expect(window.setTimeout).not.toBe(originalSetTimeout);
		expect(window.setInterval).not.toBe(originalSetInterval);
		expect(window.requestAnimationFrame).not.toBe(originalRequestAnimationFrame);
		expect(typeof originalSetTimeout).toBe('function');
	});
});

describe('freeze() — patched setTimeout', () => {
	it('queues the callback instead of running it while frozen', async () => {
		freeze();
		let ran = false;
		window.setTimeout(() => {
			ran = true;
		}, 0);

		// Let the underlying (real) timer fire: the wrapper runs, sees `frozen`,
		// and pushes onto the queue rather than invoking the callback.
		await wait(20);

		expect(ran).toBe(false);
		expect(state().frozenTimeoutQueue.length).toBe(1);
	});

	it('unfreeze() flushes the queue so the callback finally runs', async () => {
		freeze();
		let ran = false;
		window.setTimeout(() => {
			ran = true;
		}, 0);
		await wait(20);
		expect(ran).toBe(false);

		unfreeze();
		await wait(20);

		expect(ran).toBe(true);
		expect(state().frozenTimeoutQueue.length).toBe(0);
	});
});

describe('freeze() — patched requestAnimationFrame', () => {
	it('queues the callback while frozen and replays it on unfreeze', () => {
		// We drive the underlying frame ourselves instead of awaiting jsdom's
		// animation-frame timer: jsdom stops scheduling frames once freeze()
		// runs (a quirk of its render simulation, unrelated to the port). The
		// patched window.requestAnimationFrame reads `_s.origRAF` at call time,
		// so stubbing the parked original lets us capture the wrapper the patch
		// schedules and fire frames on demand — exercising the real queue/replay
		// branch deterministically. See issue #9.
		const s = state();
		const realOrigRAF = s.origRAF;
		let frame: FrameRequestCallback | null = null;
		s.origRAF = ((cb: FrameRequestCallback) => {
			frame = cb;
			return 1;
		}) as typeof requestAnimationFrame;

		try {
			freeze();
			let ts: number | null = null;
			window.requestAnimationFrame((t) => {
				ts = t;
			});

			// Fire the frame: the wrapper sees `frozen` and queues the callback.
			expect(frame).not.toBeNull();
			frame!(16);
			expect(ts).toBeNull();
			expect(s.frozenRAFQueue.length).toBe(1);

			// unfreeze() re-schedules each queued callback via origRAF (captured
			// again by the stub); firing that frame replays the real callback.
			unfreeze();
			frame!(32);
			expect(ts).toBe(32);
			expect(s.frozenRAFQueue.length).toBe(0);
		} finally {
			s.origRAF = realOrigRAF;
		}
	});
});

describe('original* escape hatches', () => {
	it('originalSetTimeout still fires while frozen', async () => {
		freeze();
		let ran = false;
		originalSetTimeout(() => {
			ran = true;
		}, 0);

		await wait(20);
		expect(ran).toBe(true);
	});
});

describe('CSS injection', () => {
	it('injects a freeze style element scoped to exclude agentation UI', () => {
		freeze();
		const style = document.getElementById(STYLE_ID);
		expect(style).not.toBeNull();

		const css = style!.textContent ?? '';
		expect(css).toContain('animation-play-state: paused');
		// The three exclusion attributes are the compat contract (issue #9 /
		// CLAUDE.md): Phase 2 components must carry these exact attributes.
		expect(css).toContain('data-feedback-toolbar');
		expect(css).toContain('data-annotation-popup');
		expect(css).toContain('data-annotation-marker');
	});

	it('removes the injected style element on unfreeze', () => {
		freeze();
		expect(document.getElementById(STYLE_ID)).not.toBeNull();

		unfreeze();
		expect(document.getElementById(STYLE_ID)).toBeNull();
	});
});

describe('idempotence', () => {
	it('freeze() is a no-op when already frozen', () => {
		freeze();
		const first = document.getElementById(STYLE_ID);
		freeze();
		expect(document.getElementById(STYLE_ID)).toBe(first);
		expect(state().frozen).toBe(true);
	});

	it('unfreeze() is a no-op when not frozen', () => {
		// Nothing to flush, nothing to remove — must not throw.
		expect(() => unfreeze()).not.toThrow();
		expect(state().frozen).toBe(false);
	});
});
