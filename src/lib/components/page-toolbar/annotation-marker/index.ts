// Marker barrel — mirrors upstream `package/src/components/page-toolbar-css/annotation-marker/index.tsx`,
// which declares `AnnotationMarker`, `PendingMarker` and `ExitingMarker` as named exports
// in one file. Svelte allows one component per `.svelte` file, so each is its own file,
// re-exported here under its identical upstream name (same shape as the `icons/` barrel) so
// consumers keep `import { AnnotationMarker, ... } from ".../annotation-marker"`.
export { default as AnnotationMarker } from './AnnotationMarker.svelte';
export { default as PendingMarker } from './PendingMarker.svelte';
export { default as ExitingMarker } from './ExitingMarker.svelte';

export type { MarkerClickBehavior, AnnotationMarkerProps } from './AnnotationMarker.svelte';
export type { PendingMarkerProps } from './PendingMarker.svelte';
export type { ExitingMarkerProps } from './ExitingMarker.svelte';
