import { BlockFamilyLayout } from "./block-family-layout";
import { ComponentLayout } from "./component-layout";
import { PlatformChromeLayout } from "./platform-chrome-layout";
import { SocialPostPreviewLayout } from "./social-post-preview-layout";

/**
 * The page layouts a docs entry can choose between, keyed by the `layout` field
 * on its {@link Demo}. Add a layout by writing its component and adding it here —
 * the route dispatches on this map and needs no change.
 *
 * `component` is the default: an entry that omits `layout` gets it.
 */
export const LAYOUTS = {
  "block-family": BlockFamilyLayout,
  component: ComponentLayout,
  "social-post-preview": SocialPostPreviewLayout,
  "platform-chrome": PlatformChromeLayout,
} as const;

export type LayoutName = keyof typeof LAYOUTS;

export const DEFAULT_LAYOUT: LayoutName = "component";
