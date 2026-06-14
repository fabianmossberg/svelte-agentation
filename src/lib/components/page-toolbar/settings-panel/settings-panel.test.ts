import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../../../test/svelte-render';
import { DEFAULT_SETTINGS, type ToolbarSettings } from '../../../internal/settings.svelte';
import SettingsPanel from './index.svelte';

type Props = Record<string, unknown>;

function props(overrides: Props = {}): Props {
	const settings: ToolbarSettings = {
		...DEFAULT_SETTINGS,
		...((overrides.settings as Partial<ToolbarSettings>) ?? {})
	};
	return {
		onSettingsChange: vi.fn(),
		isDarkMode: true,
		onToggleTheme: vi.fn(),
		isDevMode: true,
		connectionStatus: 'disconnected',
		endpoint: undefined,
		isVisible: true,
		toolbarNearBottom: false,
		settingsPage: 'main',
		onSettingsPageChange: vi.fn(),
		onHideToolbar: vi.fn(),
		...overrides,
		settings
	};
}

function rowInputByLabel(target: HTMLElement, text: string): HTMLInputElement {
	const label = [...target.querySelectorAll('.settingsLabel')].find((l) =>
		l.textContent?.includes(text)
	);
	return label!.closest('.settingsRow')!.querySelector('input')!;
}

function fieldInputByLabel(target: HTMLElement, text: string): HTMLInputElement {
	const label = [...target.querySelectorAll('label')].find((l) => l.textContent?.includes(text));
	return label!.closest('div')!.querySelector('input')!;
}

function check(input: HTMLInputElement, checked: boolean) {
	input.checked = checked;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
}

describe('SettingsPanel — visibility + header', () => {
	it('applies the enter class when visible, exit when not', () => {
		const visible = render(SettingsPanel, props({ isVisible: true }));
		expect(visible.querySelector('.settingsPanel')?.classList.contains('enter')).toBe(true);

		const hidden = render(SettingsPanel, props({ isVisible: false }));
		expect(hidden.querySelector('.settingsPanel')?.classList.contains('exit')).toBe(true);
	});

	it('keeps the upstream + freeze-exclusion data attributes on the root', () => {
		const target = render(SettingsPanel, props());
		const root = target.querySelector('.settingsPanel')!;
		expect(root.hasAttribute('data-agentation-settings-panel')).toBe(true);
		expect(root.hasAttribute('data-feedback-toolbar')).toBe(true);
	});

	it('renders the package version', () => {
		const target = render(SettingsPanel, props());
		const version = target.querySelector('.settingsVersion')?.textContent ?? '';
		expect(version.startsWith('v')).toBe(true);
		expect(version).not.toBe('v');
	});

	it('positions above the toolbar when toolbarNearBottom', () => {
		const target = render(SettingsPanel, props({ toolbarNearBottom: true }));
		const root = target.querySelector<HTMLElement>('.settingsPanel')!;
		expect(root.style.top).toBe('calc(100% + 0.5rem)');
		expect(root.style.bottom).toBe('auto');
	});
});

describe('SettingsPanel — control patches', () => {
	it('cycles output detail to the next option', () => {
		const onSettingsChange = vi.fn();
		const target = render(SettingsPanel, props({ onSettingsChange }));
		flushSync();
		target.querySelector<HTMLButtonElement>('.cycleButton')!.click();
		flushSync();
		// default 'standard' → next is 'detailed'
		expect(onSettingsChange).toHaveBeenCalledWith({ outputDetail: 'detailed' });
	});

	it('selects an accent color', () => {
		const onSettingsChange = vi.fn();
		const target = render(SettingsPanel, props({ onSettingsChange }));
		flushSync();
		const red = [...target.querySelectorAll<HTMLButtonElement>('.colorOption')].find(
			(b) => b.getAttribute('title') === 'Red'
		)!;
		red.click();
		flushSync();
		expect(onSettingsChange).toHaveBeenCalledWith({ annotationColorId: 'red' });
	});

	it('patches autoClearAfterCopy from the checkbox', () => {
		const onSettingsChange = vi.fn();
		const target = render(SettingsPanel, props({ onSettingsChange }));
		flushSync();
		check(fieldInputByLabel(target, 'Clear on copy/send'), true);
		expect(onSettingsChange).toHaveBeenCalledWith({ autoClearAfterCopy: true });
	});

	it('patches blockInteractions from the checkbox', () => {
		const onSettingsChange = vi.fn();
		const target = render(SettingsPanel, props({ onSettingsChange }));
		flushSync();
		check(fieldInputByLabel(target, 'Block page interactions'), false);
		expect(onSettingsChange).toHaveBeenCalledWith({ blockInteractions: false });
	});

	it('patches reactEnabled from the switch when in dev mode', () => {
		const onSettingsChange = vi.fn();
		const target = render(SettingsPanel, props({ onSettingsChange, isDevMode: true }));
		flushSync();
		check(rowInputByLabel(target, 'React Components'), false);
		expect(onSettingsChange).toHaveBeenCalledWith({ reactEnabled: false });
	});

	it('disables the React switch outside dev mode', () => {
		const target = render(SettingsPanel, props({ isDevMode: false }));
		expect(rowInputByLabel(target, 'React Components').disabled).toBe(true);
	});

	it('calls onHideToolbar when the hide switch is toggled on', () => {
		const onHideToolbar = vi.fn();
		const target = render(SettingsPanel, props({ onHideToolbar }));
		flushSync();
		check(rowInputByLabel(target, 'Hide Until Restart'), true);
		expect(onHideToolbar).toHaveBeenCalledTimes(1);
	});

	it('toggles the theme', () => {
		const onToggleTheme = vi.fn();
		const target = render(SettingsPanel, props({ onToggleTheme }));
		flushSync();
		target.querySelector<HTMLButtonElement>('.themeToggle')!.click();
		flushSync();
		expect(onToggleTheme).toHaveBeenCalledTimes(1);
	});
});

describe('SettingsPanel — page switching', () => {
	it('navigates to the automations page', () => {
		const onSettingsPageChange = vi.fn();
		const target = render(SettingsPanel, props({ onSettingsPageChange }));
		flushSync();
		target.querySelector<HTMLButtonElement>('.settingsNavLink')!.click();
		flushSync();
		expect(onSettingsPageChange).toHaveBeenCalledWith('automations');
	});

	it('navigates back to the main page', () => {
		const onSettingsPageChange = vi.fn();
		const target = render(
			SettingsPanel,
			props({ onSettingsPageChange, settingsPage: 'automations' })
		);
		flushSync();
		target.querySelector<HTMLButtonElement>('.settingsBackButton')!.click();
		flushSync();
		expect(onSettingsPageChange).toHaveBeenCalledWith('main');
	});

	it('adds the slideLeft / slideIn classes for the automations page', () => {
		const target = render(SettingsPanel, props({ settingsPage: 'automations' }));
		expect(target.querySelector('.settingsPage')?.classList.contains('slideLeft')).toBe(true);
		expect(target.querySelector('.automationsPage')?.classList.contains('slideIn')).toBe(true);
	});
});

describe('SettingsPanel — webhooks (state-only)', () => {
	it('patches webhooksEnabled from the auto-send switch when a URL is present', () => {
		const onSettingsChange = vi.fn();
		const target = render(
			SettingsPanel,
			props({
				onSettingsChange,
				settings: { webhookUrl: 'https://example.com/hook', webhooksEnabled: false }
			})
		);
		flushSync();
		check(target.querySelector<HTMLInputElement>('#agentation-auto-send')!, true);
		expect(onSettingsChange).toHaveBeenCalledWith({ webhooksEnabled: true });
	});

	it('disables the auto-send switch without a URL', () => {
		const target = render(SettingsPanel, props({ settings: { webhookUrl: '' } }));
		expect(target.querySelector<HTMLInputElement>('#agentation-auto-send')!.disabled).toBe(true);
	});

	it('patches webhookUrl from the textarea', () => {
		const onSettingsChange = vi.fn();
		const target = render(SettingsPanel, props({ onSettingsChange }));
		flushSync();
		const textarea = target.querySelector<HTMLTextAreaElement>('.webhookUrlInput')!;
		textarea.value = 'https://new.example/hook';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		expect(onSettingsChange).toHaveBeenCalledWith({ webhookUrl: 'https://new.example/hook' });
	});
});

describe('SettingsPanel — connection status (render-only)', () => {
	it('shows the disconnected status dot but no nav indicator when disconnected', () => {
		const target = render(
			SettingsPanel,
			props({ endpoint: 'http://localhost:4747', connectionStatus: 'disconnected' })
		);
		expect(target.querySelector('.mcpStatusDot')?.classList.contains('disconnected')).toBe(true);
		expect(target.querySelector('.mcpNavIndicator')).toBeNull();
	});

	it('shows the nav indicator when connected', () => {
		const target = render(
			SettingsPanel,
			props({ endpoint: 'http://localhost:4747', connectionStatus: 'connected' })
		);
		expect(target.querySelector('.mcpNavIndicator')?.classList.contains('connected')).toBe(true);
	});
});
