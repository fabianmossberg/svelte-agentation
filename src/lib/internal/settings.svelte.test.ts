import { beforeEach, describe, expect, it } from 'vitest';
import {
	COLOR_OPTIONS,
	DEFAULT_SETTINGS,
	SettingsController,
	injectAgentationColorTokens
} from './settings.svelte';

const SETTINGS_KEY = 'feedback-toolbar-settings';
const THEME_KEY = 'feedback-toolbar-theme';

beforeEach(() => {
	localStorage.clear();
});

describe('settings model', () => {
	it('DEFAULT_SETTINGS matches upstream field names + defaults', () => {
		expect(DEFAULT_SETTINGS).toEqual({
			outputDetail: 'standard',
			autoClearAfterCopy: false,
			annotationColorId: 'blue',
			blockInteractions: true,
			reactEnabled: true,
			markerClickBehavior: 'edit',
			webhookUrl: '',
			webhooksEnabled: true
		});
	});

	it('COLOR_OPTIONS carries the 7 upstream ids with srgb + display-p3 values', () => {
		expect(COLOR_OPTIONS.map((c) => c.id)).toEqual([
			'indigo',
			'blue',
			'cyan',
			'green',
			'yellow',
			'orange',
			'red'
		]);
		const blue = COLOR_OPTIONS.find((c) => c.id === 'blue');
		expect(blue).toMatchObject({
			label: 'Blue',
			srgb: '#0088FF',
			p3: 'color(display-p3 0.00 0.53 1.00)'
		});
	});
});

describe('injectAgentationColorTokens', () => {
	it('injects a single <style id="agentation-color-tokens"> with the accent token rule', () => {
		// The module already ran the injection once at import; assert the contract.
		const style = document.getElementById('agentation-color-tokens');
		expect(style).not.toBeNull();
		expect(style?.tagName).toBe('STYLE');
		expect(style?.textContent).toContain('[data-agentation-accent="blue"]');
		expect(style?.textContent).toContain('--agentation-color-accent: #0088FF');
	});

	it('is idempotent — a second call does not add a duplicate tag', () => {
		injectAgentationColorTokens();
		injectAgentationColorTokens();
		expect(document.querySelectorAll('#agentation-color-tokens')).toHaveLength(1);
	});
});

describe('SettingsController — defaults', () => {
	it('starts at DEFAULT_SETTINGS, dark mode', () => {
		const c = new SettingsController();
		expect(c.settings).toEqual(DEFAULT_SETTINGS);
		expect(c.isDarkMode).toBe(true);
		expect(c.theme).toBe('dark');
	});
});

describe('SettingsController — load', () => {
	it('falls back to defaults when storage is empty', () => {
		const c = new SettingsController();
		c.load();
		expect(c.settings).toEqual(DEFAULT_SETTINGS);
	});

	it('merges a saved partial over the defaults', () => {
		localStorage.setItem(
			SETTINGS_KEY,
			JSON.stringify({ outputDetail: 'forensic', autoClearAfterCopy: true })
		);
		const c = new SettingsController();
		c.load();
		expect(c.settings.outputDetail).toBe('forensic');
		expect(c.settings.autoClearAfterCopy).toBe(true);
		// untouched fields keep defaults
		expect(c.settings.blockInteractions).toBe(true);
	});

	it('keeps a known annotationColorId', () => {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify({ annotationColorId: 'red' }));
		const c = new SettingsController();
		c.load();
		expect(c.settings.annotationColorId).toBe('red');
	});

	it('falls an unknown annotationColorId back to the default', () => {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify({ annotationColorId: 'chartreuse' }));
		const c = new SettingsController();
		c.load();
		expect(c.settings.annotationColorId).toBe(DEFAULT_SETTINGS.annotationColorId);
	});

	it('falls back to defaults on malformed JSON', () => {
		localStorage.setItem(SETTINGS_KEY, 'not json{');
		const c = new SettingsController();
		c.load();
		expect(c.settings).toEqual(DEFAULT_SETTINGS);
	});

	it('reads the saved theme (light)', () => {
		localStorage.setItem(THEME_KEY, 'light');
		const c = new SettingsController();
		c.load();
		expect(c.isDarkMode).toBe(false);
		expect(c.theme).toBe('light');
	});

	it('keeps the default dark theme when no preference is saved', () => {
		const c = new SettingsController();
		c.load();
		expect(c.isDarkMode).toBe(true);
	});
});

describe('SettingsController — patch + persistence', () => {
	it('applies a partial patch and persists it (round-trips through a fresh controller)', () => {
		const c = new SettingsController();
		c.patch({ outputDetail: 'detailed' });
		expect(c.settings.outputDetail).toBe('detailed');
		expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).outputDetail).toBe('detailed');

		const reloaded = new SettingsController();
		reloaded.load();
		expect(reloaded.settings.outputDetail).toBe('detailed');
	});

	it('merges successive patches without dropping earlier fields', () => {
		const c = new SettingsController();
		c.patch({ annotationColorId: 'green' });
		c.patch({ webhookUrl: 'https://example.com/hook' });
		expect(c.settings.annotationColorId).toBe('green');
		expect(c.settings.webhookUrl).toBe('https://example.com/hook');
	});
});

describe('SettingsController — theme', () => {
	it('toggleTheme flips the flag and persists the value', () => {
		const c = new SettingsController();
		c.toggleTheme();
		expect(c.isDarkMode).toBe(false);
		expect(localStorage.getItem(THEME_KEY)).toBe('light');

		c.toggleTheme();
		expect(c.isDarkMode).toBe(true);
		expect(localStorage.getItem(THEME_KEY)).toBe('dark');
	});
});
