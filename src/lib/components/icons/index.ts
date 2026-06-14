// Icon barrel — mirrors upstream `package/src/components/icons.tsx`, which declares
// every icon as a named export in this order. Upstream's single .tsx file becomes
// one .svelte file per icon (pure SVG, no shared logic); this barrel re-exports each
// under its identical upstream name so consumers and `components/index.ts` keep
// `export * from "./icons"`. Order matches upstream's declaration order so upstream
// additions apply as an append here.

export { default as IconClose } from './IconClose.svelte';
export { default as IconPlus } from './IconPlus.svelte';
export { default as IconCheck } from './IconCheck.svelte';
export { default as IconCheckSmall } from './IconCheckSmall.svelte';
export { default as IconListSparkle } from './IconListSparkle.svelte';
export { default as IconHelp } from './IconHelp.svelte';
export { default as IconCheckSmallAnimated } from './IconCheckSmallAnimated.svelte';
export { default as IconCopyAlt } from './IconCopyAlt.svelte';
export { default as IconCopyAnimated } from './IconCopyAnimated.svelte';
export { default as IconSendArrow } from './IconSendArrow.svelte';
export { default as IconSendAnimated } from './IconSendAnimated.svelte';
export { default as IconEye } from './IconEye.svelte';
export { default as IconEyeAlt } from './IconEyeAlt.svelte';
export { default as IconEyeClosed } from './IconEyeClosed.svelte';
export { default as IconEyeAnimated } from './IconEyeAnimated.svelte';
export { default as IconPausePlayAnimated } from './IconPausePlayAnimated.svelte';
export { default as IconEyeMinus } from './IconEyeMinus.svelte';
export { default as IconGear } from './IconGear.svelte';
export { default as IconPauseAlt } from './IconPauseAlt.svelte';
export { default as IconPause } from './IconPause.svelte';
export { default as IconPlayAlt } from './IconPlayAlt.svelte';
export { default as IconTrashAlt } from './IconTrashAlt.svelte';
export { default as IconChatEllipsis } from './IconChatEllipsis.svelte';
export { default as IconCheckmark } from './IconCheckmark.svelte';
export { default as IconCheckmarkLarge } from './IconCheckmarkLarge.svelte';
export { default as IconCheckmarkCircle } from './IconCheckmarkCircle.svelte';
export { default as IconXmark } from './IconXmark.svelte';
export { default as IconXmarkLarge } from './IconXmarkLarge.svelte';
export { default as IconSun } from './IconSun.svelte';
export { default as IconMoon } from './IconMoon.svelte';
export { default as IconEdit } from './IconEdit.svelte';
export { default as IconTrash } from './IconTrash.svelte';
export { default as IconChevronLeft } from './IconChevronLeft.svelte';
export { default as IconChevronRight } from './IconChevronRight.svelte';
export { default as AnimatedBunny } from './AnimatedBunny.svelte';
export { default as IconLayout } from './IconLayout.svelte';
