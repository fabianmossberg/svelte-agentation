<script lang="ts">
	// Ports upstream `package/src/components/page-toolbar-css/settings-panel/index.tsx`.
	//
	// Presentational: the panel owns no settings state. It takes `settings` +
	// `onSettingsChange(patch)` (the upstream contract) and the toolbar wires those
	// to a `SettingsController` (p2-09). The settings model (`COLOR_OPTIONS`,
	// `ToolbarSettings`) lives in `internal/settings.svelte.ts` rather than the
	// not-yet-ported toolbar monolith upstream imports from (`".."`).
	import { COLOR_OPTIONS, type ToolbarSettings } from '../../../internal/settings.svelte';
	import { OUTPUT_DETAIL_OPTIONS } from '../../../utils/generate-output';
	import { VERSION } from '../../../internal/version';
	import HelpTooltip from '../../help-tooltip/index.svelte';
	import { IconChevronLeft, IconMoon, IconSun } from '../../icons';
	import Switch from '../../switch/index.svelte';
	import CheckboxField from './checkbox-field/index.svelte';

	type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

	// DIVERGENCE(upstream): `SettingsPanelProps` (a React `type`) → an interface
	// with the identical prop surface; callbacks keep their upstream names and
	// signatures. The default export replaces upstream's named `SettingsPanel`.
	interface SettingsPanelProps {
		settings: ToolbarSettings;
		onSettingsChange: (patch: Partial<ToolbarSettings>) => void;

		isDarkMode: boolean;
		onToggleTheme: () => void;

		isDevMode: boolean;

		connectionStatus: ConnectionStatus;
		endpoint?: string;

		/** Whether the panel is mounted (controls enter/exit class) */
		isVisible: boolean;

		/** Position override: show panel above toolbar when toolbar is near bottom */
		toolbarNearBottom: boolean;

		settingsPage: 'main' | 'automations';
		onSettingsPageChange: (page: 'main' | 'automations') => void;

		onHideToolbar: () => void;
	}

	let {
		settings,
		onSettingsChange,
		isDarkMode,
		onToggleTheme,
		isDevMode,
		connectionStatus,
		endpoint,
		isVisible,
		toolbarNearBottom,
		settingsPage,
		onSettingsPageChange,
		onHideToolbar
	}: SettingsPanelProps = $props();

	const currentOutputLabel = $derived(
		OUTPUT_DETAIL_OPTIONS.find((opt) => opt.value === settings.outputDetail)?.label
	);

	function cycleOutputDetail() {
		const currentIndex = OUTPUT_DETAIL_OPTIONS.findIndex(
			(opt) => opt.value === settings.outputDetail
		);
		const nextIndex = (currentIndex + 1) % OUTPUT_DETAIL_OPTIONS.length;
		onSettingsChange({ outputDetail: OUTPUT_DETAIL_OPTIONS[nextIndex].value });
	}
</script>

<!-- DIVERGENCE(upstream): React `className` concat → `class:` directives; the
`style={toolbarNearBottom ? {…} : undefined}` placement override → `style:`
directives. The panel root keeps upstream's `data-agentation-settings-panel` and
*adds* `data-feedback-toolbar` — upstream tags peer toolbar-UI subtrees (the
tooltip component, the design-mode panels) with it so the picker's
`closest("[data-feedback-toolbar]")` hit-test ignores them and freeze-animations
excludes them; carrying it here makes the panel picker-/freeze-safe even before
the toolbar (which also carries it) wraps it in p2-09. -->
<div
	class="settingsPanel"
	class:enter={isVisible}
	class:exit={!isVisible}
	style:bottom={toolbarNearBottom ? 'auto' : undefined}
	style:top={toolbarNearBottom ? 'calc(100% + 0.5rem)' : undefined}
	data-agentation-settings-panel
	data-feedback-toolbar
>
	<div class="settingsPanelContainer">
		<!-- ── Main page ── -->
		<div class="settingsPage" class:slideLeft={settingsPage === 'automations'}>
			<div class="settingsHeader">
				<!-- DIVERGENCE(upstream): the brand link wraps only the logo SVG (no text);
				added `aria-label` to give it an accessible name (Svelte a11y) — upstream
				renders the same SVG with no label. -->
				<a
					class="settingsBrand"
					href="https://agentation.com"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Agentation"
				>
					<svg
						width="72"
						height="16"
						viewBox="0 0 676 151"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M79.6666 100.561L104.863 15.5213C107.828 4.03448 99.1201 -3.00582 88.7449 1.25541L3.52015 39.6065C1.48217 40.5329 0 42.7562 0 45.1647C0 48.6848 2.77907 51.4639 6.29922 51.4639C7.22558 51.4639 8.15193 51.2786 9.07829 50.9081L93.7472 12.7422C97.2674 11.0748 93.7472 8.29572 92.6356 12.1864L67.624 97.2259C66.5123 100.931 69.4767 105.193 73.7379 105.193C76.517 105.193 79.1108 103.155 79.6666 100.561ZM663.641 100.005C665.679 107.231 677.537 104.081 675.499 96.8553L666.05 66.2856C663.456 57.7631 655.489 55.7251 648.82 61.098L618.991 86.6654C617.324 87.9623 621.029 89.815 621.214 88.1476L625.846 61.6538C626.958 55.3546 624.179 50.5375 615.841 50.5375L579.158 51.0934C576.008 51.0934 578.417 53.8724 578.417 57.022C578.417 60.1716 580.825 61.6538 583.975 61.6538L616.212 60.9127C616.397 60.9127 614.544 59.6158 614.544 59.8011L609.727 88.7034C607.875 99.6344 617.694 102.784 626.031 95.7437L655.86 70.1763L654.192 69.6205L663.641 100.005ZM571.191 89.0739C555.443 88.7034 562.298 61.4685 578.787 61.8391C594.72 62.0243 587.124 89.2592 571.191 89.0739ZM571.006 100.375C601.575 100.931 611.024 51.6492 579.158 51.0934C547.847 50.5375 540.065 99.8197 571.006 100.375ZM521.909 46.4616C525.985 46.4616 529.505 42.9414 529.505 38.6802C529.505 34.4189 525.985 31.0841 521.909 31.0841C517.833 31.0841 514.127 34.6042 514.127 38.6802C514.127 42.7562 517.648 46.4616 521.909 46.4616ZM472.256 103.525C493.192 103.71 515.98 73.3259 519.13 62.3949L509.866 60.9127C505.234 73.3259 497.638 101.672 519.871 102.043C536.545 102.228 552.479 85.3685 563.595 70.1763C564.151 69.2499 564.706 68.1383 564.706 66.8414C564.706 63.6918 563.965 61.098 560.816 61.098C558.963 61.098 557.296 62.0243 556.184 63.5065C546.365 77.0313 530.802 90.9266 522.094 90.7414C511.904 90.5561 517.462 71.4732 519.871 64.9887C523.391 55.7251 512.831 53.5019 509.681 60.9127C506.531 68.6941 488.19 92.4088 475.035 92.2235C467.439 92.0383 464.29 83.8863 472.441 59.9864L486.707 17.7445C487.634 14.4097 485.41 10.519 481.334 10.519C478.741 10.519 476.517 12.1864 475.962 14.4097L461.696 56.4662C451.506 86.4801 455.211 103.155 472.256 103.525ZM447.43 42.5709L496.527 41.4593C499.306 41.4593 501.529 39.0507 501.529 36.2717C501.529 33.3073 499.306 31.0841 496.341 31.0841L447.245 32.1957C444.466 32.1957 442.242 34.4189 442.242 37.3833C442.242 40.1624 444.466 42.5709 447.43 42.5709ZM422.974 106.304C435.387 106.489 457.249 94.8173 472.441 53.8724C473.553 50.7228 472.071 48.3143 468.365 48.3143C466.142 48.3143 464.29 49.6112 463.548 51.6492C450.394 87.2212 431.682 96.1142 424.456 95.929C419.454 95.929 417.972 93.3352 418.713 85.5538C419.454 78.1429 410.376 74.9933 406.114 81.1073C401.297 87.777 394.442 94.2615 385.549 94.0763C370.172 93.891 376.471 67.0267 399.815 67.3972C408.338 67.5825 414.452 71.4732 417.045 76.6608C417.786 78.3282 419.454 79.6251 421.492 79.6251C424.271 79.6251 426.679 77.2166 426.679 74.4375C426.679 73.6964 426.494 72.9553 426.124 72.2143C421.862 63.6918 412.414 57.3926 400 57.2073C363.502 56.6515 353.497 104.451 383.326 104.822C397.036 105.193 410.005 94.0763 413.34 85.9243C412.599 86.8507 408.338 86.6654 408.523 84.4422C407.411 97.4111 410.931 106.119 422.974 106.304ZM335.897 104.266C335.897 115.012 347.569 117.606 347.569 103.34C347.569 89.0739 358.5 54.4282 361.464 45.1647L396.666 43.6825C405.929 43.1267 404.262 33.1221 397.036 33.3073L364.984 34.4189L368.875 22.7469C369.801 20.1531 370.542 17.9298 370.542 16.2624C370.542 13.4833 368.504 11.8159 365.911 11.8159C362.946 11.8159 360.352 12.7422 357.573 21.0794L352.942 35.16L330.153 36.0864C326.263 36.4569 323.483 38.1244 323.483 41.6445C323.483 45.5352 326.448 47.0174 330.709 46.8321L349.421 45.9058C345.901 56.6515 335.897 90.7414 335.897 104.266ZM186.939 78.6988C193.979 56.4662 212.877 54.984 212.877 62.9507C212.877 68.3236 203.984 77.0313 186.939 78.6988ZM113.942 150.955C142.844 152.437 159.704 111.492 160.63 80.5515C161.556 73.3259 153.96 70.3616 148.773 75.7344C141.918 83.1453 129.505 93.1499 119.685 93.1499C103.011 93.1499 116.165 59.8011 143.956 59.8011C149.514 59.8011 153.59 61.6538 156.184 64.0623C160.815 68.3236 170.82 62.0243 165.818 56.0957C161.927 51.4639 155.072 48.129 144.882 48.129C102.455 48.129 83.7426 105.007 116.721 105.007C134.692 105.007 151.367 88.3329 155.257 82.7747C154.516 83.5158 149.329 81.2925 149.699 79.4398L149.143 83.5158C148.958 107.045 134.322 141.506 116.536 139.838C113.386 139.468 112.089 137.43 112.089 134.836C112.089 128.907 122.094 119.273 145.067 113.53C159.518 109.824 152.293 101.487 143.4 104.081C111.163 113.53 99.6759 127.425 99.6759 137.8C99.6759 145.026 105.605 150.584 113.942 150.955ZM194.72 109.454C214.359 109.454 239 95.3732 251.228 77.9577C250.301 82.96 246.596 96.8553 246.596 101.487C246.596 110.01 254.748 109.454 261.232 102.784L288.097 75.5491L290.32 85.7391C293.284 99.4491 299.213 104.822 308.847 104.822C326.263 104.822 342.196 85.7391 349.421 74.8081L344.049 63.6918C339.787 74.8081 321.631 92.5941 311.626 92.5941C306.994 92.5941 304.771 89.815 303.289 83.7011L300.325 71.2879C297.916 60.7275 289.023 58.3189 279.018 68.1383L261.788 84.8127L264.382 69.991C266.235 59.2453 255.674 58.1337 250.116 65.915C241.779 77.0313 216.767 97.7817 196.387 97.7817C187.865 97.7817 185.456 93.7057 185.456 88.3329C230.848 84.998 239.185 47.2027 208.986 47.2027C172.858 47.2027 157.11 109.454 194.72 109.454Z"
							fill="currentColor"
						/>
					</svg>
				</a>
				<p class="settingsVersion">v{VERSION}</p>
				<button
					class="themeToggle"
					onclick={onToggleTheme}
					title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					<span class="themeIconWrapper">
						<!-- DIVERGENCE(upstream): React's `key={isDarkMode ? "sun" : "moon"}` forces
						a remount to replay the `themeIconIn` animation → a `{#key isDarkMode}`
						block, which re-creates the node on toggle for the same effect. -->
						{#key isDarkMode}
							<span class="themeIcon">
								{#if isDarkMode}
									<IconSun size={20} />
								{:else}
									<IconMoon size={20} />
								{/if}
							</span>
						{/key}
					</span>
				</button>
			</div>

			<div class="divider"></div>

			<!-- Output detail + React toggle -->
			<div class="settingsSection">
				<div class="settingsRow">
					<div class="settingsLabel">
						Output Detail
						<HelpTooltip content="Controls how much detail is included in the copied output" />
					</div>
					<button class="cycleButton" onclick={cycleOutputDetail}>
						{#key settings.outputDetail}
							<span class="cycleButtonText">{currentOutputLabel}</span>
						{/key}
						<span class="cycleDots">
							{#each OUTPUT_DETAIL_OPTIONS as option (option.value)}
								<span class="cycleDot" class:active={settings.outputDetail === option.value}></span>
							{/each}
						</span>
					</button>
				</div>

				<div class="settingsRow settingsRowMarginTop" class:settingsRowDisabled={!isDevMode}>
					<div class="settingsLabel">
						React Components
						<HelpTooltip
							content={!isDevMode
								? 'Disabled — production builds minify component names, making detection unreliable. Use in development mode.'
								: 'Include React component names in annotations'}
						/>
					</div>
					<Switch
						checked={isDevMode && settings.reactEnabled}
						onchange={(e) => onSettingsChange({ reactEnabled: e.currentTarget.checked })}
						disabled={!isDevMode}
					/>
				</div>

				<div class="settingsRow settingsRowMarginTop">
					<div class="settingsLabel">
						Hide Until Restart
						<HelpTooltip content="Hides the toolbar until you open a new tab" />
					</div>
					<Switch
						checked={false}
						onchange={(e) => {
							if (e.currentTarget.checked) onHideToolbar();
						}}
					/>
				</div>
			</div>

			<div class="divider"></div>

			<!-- Color picker -->
			<div class="settingsSection">
				<div class="settingsLabel settingsLabelMarker">Marker Color</div>
				<div class="colorOptions">
					{#each COLOR_OPTIONS as color (color.id)}
						<button
							class="colorOption"
							class:selected={settings.annotationColorId === color.id}
							style:--swatch={color.srgb}
							style:--swatch-p3={color.p3}
							onclick={() => onSettingsChange({ annotationColorId: color.id })}
							title={color.label}
							aria-label={color.label}
							type="button"
						></button>
					{/each}
				</div>
			</div>

			<div class="divider"></div>

			<!-- Checkboxes -->
			<div class="settingsSection">
				<CheckboxField
					class="checkbox-field"
					label="Clear on copy/send"
					checked={settings.autoClearAfterCopy}
					onchange={(e) => onSettingsChange({ autoClearAfterCopy: e.currentTarget.checked })}
					tooltip="Automatically clear annotations after copying"
				/>
				<CheckboxField
					class="agentation-settings-checkbox-field"
					label="Block page interactions"
					checked={settings.blockInteractions}
					onchange={(e) => onSettingsChange({ blockInteractions: e.currentTarget.checked })}
				/>
			</div>

			<div class="divider"></div>

			<!-- Nav to automations -->
			<button class="settingsNavLink" onclick={() => onSettingsPageChange('automations')}>
				<span>Manage MCP &amp; Webhooks</span>
				<span class="settingsNavLinkRight">
					{#if endpoint && connectionStatus !== 'disconnected'}
						<span
							class="mcpNavIndicator"
							class:connected={connectionStatus === 'connected'}
							class:connecting={connectionStatus === 'connecting'}
						></span>
					{/if}
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M7.5 12.5L12 8L7.5 3.5"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
			</button>
		</div>

		<!-- ── Automations page ── -->
		<div class="settingsPage automationsPage" class:slideIn={settingsPage === 'automations'}>
			<button class="settingsBackButton" onclick={() => onSettingsPageChange('main')}>
				<IconChevronLeft size={16} />
				<span>Manage MCP &amp; Webhooks</span>
			</button>

			<div class="divider"></div>

			<!-- MCP section -->
			<div class="settingsSection">
				<div class="settingsRow">
					<span class="automationHeader">
						MCP Connection
						<HelpTooltip
							content="Connect via Model Context Protocol to let AI agents like Claude Code receive annotations in real-time."
						/>
					</span>
					{#if endpoint}
						<div
							class="mcpStatusDot"
							class:connecting={connectionStatus === 'connecting'}
							class:connected={connectionStatus === 'connected'}
							class:disconnected={connectionStatus === 'disconnected'}
							title={connectionStatus === 'connected'
								? 'Connected'
								: connectionStatus === 'connecting'
									? 'Connecting...'
									: 'Disconnected'}
						></div>
					{/if}
				</div>
				<p class="automationDescription" style="padding-bottom: 6px;">
					MCP connection allows agents to receive and act on annotations.
					<a
						href="https://agentation.dev/mcp"
						target="_blank"
						rel="noopener noreferrer"
						class="learnMoreLink"
					>
						Learn more
					</a>
				</p>
			</div>

			<div class="divider"></div>

			<!-- Webhooks section -->
			<div class="settingsSection settingsSectionGrow">
				<div class="settingsRow">
					<span class="automationHeader">
						Webhooks
						<HelpTooltip
							content="Send annotation data to any URL endpoint when annotations change. Useful for custom integrations."
						/>
					</span>
					<div class="autoSendContainer">
						<label
							for="agentation-auto-send"
							class="autoSendLabel"
							class:active={settings.webhooksEnabled}
							class:disabled={!settings.webhookUrl}
						>
							Auto-Send
						</label>
						<Switch
							id="agentation-auto-send"
							checked={settings.webhooksEnabled}
							onchange={(e) => onSettingsChange({ webhooksEnabled: e.currentTarget.checked })}
							disabled={!settings.webhookUrl}
						/>
					</div>
				</div>
				<p class="automationDescription">
					The webhook URL will receive live annotation changes and annotation data.
				</p>
				<!-- DIVERGENCE(upstream): React's controlled `onChange` (fires on input) →
				`oninput` for the same live-update semantics; `e.target` → `e.currentTarget`. -->
				<textarea
					class="webhookUrlInput"
					placeholder="Webhook URL"
					value={settings.webhookUrl}
					onkeydown={(e) => e.stopPropagation()}
					oninput={(e) => onSettingsChange({ webhookUrl: e.currentTarget.value })}
				></textarea>
			</div>
		</div>
	</div>
</div>

<!-- DIVERGENCE(upstream): styles.module.scss (809 LOC) → scoped <style>. Class names
kept verbatim, Svelte's per-component hashing replacing the CSS-module hashing; SCSS
`&` nesting flattened to plain CSS (no preprocessor in this repo). `[data-agentation-theme="…"]`
ancestor selectors (the theme attribute lives on the toolbar root, outside this scope)
wrap the ancestor in `:global(...)` so the rightmost class stays scoped — same treatment
as the sibling ports. Dropped rules defined upstream but never applied by the panel JSX
(dead): `.settingsBrandSlash`, `.settingsOption`, `.dropdownButton`, `.slider`,
`.sliderLabel` — carrying only applied classes keeps Svelte's unused-CSS check clean.
The `.checkboxField` margin rule targets the *second* CheckboxField, whose class lands
on a child-component root (outside this scope), so it is a `:global` namespaced
descendant (`agentation-settings-checkbox-field`) — same cross-scope treatment as the
help-tooltip port. -->
<style>
	@keyframes cycleTextIn {
		0% {
			opacity: 0;
			transform: translateY(-6px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes mcpPulse {
		0% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--agentation-color-green) 50%, transparent);
		}
		70% {
			box-shadow: 0 0 0 6px color-mix(in srgb, var(--agentation-color-green) 0%, transparent);
		}
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--agentation-color-green) 0%, transparent);
		}
	}

	@keyframes mcpPulseError {
		0% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--agentation-color-red) 50%, transparent);
		}
		70% {
			box-shadow: 0 0 0 6px color-mix(in srgb, var(--agentation-color-red) 0%, transparent);
		}
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--agentation-color-red) 0%, transparent);
		}
	}

	@keyframes themeIconIn {
		0% {
			opacity: 0;
			transform: scale(0.8) rotate(-30deg);
		}
		100% {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	/* Panel container */
	.settingsPanel {
		position: absolute;
		right: 5px;
		bottom: calc(100% + 0.5rem);
		z-index: 1;
		overflow: hidden;
		background: #1c1c1c;
		border-radius: 16px;
		padding: 12px 0;
		width: 100%;
		max-width: 253px;
		min-width: 205px;
		cursor: default;
		opacity: 1;
		box-shadow:
			0 1px 8px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(0, 0, 0, 0.04);
		transition:
			background-color 0.25s ease,
			box-shadow 0.25s ease;
	}

	.settingsPanel::before,
	.settingsPanel::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 16px;
		z-index: 2;
		pointer-events: none;
	}

	.settingsPanel::before {
		left: 0;
		background: linear-gradient(to right, #1c1c1c 0%, transparent 100%);
	}

	.settingsPanel::after {
		right: 0;
		background: linear-gradient(to left, #1c1c1c 0%, transparent 100%);
	}

	.settingsPanel .settingsHeader,
	.settingsPanel .settingsBrand,
	.settingsPanel .settingsVersion,
	.settingsPanel .settingsSection,
	.settingsPanel .settingsLabel,
	.settingsPanel .cycleButton,
	.settingsPanel .cycleDot,
	.settingsPanel .themeToggle {
		transition:
			background-color 0.25s ease,
			color 0.25s ease,
			border-color 0.25s ease;
	}

	.settingsPanel.enter {
		opacity: 1;
		transform: translateY(0) scale(1);
		filter: blur(0px);
		transition:
			opacity 0.2s ease,
			transform 0.2s ease,
			filter 0.2s ease;
	}

	.settingsPanel.exit {
		opacity: 0;
		transform: translateY(8px) scale(0.95);
		filter: blur(5px);
		pointer-events: none;
		transition:
			opacity 0.1s ease,
			transform 0.1s ease,
			filter 0.1s ease;
	}

	:global([data-agentation-theme='dark']) .settingsPanel {
		background: #1a1a1a;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.3),
			0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	:global([data-agentation-theme='dark']) .settingsPanel .settingsLabel {
		color: rgba(255, 255, 255, 0.6);
	}

	.settingsPanelContainer {
		overflow: visible;
		position: relative;
		display: flex;
		padding: 0 16px;
	}

	/* Pages (main / automations) */
	.settingsPage {
		min-width: 100%;
		flex-basis: 0;
		flex-shrink: 0;
		transition:
			transform 0.2s ease,
			opacity 0.2s ease;
		transition-delay: 0s;
		opacity: 1;
	}

	.settingsPage.slideLeft {
		transform: translateX(-24px);
		opacity: 0;
		pointer-events: none;
	}

	.automationsPage {
		position: absolute;
		top: 0;
		left: 24px;
		width: 100%;
		height: 100%;
		padding: 0 16px 4px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		transition:
			transform 0.2s ease,
			opacity 0.2s ease;
		opacity: 0;
		pointer-events: none;
	}

	.automationsPage.slideIn {
		transform: translateX(-24px);
		opacity: 1;
		pointer-events: auto;
	}

	/* Header */
	.settingsHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 24px;
	}

	.settingsBrand {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: -0.0094em;
		color: #fff;
		text-decoration: none;
	}

	.settingsVersion {
		font-size: 11px;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.4);
		margin-left: auto;
		letter-spacing: -0.0094em;
	}

	.themeToggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		margin-left: 8px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: rgb(255 255 255 / 0.4);
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
		cursor: pointer;
	}

	.themeToggle:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	:global([data-agentation-theme='light']) .themeToggle {
		color: rgba(0, 0, 0, 0.4);
	}

	:global([data-agentation-theme='light']) .themeToggle:hover {
		background: rgba(0, 0, 0, 0.06);
		color: rgba(0, 0, 0, 0.7);
	}

	.themeIconWrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		width: 20px;
		height: 20px;
	}

	.themeIcon {
		display: flex;
		align-items: center;
		justify-content: center;
		animation: themeIconIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	/* Sections & rows */
	.settingsSectionGrow {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.settingsRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 24px;
	}

	.settingsRow.settingsRowMarginTop {
		margin-top: 8px;
	}

	.settingsRowDisabled .settingsLabel {
		color: rgba(255, 255, 255, 0.2);
	}

	:global([data-agentation-theme='light']) .settingsRowDisabled .settingsLabel {
		color: rgba(0, 0, 0, 0.2);
	}

	.settingsLabel {
		display: flex;
		align-items: center;
		column-gap: 2px;
		line-height: 20px;
		font-size: 13px;
		font-weight: 400;
		letter-spacing: -0.15px;
		color: rgb(255 255 255 / 0.5);
	}

	:global([data-agentation-theme='light']) .settingsLabel {
		color: rgb(0 0 0 / 0.5);
	}

	/* Output detail cycle button */
	.cycleButton {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0;
		border: none;
		background: transparent;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #fff;
		cursor: pointer;
		letter-spacing: -0.0094em;
	}

	:global([data-agentation-theme='light']) .cycleButton {
		color: rgba(0, 0, 0, 0.85);
	}

	.cycleButton:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.cycleButtonText {
		display: inline-block;
		animation: cycleTextIn 0.2s ease-out;
	}

	.cycleDots {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.cycleDot {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		transform: scale(0.667);
		transition:
			background-color 0.25s ease-out,
			transform 0.25s ease-out;
	}

	.cycleDot.active {
		background: #fff;
		transform: scale(1);
	}

	:global([data-agentation-theme='light']) .cycleDot {
		background: rgba(0, 0, 0, 0.2);
	}

	:global([data-agentation-theme='light']) .cycleDot.active {
		background: rgba(0, 0, 0, 0.7);
	}

	/* Color picker */
	.colorOptions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 6px;
		height: 26px;
	}

	.colorOption {
		padding: 0;
		position: relative;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		background-color: #fff;
		cursor: pointer;
	}

	:global([data-agentation-theme='dark']) .colorOption {
		background-color: #1a1a1a;
	}

	.colorOption::before,
	.colorOption::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background-color: var(--swatch);
		transition:
			opacity 0.2s,
			transform 0.2s;
	}

	@supports (color: color(display-p3 0 0 0)) {
		.colorOption::before,
		.colorOption::after {
			--color: var(--swatch-p3);
		}
	}

	.colorOption::after {
		z-index: -1;
		transform: scale(1.2);
		opacity: 0;
	}

	.colorOption.selected::before {
		transform: scale(0.8);
	}

	.colorOption.selected::after {
		opacity: 1;
	}

	/* Nav link (main → automations) */
	.settingsNavLink {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		height: 24px;
		padding: 0;
		border: none;
		background: transparent;
		font-family: inherit;
		line-height: 20px;
		font-size: 13px;
		font-weight: 400;
		color: rgb(255 255 255 / 0.5);
		transition: color 0.15s ease;
		cursor: pointer;
	}

	.settingsNavLink:hover {
		color: rgb(255 255 255 / 0.9);
	}

	.settingsNavLink svg {
		color: rgb(255 255 255 / 0.4);
		transition: color 0.15s ease;
	}

	.settingsNavLink:hover svg {
		color: #fff;
	}

	:global([data-agentation-theme='light']) .settingsNavLink {
		color: rgba(0, 0, 0, 0.5);
	}

	:global([data-agentation-theme='light']) .settingsNavLink:hover {
		color: rgba(0, 0, 0, 0.8);
	}

	:global([data-agentation-theme='light']) .settingsNavLink svg {
		color: rgba(0, 0, 0, 0.25);
	}

	:global([data-agentation-theme='light']) .settingsNavLink:hover svg {
		color: rgba(0, 0, 0, 0.8);
	}

	.settingsNavLinkRight {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	/* Automations page */
	.settingsBackButton {
		display: flex;
		align-items: center;
		gap: 4px;
		height: 24px;
		background: transparent;
		font-family: inherit;
		line-height: 20px;
		font-size: 13px;
		font-weight: 500;
		letter-spacing: -0.15px;
		color: #fff;
		cursor: pointer;
		transition: transform 0.12s cubic-bezier(0.32, 0.72, 0, 1);
	}

	/* DIVERGENCE(upstream): the chevron is the `IconChevronLeft` *component*, whose
	`<svg>` lives in its own scope — a panel-scoped `.settingsBackButton svg` would
	never match (and Svelte flags it unused). `:global(svg)` under the scoped
	`.settingsBackButton` ancestor reaches it without leaking (same cross-scope
	treatment as the help-tooltip port). */
	.settingsBackButton :global(svg) {
		opacity: 0.4;
		flex-shrink: 0;
		transition:
			opacity 0.15s ease,
			transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.settingsBackButton:hover :global(svg) {
		opacity: 1;
	}

	:global([data-agentation-theme='light']) .settingsBackButton {
		color: rgba(0, 0, 0, 0.85);
		border-bottom-color: rgba(0, 0, 0, 0.08);
	}

	.automationHeader {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		font-size: 0.8125rem;
		font-weight: 400;
		color: #fff;
	}

	:global([data-agentation-theme='light']) .automationHeader {
		color: rgba(0, 0, 0, 0.85);
	}

	.automationDescription {
		font-size: 0.6875rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 2px;
		line-height: 14px;
	}

	:global([data-agentation-theme='light']) .automationDescription {
		color: rgba(0, 0, 0, 0.5);
	}

	.learnMoreLink {
		color: rgba(255, 255, 255, 0.8);
		text-decoration-line: underline;
		text-decoration-style: dotted;
		text-decoration-color: rgba(255, 255, 255, 0.2);
		text-underline-offset: 2px;
		transition: color 0.15s ease;
	}

	.learnMoreLink:hover {
		color: #fff;
	}

	:global([data-agentation-theme='light']) .learnMoreLink {
		color: rgba(0, 0, 0, 0.6);
		text-decoration-color: rgba(0, 0, 0, 0.2);
	}

	:global([data-agentation-theme='light']) .learnMoreLink:hover {
		color: rgba(0, 0, 0, 0.85);
	}

	.autoSendContainer {
		display: flex;
		align-items: center;
	}

	.autoSendLabel {
		padding-inline-end: 8px;
		font-size: 11px;
		font-weight: 400;
		color: rgb(255 255 255 / 0.4);
		transition:
			color 0.15s,
			opacity 0.15s;
		cursor: pointer;
	}

	.autoSendLabel.active {
		color: #66b8ff;
		color: color(display-p3 0.4 0.72 1);
	}

	:global([data-agentation-theme='light']) .autoSendLabel {
		color: rgba(0 0 0 / 0.4);
	}

	:global([data-agentation-theme='light']) .autoSendLabel.active {
		color: var(--agentation-color-blue);
	}

	.autoSendLabel.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.mcpStatusDot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.mcpStatusDot.connecting {
		background-color: var(--agentation-color-yellow);
		animation: mcpPulse 1.5s infinite;
	}

	.mcpStatusDot.connected {
		background-color: var(--agentation-color-green);
		animation: mcpPulse 2.5s ease-in-out infinite;
	}

	.mcpStatusDot.disconnected {
		background-color: var(--agentation-color-red);
		animation: mcpPulseError 2s infinite;
	}

	.mcpNavIndicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.mcpNavIndicator.connected {
		background-color: var(--agentation-color-green);
		animation: mcpPulse 2.5s ease-in-out infinite;
	}

	.mcpNavIndicator.connecting {
		background-color: var(--agentation-color-yellow);
		animation: mcpPulse 1.5s ease-in-out infinite;
	}

	.webhookUrlInput {
		display: block;
		width: 100%;
		flex: 1;
		min-height: 60px;
		box-sizing: border-box;
		margin-top: 11px;
		padding: 8px 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.03);
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 400;
		color: #fff;
		outline: none;
		resize: none;
		user-select: text;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.webhookUrlInput::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.webhookUrlInput:focus {
		border-color: rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.08);
	}

	:global([data-agentation-theme='light']) .webhookUrlInput {
		border-color: rgba(0, 0, 0, 0.1);
		background: rgba(0, 0, 0, 0.03);
		color: rgba(0, 0, 0, 0.85);
	}

	:global([data-agentation-theme='light']) .webhookUrlInput::placeholder {
		color: rgba(0, 0, 0, 0.3);
	}

	:global([data-agentation-theme='light']) .webhookUrlInput:focus {
		border-color: rgba(0, 0, 0, 0.25);
		background: rgba(0, 0, 0, 0.05);
	}

	/* Light mode overrides */
	:global([data-agentation-theme='light']) .settingsPanel {
		background: #fff;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.06),
			0 0 0 1px rgba(0, 0, 0, 0.04);
	}

	:global([data-agentation-theme='light']) .settingsPanel::before {
		background: linear-gradient(to right, #fff 0%, transparent 100%);
	}

	:global([data-agentation-theme='light']) .settingsPanel::after {
		background: linear-gradient(to left, #fff 0%, transparent 100%);
	}

	:global([data-agentation-theme='light']) .settingsPanel .settingsHeader {
		border-bottom-color: rgba(0, 0, 0, 0.08);
	}

	:global([data-agentation-theme='light']) .settingsPanel .settingsBrand {
		color: #e5484d;
	}

	:global([data-agentation-theme='light']) .settingsPanel .settingsVersion {
		color: rgba(0, 0, 0, 0.4);
	}

	:global([data-agentation-theme='light']) .settingsPanel .settingsSection {
		border-top-color: rgba(0, 0, 0, 0.08);
	}

	:global([data-agentation-theme='light']) .settingsPanel .settingsLabel {
		color: rgba(0, 0, 0, 0.5);
	}

	:global([data-agentation-theme='light']) .settingsPanel .cycleButton {
		color: rgba(0, 0, 0, 0.85);
	}

	:global([data-agentation-theme='light']) .settingsPanel .cycleDot {
		background: rgba(0, 0, 0, 0.2);
	}

	:global([data-agentation-theme='light']) .settingsPanel .cycleDot.active {
		background: rgba(0, 0, 0, 0.7);
	}

	.settingsSection :global(.agentation-settings-checkbox-field:not(:first-child)) {
		margin-top: 8px;
	}

	.divider {
		margin-block: 8px;
		width: 100%;
		height: 1px;
		background-color: rgb(26 26 26 / 0.07);
	}

	:global([data-agentation-theme='dark']) .divider {
		background-color: rgb(255 255 255 / 0.07);
	}
</style>
