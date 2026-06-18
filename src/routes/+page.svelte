<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { defineStatusBadge } from './status-badge.js';
	// Import through the package's public entry (`$lib` → `src/lib/index.ts`) under
	// the upstream name, exercising the published surface exactly as a consumer of
	// `svelte-agentation` would (issue #26 — the "fresh consumer snippet" check).
	import { Agentation } from '$lib';

	// Placeholder destination for the demo's nav/footer links. The playground
	// is a single route, so every link points home; resolve() satisfies
	// SvelteKit's no-navigation-without-resolve rule.
	const home = resolve('/');

	// The playground is the standing manual test bed for every later phase
	// (element picking, multi-select, text selection, animation freezing,
	// shadow-DOM traversal). The Agentation toolbar is mounted at the bottom of
	// this file (Phase 2, issue #24) — it portals itself into document.body, so
	// it can sit anywhere in the route. See issue #3 and PLAN.md Phase 2.

	// Register the shadow-DOM custom element on the client only.
	onMount(defineStatusBadge);

	// Static, meaningful demo data — a fake logistics product so annotation
	// output (Phase 1–3) reads real element names and nearby text, not
	// lorem-ipsum soup.
	const metrics = [
		{ label: 'Active shipments', value: '1,284', delta: '+6.2%', tone: 'positive' },
		{ label: 'On-time rate', value: '97.4%', delta: '+0.8%', tone: 'positive' },
		{ label: 'Avg transit time', value: '2.1 days', delta: '−4h', tone: 'positive' },
		{ label: 'Open issues', value: '12', delta: '+3', tone: 'warning' }
	];

	const shipments = [
		{
			id: 'MRD-4821',
			destination: 'Gothenburg, SE',
			carrier: 'NordFreight',
			status: 'In transit',
			eta: 'Jun 13'
		},
		{
			id: 'MRD-4822',
			destination: 'Hamburg, DE',
			carrier: 'EuroLine',
			status: 'Out for delivery',
			eta: 'Jun 12'
		},
		{
			id: 'MRD-4823',
			destination: 'Rotterdam, NL',
			carrier: 'NordFreight',
			status: 'Delayed',
			eta: 'Jun 14'
		},
		{
			id: 'MRD-4824',
			destination: 'Oslo, NO',
			carrier: 'FjordCargo',
			status: 'Delivered',
			eta: 'Jun 11'
		}
	];

	let demoRequested = $state(false);

	function requestDemo(event: SubmitEvent) {
		event.preventDefault();
		demoRequested = true;
	}
</script>

<svelte:head>
	<title>Meridian — real-time shipment tracking</title>
	<meta
		name="description"
		content="Meridian is a fake logistics dashboard used as the svelte-agentation playground."
	/>
</svelte:head>

<header class="site-header">
	<a class="brand" href={home}>Meridian</a>
	<nav aria-label="Primary">
		<a href={home}>Dashboard</a>
		<a href={home}>Shipments</a>
		<a href={home}>Analytics</a>
		<a href={home}>Settings</a>
	</nav>
	<a class="btn btn-primary" href={home}>Sign in</a>
</header>

<main>
	<section class="hero">
		<div class="hero-copy">
			<h1>Track every shipment in real time</h1>
			<p>
				Meridian unifies your carriers, routes, and exceptions into one live view — so your
				operations team always knows where freight is and when it lands.
			</p>
			<div class="hero-actions">
				<button class="btn btn-primary" type="button">Start free trial</button>
				<button class="btn btn-ghost" type="button">View live demo</button>
			</div>
		</div>
		<img
			class="hero-image"
			src="/coverage-map.svg"
			alt="Coverage map of routed delivery lanes between two depots"
			width="480"
			height="240"
		/>
	</section>

	<section class="status-strip" aria-label="Network status">
		<span class="live-pulse" aria-hidden="true"></span>
		<status-badge tone="positive">All systems operational</status-badge>
		<span class="status-note">Live sync active · last update just now</span>
	</section>

	<section aria-labelledby="metrics-heading">
		<h2 id="metrics-heading">This week at a glance</h2>
		<div class="card-grid">
			{#each metrics as metric (metric.label)}
				<article class="card">
					<p class="card-label">{metric.label}</p>
					<p class="card-value">{metric.value}</p>
					<p class="card-delta" data-tone={metric.tone}>{metric.delta} vs last week</p>
				</article>
			{/each}
		</div>
	</section>

	<section aria-labelledby="shipments-heading">
		<h2 id="shipments-heading">Recent shipments</h2>
		<table>
			<thead>
				<tr>
					<th scope="col">Shipment</th>
					<th scope="col">Destination</th>
					<th scope="col">Carrier</th>
					<th scope="col">Status</th>
					<th scope="col">ETA</th>
				</tr>
			</thead>
			<tbody>
				{#each shipments as shipment (shipment.id)}
					<tr>
						<td>{shipment.id}</td>
						<td>{shipment.destination}</td>
						<td>{shipment.carrier}</td>
						<td>{shipment.status}</td>
						<td>{shipment.eta}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="demo-section" aria-labelledby="demo-heading">
		<h2 id="demo-heading">Request a demo</h2>
		{#if demoRequested}
			<p class="form-success" role="status">
				Thanks — our team will reach out within one business day.
			</p>
		{:else}
			<form class="demo-form" onsubmit={requestDemo}>
				<label>
					Work email
					<input type="email" name="email" placeholder="you@company.com" required />
				</label>
				<label>
					Team size
					<select name="team-size">
						<option value="1-10">1–10 people</option>
						<option value="11-50">11–50 people</option>
						<option value="51-200">51–200 people</option>
						<option value="200+">200+ people</option>
					</select>
				</label>
				<label class="checkbox-row">
					<input type="checkbox" name="agree" required />
					I agree to be contacted about Meridian.
				</label>
				<button class="btn btn-primary" type="submit">Request demo</button>
			</form>
		{/if}
	</section>
</main>

<footer class="site-footer">
	<nav aria-label="Footer">
		<a href={home}>Product</a>
		<a href={home}>Pricing</a>
		<a href={home}>Docs</a>
		<a href={home}>Status</a>
	</nav>
	<p>© 2026 Meridian Logistics. Demo page for the svelte-agentation playground.</p>
</footer>

<!-- A position:fixed element, kept deliberately so the toolbar's fixed-element
handling (annotations on fixed targets must re-anchor to the viewport, not the
scrolled document — picker `isElementFixed`, markers controller fixed layer,
stored `isFixed`) has a live target to annotate in the playground. Bottom-left,
clear of the toolbar's bottom-right corner. See PLAN.md Phase 2 / issue #28. -->
<aside class="fixed-help" aria-label="Support">Need help? Chat with us</aside>

<!-- The Agentation toolbar. It mounts its own UI into document.body, so its
position in this markup is irrelevant — placed last by convention. -->
<Agentation />

<style>
	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		color: #0f172a;
		background: #f8fafc;
		line-height: 1.5;
	}

	.site-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1rem 2rem;
		border-bottom: 1px solid #e2e8f0;
		background: #fff;
	}
	.brand {
		font-weight: 800;
		font-size: 1.25rem;
		color: #0f172a;
		text-decoration: none;
	}
	.site-header nav {
		display: flex;
		gap: 1.25rem;
		margin-right: auto;
	}
	.site-header nav a {
		color: #475569;
		text-decoration: none;
	}
	.site-header nav a:hover {
		color: #0f172a;
	}

	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.hero {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 2rem;
		align-items: center;
	}
	.hero h1 {
		font-size: 2.25rem;
		margin: 0 0 0.75rem;
	}
	.hero p {
		color: #475569;
		margin: 0 0 1.5rem;
	}
	.hero-actions {
		display: flex;
		gap: 0.75rem;
	}
	.hero-image {
		width: 100%;
		height: auto;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
	}

	.btn {
		border: 1px solid transparent;
		border-radius: 8px;
		padding: 0.55rem 1rem;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
	}
	.btn-primary {
		background: #2563eb;
		color: #fff;
	}
	.btn-primary:hover {
		background: #1d4ed8;
	}
	.btn-ghost {
		background: transparent;
		border-color: #cbd5e1;
		color: #0f172a;
	}
	.btn-ghost:hover {
		border-color: #94a3b8;
	}

	.status-strip {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.85rem 1.1rem;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
	}
	.status-note {
		color: #64748b;
		font-size: 0.9rem;
	}

	/* Running CSS animation — kept deliberately so Phase 1's freeze-animations
	   port has a live keyframe animation to pause in the playground. */
	.live-pulse {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: #22c55e;
		box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
		animation: live-pulse 1.8s ease-out infinite;
	}
	@keyframes live-pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
		}
		70% {
			box-shadow: 0 0 0 0.6rem rgba(34, 197, 94, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
		}
	}

	h2 {
		font-size: 1.4rem;
		margin: 0 0 1rem;
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}
	.card {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1.1rem;
	}
	.card-label {
		margin: 0 0 0.4rem;
		color: #64748b;
		font-size: 0.85rem;
	}
	.card-value {
		margin: 0 0 0.4rem;
		font-size: 1.6rem;
		font-weight: 700;
	}
	.card-delta {
		margin: 0;
		font-size: 0.85rem;
	}
	.card-delta[data-tone='positive'] {
		color: #137a4b;
	}
	.card-delta[data-tone='warning'] {
		color: #8a5a00;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		overflow: hidden;
	}
	th,
	td {
		text-align: left;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid #eef2f7;
		font-size: 0.92rem;
	}
	th {
		background: #f1f5f9;
		color: #475569;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}

	.demo-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 420px;
	}
	.demo-form label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #334155;
	}
	.demo-form input[type='email'],
	.demo-form select {
		font: inherit;
		padding: 0.5rem 0.65rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #fff;
	}
	.checkbox-row {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		font-weight: 400;
	}
	.form-success {
		color: #137a4b;
		font-weight: 600;
	}

	.site-footer {
		max-width: 960px;
		margin: 2rem auto 0;
		padding: 2rem;
		border-top: 1px solid #e2e8f0;
		color: #64748b;
		font-size: 0.9rem;
	}
	.site-footer nav {
		display: flex;
		gap: 1.25rem;
		margin-bottom: 0.75rem;
	}
	.site-footer nav a {
		color: #475569;
		text-decoration: none;
	}
	.site-footer p {
		margin: 0;
	}

	/* Fixed support chip — a position:fixed target for the toolbar's
	   fixed-element annotation handling (see the markup comment). Bottom-left,
	   clear of the toolbar at bottom-right. */
	.fixed-help {
		position: fixed;
		left: 1.25rem;
		bottom: 1.25rem;
		z-index: 10;
		padding: 0.6rem 0.95rem;
		background: #0f172a;
		color: #fff;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 600;
		box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
	}
</style>
