// Toolbar settings model + persistence.
//
// DIVERGENCE(upstream): upstream declares the settings model (`ToolbarSettings`,
// `DEFAULT_SETTINGS`, `COLOR_OPTIONS`, `injectAgentationColorTokens`) and the
// `useState`/`useEffect` that load & persist it inline in the 4.7k-LOC monolith
// `components/page-toolbar-css/index.tsx` (model L142–227, settings load L551–563,
// theme load L695–704, settings save L720–728, theme save L730–738). The settings
// panel imports `{ COLOR_OPTIONS, ToolbarSettings } from ".."` (the monolith).
//
// Per CLAUDE.md ("Shared state machines live in `internal/*.svelte.ts`
// controllers") and the Phase-2 decomposition already applied to the
// annotations / picker / markers state, that monolith state lives here as a
// runes controller, and the model constants live alongside it. The settings
// panel imports them from this module instead of `".."`. When the toolbar
// monolith is ported (p2-09) it constructs a `SettingsController`, renders the
// panel with `settings` + `onSettingsChange`, and re-exports the model.
import type { MarkerClickBehavior } from '../components/page-toolbar/annotation-marker';

// DIVERGENCE(upstream): `OutputDetailLevel`/`ReactComponentMode` were moved to
// `types.ts` in Phase 1 (they leak from the monolith upstream). Re-exported here
// — never redefined — so consumers of the settings model keep one import site.
export type { OutputDetailLevel, ReactComponentMode } from '../types';
import type { OutputDetailLevel } from '../types';

export type ToolbarSettings = {
	outputDetail: OutputDetailLevel;
	autoClearAfterCopy: boolean;
	annotationColorId: string;
	blockInteractions: boolean;
	reactEnabled: boolean;
	markerClickBehavior: MarkerClickBehavior;
	webhookUrl: string;
	webhooksEnabled: boolean;
};

export const DEFAULT_SETTINGS: ToolbarSettings = {
	outputDetail: 'standard',
	autoClearAfterCopy: false,
	annotationColorId: 'blue',
	blockInteractions: true,
	reactEnabled: true,
	markerClickBehavior: 'edit',
	webhookUrl: '',
	webhooksEnabled: true
};

export const COLOR_OPTIONS = [
	{ id: 'indigo', label: 'Indigo', srgb: '#6155F5', p3: 'color(display-p3 0.38 0.33 0.96)' },
	{ id: 'blue', label: 'Blue', srgb: '#0088FF', p3: 'color(display-p3 0.00 0.53 1.00)' },
	{ id: 'cyan', label: 'Cyan', srgb: '#00C3D0', p3: 'color(display-p3 0.00 0.76 0.82)' },
	{ id: 'green', label: 'Green', srgb: '#34C759', p3: 'color(display-p3 0.20 0.78 0.35)' },
	{ id: 'yellow', label: 'Yellow', srgb: '#FFCC00', p3: 'color(display-p3 1.00 0.80 0.00)' },
	{ id: 'orange', label: 'Orange', srgb: '#FF8D28', p3: 'color(display-p3 1.00 0.55 0.16)' },
	{ id: 'red', label: 'Red', srgb: '#FF383C', p3: 'color(display-p3 1.00 0.22 0.24)' }
];

export const injectAgentationColorTokens = () => {
	if (typeof document === 'undefined') return;
	if (document.getElementById('agentation-color-tokens')) return;
	const style = document.createElement('style');
	style.id = 'agentation-color-tokens';
	style.textContent = [
		...COLOR_OPTIONS.map(
			(c) => `
      [data-agentation-accent="${c.id}"] {
        --agentation-color-accent: ${c.srgb};
      }

      @supports (color: color(display-p3 0 0 0)) {
        [data-agentation-accent="${c.id}"] {
          --agentation-color-accent: ${c.p3};
        }
      }
    `
		),
		`:root {
      ${COLOR_OPTIONS.map((c) => `--agentation-color-${c.id}: ${c.srgb};`).join('\n')}
    }`,
		`@supports (color: color(display-p3 0 0 0)) {
      :root {
        ${COLOR_OPTIONS.map((c) => `--agentation-color-${c.id}: ${c.p3};`).join('\n')}
      }
    }`
	].join('');
	document.head.appendChild(style);
};

// DIVERGENCE(upstream): upstream calls `injectAgentationColorTokens()` once at
// module load (index.tsx L227, a top-level side effect). Kept here — the function
// guards `typeof document === "undefined"`, so the import is SSR-safe.
injectAgentationColorTokens();

// localStorage keys — must match upstream byte-for-byte (compat contract).
const SETTINGS_KEY = 'feedback-toolbar-settings';
const THEME_KEY = 'feedback-toolbar-theme';

/**
 * Settings + theme state for the toolbar, decomposing the monolith's
 * `settings`/`isDarkMode` `useState`s and their load/save `useEffect`s.
 *
 * DIVERGENCE(upstream): persistence is imperative (`#persist*` called from each
 * mutation) rather than `$effect`-driven — the same precedent the annotations /
 * markers controllers set (deterministic, testable outside an effect-root).
 * `load()` never persists, so it can't clobber storage on mount.
 */
export class SettingsController {
	#settings = $state<ToolbarSettings>(DEFAULT_SETTINGS);
	#isDarkMode = $state(true);

	get settings(): ToolbarSettings {
		return this.#settings;
	}

	get isDarkMode(): boolean {
		return this.#isDarkMode;
	}

	/** `"dark" | "light"` — the value stamped on the toolbar's `data-agentation-theme`. */
	get theme(): 'dark' | 'light' {
		return this.#isDarkMode ? 'dark' : 'light';
	}

	/**
	 * Hydrate settings + theme from localStorage. Mirrors upstream's lazy
	 * `useState` initializer (L551–563) and the theme-load effect (L695–704):
	 * unknown `annotationColorId` falls back to the default; a malformed/missing
	 * settings blob falls back to `DEFAULT_SETTINGS` wholesale; a missing theme
	 * key keeps the default (dark).
	 */
	load(): void {
		try {
			const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '');
			this.#settings = {
				...DEFAULT_SETTINGS,
				...saved,
				annotationColorId: COLOR_OPTIONS.find((c) => c.id === saved.annotationColorId)
					? saved.annotationColorId
					: DEFAULT_SETTINGS.annotationColorId
			};
		} catch {
			this.#settings = DEFAULT_SETTINGS;
		}

		try {
			const savedTheme = localStorage.getItem(THEME_KEY);
			if (savedTheme !== null) {
				this.#isDarkMode = savedTheme === 'dark';
			}
			// No saved preference → keep the default (dark mode).
		} catch {
			// Ignore localStorage errors.
		}
	}

	/** Apply a partial settings patch (the panel's `onSettingsChange` contract). */
	patch(patch: Partial<ToolbarSettings>): void {
		this.#settings = { ...this.#settings, ...patch };
		this.#persistSettings();
	}

	/** Flip dark/light theme and persist. */
	toggleTheme(): void {
		this.#isDarkMode = !this.#isDarkMode;
		this.#persistTheme();
	}

	#persistSettings(): void {
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.#settings));
		} catch {
			// Ignore localStorage errors.
		}
	}

	#persistTheme(): void {
		try {
			localStorage.setItem(THEME_KEY, this.#isDarkMode ? 'dark' : 'light');
		} catch {
			// Ignore localStorage errors.
		}
	}
}
