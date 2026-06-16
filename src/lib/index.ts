// =============================================================================
// Agentation
// =============================================================================
//
// A floating toolbar for annotating web pages and collecting structured feedback
// for AI coding agents.
//
// Usage:
//   import { Agentation } from 'svelte-agentation';
//   <Agentation />
//
// =============================================================================
//
// Mirrors upstream `package/src/index.ts` export-for-export (issue #26). Exported
// names are upstream's verbatim (the compat contract — see CLAUDE.md
// non-negotiable #2); only the import *paths* differ, because our component dirs
// drop upstream's `-css` suffix (`page-toolbar-css` → `page-toolbar`,
// `annotation-popup-css` → `annotation-popup`) and Svelte components are default
// exports of their `index.svelte`.

// Main components
// CSS-only version (default - zero runtime deps)
// DIVERGENCE(upstream): upstream re-exports the named React function
// `PageFeedbackToolbarCSS`; here it is the default export of `index.svelte`,
// re-exported under the same two names.
export { default as Agentation } from './components/page-toolbar/index.svelte';
export { default as PageFeedbackToolbarCSS } from './components/page-toolbar/index.svelte';
export type { DemoAnnotation, AgentationProps } from './components/page-toolbar/index.svelte';

// Shared components (for building custom UIs)
export { default as AnnotationPopupCSS } from './components/annotation-popup/index.svelte';
// DIVERGENCE(upstream): upstream also exports `AnnotationPopupCSSHandle` (the
// `useImperativeHandle` ref type); the Svelte port replaces the imperative
// handle with an exported instance function `shake()` (#21), so there is no
// handle interface to export — `AnnotationPopupCSSProps` is the only popup type.
export type { AnnotationPopupCSSProps } from './components/annotation-popup/index.svelte';

// Icons (same for both versions - they're pure SVG)
export * from './components/icons';

// Utilities (for building custom UIs)
export {
	identifyElement,
	identifyAnimationElement,
	getElementPath,
	getNearbyText,
	getElementClasses,
	// Shadow DOM support
	isInShadowDOM,
	getShadowHost,
	closestCrossingShadow
} from './utils/element-identification';

export { loadAnnotations, saveAnnotations, getStorageKey } from './utils/storage';

// Types
export type { Annotation } from './types';
