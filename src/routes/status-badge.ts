// A plain Web Component with an open shadow root, used only by the playground.
//
// This is deliberately framework-free: the toolbar's element-identification
// port (Phase 1/2) has to walk *through* shadow boundaries to name an element,
// and it must do so for real custom elements, not Svelte-compiled ones. This
// gives the manual test bed a genuine shadow tree to traverse.
//
// SSR note: the class `extends HTMLElement`, which only exists in the browser,
// so even *declaring* it at module scope would throw during SSR. Both the class
// declaration and its registration are therefore deferred into
// `defineStatusBadge()`, which the page calls from `onMount` (client only). On
// the server the `<status-badge>` tag renders as an inert element with its
// light-DOM text intact; the client upgrades it in place, so there is no
// hydration mismatch.

/**
 * Register the `<status-badge>` custom element. Safe to call repeatedly and
 * safe to import in non-browser contexts — it no-ops when `customElements`
 * is unavailable (SSR) or the tag is already defined.
 */
export function defineStatusBadge(): void {
	if (typeof customElements === 'undefined') return;
	if (customElements.get('status-badge')) return;

	class StatusBadge extends HTMLElement {
		connectedCallback() {
			// Guard against re-running if the element is moved/re-connected.
			if (this.shadowRoot) return;

			const tone = this.getAttribute('tone') ?? 'neutral';
			const root = this.attachShadow({ mode: 'open' });
			root.innerHTML = `
				<style>
					:host {
						display: inline-flex;
					}
					.badge {
						display: inline-flex;
						align-items: center;
						gap: 0.4rem;
						padding: 0.25rem 0.6rem;
						border-radius: 999px;
						font: 600 0.8rem/1 system-ui, sans-serif;
						border: 1px solid currentColor;
					}
					.badge[data-tone='positive'] {
						color: #137a4b;
						background: #e7f6ee;
					}
					.badge[data-tone='warning'] {
						color: #8a5a00;
						background: #fdf3e0;
					}
					.badge[data-tone='neutral'] {
						color: #475569;
						background: #eef2f7;
					}
					.dot {
						width: 0.5rem;
						height: 0.5rem;
						border-radius: 50%;
						background: currentColor;
					}
				</style>
				<span class="badge" part="badge" data-tone="${tone}">
					<span class="dot" part="dot"></span>
					<slot></slot>
				</span>
			`;
		}
	}

	customElements.define('status-badge', StatusBadge);
}
