import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// These are new tests (upstream ships none for this module).
//
// `modern-screenshot` is an optional peer dependency we deliberately do NOT
// install (mirror of upstream; see `src/modern-screenshot.d.ts`). The port
// reaches it through a guarded dynamic `import("modern-screenshot")` whose
// result is cached on a module-scoped variable so the probe only runs once.
// That cache is not exported, so we observe it through behaviour: we virtual-
// mock the module with a factory and count how many times the port attempts
// the import. A throwing factory re-runs on every `import()`, so a call count
// of 1 after several probes proves the once-only cache. `vi.resetModules()`
// gives each test a fresh screenshot module (cache reset to `undefined`).
//
// jsdom has no real 2D canvas, so we stub `HTMLCanvasElement.prototype`'s
// `getContext`/`toDataURL` to exercise the fallback render control flow
// (issue #10 out-of-scope: no pixel assertions — jsdom cannot rasterize).

const ms = vi.hoisted(() => {
	const self = {
		// Toggled per test: drives whether the virtual module "exists".
		available: false,
		domToCanvas: vi.fn(async () => document.createElement('canvas')),
		// The factory passed to vi.mock. Throwing simulates the dep being
		// absent (the real `import()` would reject the same way), and because
		// vitest re-runs a throwing factory on each import we can count probes.
		factory: vi.fn(() => {
			if (!self.available) throw new Error('modern-screenshot not installed');
			return { domToCanvas: self.domToCanvas };
		})
	};
	return self;
});

vi.mock('modern-screenshot', ms.factory);

/** Re-import the port fresh so its module-scoped import cache starts empty. */
async function loadScreenshot() {
	return import('./screenshot.js');
}

beforeEach(() => {
	vi.resetModules(); // fresh screenshot module → `_domCaptureModule` === undefined
	ms.factory.mockClear();
	ms.domToCanvas.mockClear();
	ms.available = false;
});

describe('isDomCaptureAvailable — probe caching', () => {
	it('probes once and caches the negative result when the dep is absent', async () => {
		ms.available = false;
		const { isDomCaptureAvailable } = await loadScreenshot();

		const results = [
			await isDomCaptureAvailable(),
			await isDomCaptureAvailable(),
			await isDomCaptureAvailable()
		];

		expect(results).toEqual([false, false, false]);
		// One import attempt despite three probes → the cache short-circuits.
		expect(ms.factory).toHaveBeenCalledTimes(1);
	});

	it('probes once and caches the positive result when the dep is present', async () => {
		ms.available = true;
		const { isDomCaptureAvailable } = await loadScreenshot();

		expect(await isDomCaptureAvailable()).toBe(true);
		expect(await isDomCaptureAvailable()).toBe(true);

		expect(ms.factory).toHaveBeenCalledTimes(1);
	});
});

describe('captureDomRegion — dep unavailable', () => {
	it('returns null without attempting DOM-to-canvas capture', async () => {
		ms.available = false;
		const { captureDomRegion } = await loadScreenshot();

		const result = await captureDomRegion(0, 0, 100, 100, []);

		expect(result).toBeNull();
		expect(ms.domToCanvas).not.toHaveBeenCalled();
	});
});

describe('captureDrawingStrokes — stroke-only fallback', () => {
	// A fake 2D context: jsdom's getContext('2d') is null otherwise.
	let ctx: Record<string, ReturnType<typeof vi.fn> | string | number>;
	let getContext: ReturnType<typeof vi.spyOn>;
	let toDataURL: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		ctx = {
			save: vi.fn(),
			restore: vi.fn(),
			beginPath: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			stroke: vi.fn(),
			fillRect: vi.fn(),
			drawImage: vi.fn(),
			fillStyle: '',
			strokeStyle: '',
			lineWidth: 0,
			lineCap: '',
			lineJoin: ''
		};
		getContext = vi
			.spyOn(HTMLCanvasElement.prototype, 'getContext')
			.mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
		toDataURL = vi
			.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
			.mockReturnValue('data:image/png;base64,STUB');
	});

	afterEach(() => {
		getContext.mockRestore();
		toDataURL.mockRestore();
	});

	it('renders strokes and returns a PNG data URL', async () => {
		const { captureDrawingStrokes } = await loadScreenshot();

		const result = captureDrawingStrokes(10, 10, 100, 100, [
			{
				points: [
					{ x: 20, y: 20 },
					{ x: 30, y: 30 },
					{ x: 40, y: 40 }
				],
				color: '#ff0000',
				fixed: true
			}
		]);

		expect(result).toBe('data:image/png;base64,STUB');
		expect(toDataURL).toHaveBeenCalledWith('image/png');
		// One stroke path: first point → moveTo, the two others → lineTo.
		expect(ctx.stroke).toHaveBeenCalledTimes(1);
		expect(ctx.moveTo).toHaveBeenCalledTimes(1);
		expect(ctx.lineTo).toHaveBeenCalledTimes(2);
	});

	it('skips strokes with fewer than two points', async () => {
		const { captureDrawingStrokes } = await loadScreenshot();

		captureDrawingStrokes(0, 0, 50, 50, [
			{ points: [{ x: 1, y: 1 }], color: '#000', fixed: false }, // skipped
			{
				points: [
					{ x: 1, y: 1 },
					{ x: 2, y: 2 }
				],
				color: '#000',
				fixed: false
			}
		]);

		expect(ctx.stroke).toHaveBeenCalledTimes(1);
	});

	it('returns null when the 2D context is unavailable', async () => {
		getContext.mockReturnValue(null);
		const { captureDrawingStrokes } = await loadScreenshot();

		const result = captureDrawingStrokes(0, 0, 100, 100, []);

		expect(result).toBeNull();
	});

	it('returns null and warns when canvas serialization throws', async () => {
		toDataURL.mockImplementation(() => {
			throw new Error('canvas tainted');
		});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { captureDrawingStrokes } = await loadScreenshot();

		const result = captureDrawingStrokes(0, 0, 100, 100, [
			{
				points: [
					{ x: 0, y: 0 },
					{ x: 5, y: 5 }
				],
				color: '#000',
				fixed: true
			}
		]);

		expect(result).toBeNull();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
