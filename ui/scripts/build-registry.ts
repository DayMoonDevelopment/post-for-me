/*
 * Registry build — emits a self-contained registry-item JSON per base × style.
 *
 * Most components are style-invariant (standard tokens + composed `@shadcn` primitives
 * that carry the per-style look themselves). The **avatars** are the exception: they
 * adopt each style's surface via `cn-avatar-*` hooks, which `transformStyle` resolves
 * into that style's concrete utilities here (from registry/styles/style-<name>.css),
 * so a consumer's install of `base-sera/platform-avatar` really is sera's surface.
 * `inlineIcons` then resolves any `IconPlaceholder` to lucide. A leaked `cn-*` (an
 * undefined hook) or `IconPlaceholder` fails the build.
 *
 * Output: registry-dist/<base>-<style>/<name>.json — what a consumer fetches on
 * `shadcn add`. Served (dynamically, so installs can be counted) from
 * https://ui.postforme.dev/r/<base>-<style>/<name>.json, which is the
 * `{style}/{name}.json` shape the @post-for-me namespace resolves (the consumer's
 * components.json `style` field carries the <base>-<style> slug). The resource route
 * at app/registry-serve bundles this dir at build time.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import { createStyleMap, transformStyle } from "shadcn/utils";


type Item = {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies: string[];
  // Other registry items this depends on. Bare names resolve from @shadcn
  // (e.g. "avatar"); `@post-for-me/…` reference our own items.
  registryDependencies?: string[];
  // Semantic-token vars shipped with the item so a consumer gets them on install.
  cssVars?: Record<string, Record<string, string>>;
  // Raw CSS shipped with the item (shadcn writes it into the consumer's globals on
  // install) — e.g. a custom `@keyframes` a component's animation depends on. Keyed by
  // at-rule/selector; value is the nested declaration block. Pairs with `cssVars.theme`
  // (which registers the `--animate-*` utility that references the keyframe).
  css?: Record<string, unknown>;
  // Source path relative to app/. NO install target — shadcn resolves the location
  // from the item `type` via the CONSUMER's aliases (registry:ui → ui alias,
  // registry:component → components alias), so it lands correctly whether the
  // consumer uses `app/ui` or `components/ui`. Omit for a cssVars-only item (the
  // `tokens` item) — it ships `cssVars` with no `files`.
  file?: string;
  // A multi-file / directory component: every source path it ships, relative to app/.
  // Use INSTEAD of `file` when an item ships more than one file (its parts import each
  // other relatively). Primitive-agnostic — the SAME list ships under all bases, so
  // don't combine with `radixFile`. Emits a multi-element `files[]`.
  files?: string[];
  // Bases this item ships under. A primitive-agnostic item (plain React — no
  // @base-ui/react / radix-ui import) is byte-identical across bases, so it ships the
  // SAME `file` under both `base-*` and `radix-*` — set `["base", "radix"]`. A
  // component that wraps a primitive whose API differs supplies `radixFile` and its
  // radix variant is built from that. Defaults to `["base"]` so a wrapping component
  // can never accidentally ship its Base-UI source to a radix consumer.
  bases?: readonly ("base" | "radix")[];
  // Radix-specific source (relative to app/) for the `radix` base, when the Base-UI
  // `file` can't be reused verbatim. Omit for primitive-agnostic items.
  radixFile?: string;
};

// Items are grouped only for source organization; the base axis (base / radix) is
// per-item via `Item.bases`, because most items are primitive-agnostic and ship the
// same source under both bases.
type ItemGroup = {
  items: Item[];
};

const ROOT = process.cwd();
const REGISTRY_ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";

// The style slugs we serve as `<base>-<style>` URLs. Our components are
// style-invariant, so these only pick which URL a consumer resolves — the look comes
// from tokens + the shadcn per-style primitives the component composes. A shipped
// component must contain no `cn-*` (the leak check enforces it). Keep in lockstep
// with AXES.style / SHIPPED_STYLES in app/showcase/presets.ts.
const STYLES = [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const;

// The registry's custom semantic tokens (ReUI-derived), shipped ONCE via the
// `tokens` item and pulled in by any component that uses them (registryDependencies).
// base shadcn ships only `--destructive`; these extend it. Three cssVars keys the
// shadcn CLI routes to different places (verified in the shadcn CLI source):
//   theme -> @theme  (the --color-* mappings that MAKE bg-*/text-* utilities exist)
//   light -> :root      dark -> .dark   (the values)
// Ship BOTH the value and the @theme mapping or the utility silently won't exist.
// Values reference Tailwind v4's built-in palette, which every consumer already has.
const TOKENS_CSS_VARS = {
  theme: {
    "color-success": "var(--success)",
    "color-success-foreground": "var(--success-foreground)",
    "color-warning": "var(--warning)",
    "color-warning-foreground": "var(--warning-foreground)",
    "color-info": "var(--info)",
    "color-info-foreground": "var(--info-foreground)",
    "color-destructive-foreground": "var(--destructive-foreground)",
    "color-invert": "var(--invert)",
    "color-invert-foreground": "var(--invert-foreground)",
  },
  light: {
    success: "var(--color-emerald-500)",
    "success-foreground": "var(--color-emerald-900)",
    warning: "var(--color-yellow-500)",
    "warning-foreground": "var(--color-yellow-900)",
    info: "var(--color-violet-500)",
    "info-foreground": "var(--color-violet-900)",
    "destructive-foreground": "var(--color-red-800)",
    invert: "var(--color-zinc-900)",
    "invert-foreground": "var(--color-zinc-50)",
  },
  dark: {
    success: "var(--color-emerald-500)",
    "success-foreground": "var(--color-emerald-600)",
    warning: "var(--color-yellow-500)",
    "warning-foreground": "var(--color-yellow-600)",
    info: "var(--color-violet-500)",
    "info-foreground": "var(--color-violet-600)",
    "destructive-foreground": "var(--color-red-600)",
    invert: "var(--color-zinc-700)",
    "invert-foreground": "var(--color-zinc-50)",
  },
};

const GROUPS: ItemGroup[] = [
  {
    items: [
      // Shared domain types (registry:lib) — a single source of truth every
      // component pulls in via registryDependencies. Install target = the lib alias.
      {
        name: "types",
        type: "registry:lib",
        title: "Post for Me Types",
        description:
          "Shared Post for Me domain types (SocialProvider) used across the components.",
        dependencies: ["post-for-me"],
        bases: ["base", "radix"],
        file: "lib/post-for-me.types.ts",
      },
      {
        name: "utils",
        type: "registry:lib",
        title: "Post for Me Utils",
        description:
          "Per-platform caption limits plus helpers for counting and evaluating caption length.",
        dependencies: [],
        registryDependencies: ["@post-for-me/types"],
        bases: ["base", "radix"],
        file: "lib/post-for-me.utils.ts",
      },
      // Social Post Configuration — the API↔frontend config foundation (registry:lib).
      // Pure data + validation primitives that every configuration UI treatment
      // composes; no pixels. See the pfm-registry-types skill.
      {
        name: "social-post-configuration-types",
        type: "registry:lib",
        title: "Social Post Configuration Types",
        description:
          "Value types for a social post's platform and account configurations, re-exported from the post-for-me SDK.",
        dependencies: ["post-for-me"],
        bases: ["base", "radix"],
        file: "lib/social-post-configuration.types.ts",
      },
      {
        name: "social-post-configuration-limits",
        type: "registry:lib",
        title: "Social Post Configuration Limits",
        description:
          "Per-platform configuration limits (title/description caps, media counts, poll rules) — the shared source the schema and validation both read.",
        dependencies: [],
        registryDependencies: ["@post-for-me/types"],
        bases: ["base", "radix"],
        file: "lib/social-post-configuration.limits.ts",
      },
      {
        name: "social-post-configuration-schema",
        type: "registry:lib",
        title: "Social Post Configuration Schema",
        description:
          "Declarative, renderer-agnostic metamodel of every platform's configuration fields — the foundation every configuration UI walks.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/types",
          "@post-for-me/social-post-configuration-limits",
        ],
        bases: ["base", "radix"],
        file: "lib/social-post-configuration.schema.ts",
      },
      {
        name: "social-post-configuration-validation",
        type: "registry:lib",
        title: "Social Post Configuration Validation",
        description:
          "Zod validation for social post configurations — derived per-platform schemas plus the cross-field rules the API rejects on (TikTok, X, YouTube).",
        dependencies: ["zod"],
        registryDependencies: [
          "@post-for-me/types",
          "@post-for-me/social-post-configuration-types",
          "@post-for-me/social-post-configuration-schema",
          "@post-for-me/social-post-configuration-limits",
        ],
        bases: ["base", "radix"],
        file: "lib/social-post-configuration.validation.ts",
      },
      {
        name: "use-hydrated",
        type: "registry:hook",
        title: "useHydrated",
        description:
          "Returns true once mounted on the client (after hydration) — gate client-only rendering (e.g. a local timezone date) so it can't mismatch the server HTML.",
        dependencies: [],
        registryDependencies: [],
        bases: ["base", "radix"],
        file: "hooks/use-hydrated.ts",
      },
      {
        name: "use-social-post-configuration",
        type: "registry:hook",
        title: "useSocialPostConfiguration",
        description:
          "Headless state for a social post's per-platform configuration — resolves account overrides over platform config over defaults, and drives any layout.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/types",
          "@post-for-me/utils",
          "@post-for-me/social-post-configuration-types",
          "@post-for-me/social-post-configuration-schema",
        ],
        bases: ["base", "radix"],
        file: "hooks/use-social-post-configuration.ts",
      },
      {
        name: "use-social-post-composer",
        type: "registry:hook",
        title: "useSocialPostComposer",
        description:
          "Headless state for a WHOLE social post — targeted accounts, caption, media, schedule, and the per-platform config (delegated to useSocialPostConfiguration). Drives the media preview + the Publish gate and assembles the create-post body.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/types",
          "@post-for-me/use-social-post-configuration",
          "@post-for-me/social-post-configuration-types",
          "@post-for-me/social-post-configuration-schema",
        ],
        bases: ["base", "radix"],
        file: "hooks/use-social-post-composer.ts",
      },
      {
        name: "social-post-configuration",
        type: "registry:component",
        title: "Social Post Configuration",
        description:
          "Per-platform post configuration as an accordion — a validity dot per platform, required options always visible, advanced collapsed, and a per-account override drill-in.",
        dependencies: [],
        registryDependencies: [
          "accordion",
          "button",
          "button-group",
          "checkbox",
          "switch",
          "input",
          "label",
          "textarea",
          "@post-for-me/platform-avatar",
          "@post-for-me/user-avatar",
          "@post-for-me/status-indicator",
          "@post-for-me/use-social-post-configuration",
          "@post-for-me/social-post-configuration-schema",
          "@post-for-me/social-post-configuration-types",
          "@post-for-me/types",
        ],
        // Base-only: the accordion Root API differs between Base UI (openMultiple) and
        // Radix (type/collapsible), so this ships under base (a radix twin can follow).
        bases: ["base"],
        file: "components/social-post-configuration.tsx",
      },
      {
        name: "social-post-media",
        type: "registry:component",
        title: "Social Post Media",
        description:
          "A responsive media picker for a social post — a horizontally-scrolling card strip on desktop and a stacked row list on mobile, with dnd-kit drag-to-reorder (whole-card on desktop, per-row handle on touch), click-or-drop file adding, fade animations, and an info tooltip for accepted types + size.",
        dependencies: [
          "motion",
          "@dnd-kit/core",
          "@dnd-kit/sortable",
          "@dnd-kit/utilities",
        ],
        registryDependencies: ["attachment", "tooltip"],
        // Base-only: composes the Base UI `attachment` primitive, like the composer block.
        bases: ["base"],
        file: "components/social-post-media.tsx",
      },
      // ── Social Post Preview — split into layers so consumers can drop to raw
      // primitives (ui/) or take the batteries-included auto-renderer (component).
      // Pure core (types + cascade resolver) → lib; the phone/chrome primitives → ui,
      // one installable item per platform; the processing engine → a hook; the
      // opinionated SocialPostPreviewAutoRender + switcher → the component.
      {
        name: "social-post-preview-types",
        type: "registry:lib",
        title: "Social Post Preview Types",
        description:
          "Render-model types for the Social Post Preview — the per-account descriptor, surface, normalized media, and the SocialPostPreviewInput a preview accepts (a retrieved SocialPost or an authoring draft).",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/types",
          "@post-for-me/social-post-configuration-types",
        ],
        bases: ["base", "radix"],
        file: "lib/social-post-preview-types.ts",
      },
      {
        name: "social-post-preview-resolver",
        type: "registry:lib",
        title: "Social Post Preview Resolver",
        description:
          "Pure, headless config-cascade resolver — turns a Post for Me social post into per-account render descriptors (post ▸ platform ▸ account) and the distinct preview views.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/types",
          "@post-for-me/utils",
          "@post-for-me/social-post-preview-types",
        ],
        bases: ["base", "radix"],
        file: "lib/social-post-preview-resolver.ts",
      },
      {
        name: "use-social-post-preview",
        type: "registry:hook",
        title: "useSocialPostPreview",
        description:
          "Headless engine behind the Social Post Preview — materializes local File/Blob media into object URLs (owning their lifecycle) and resolves the config cascade into descriptors + views. Compose it with the ui primitives to build your own preview surface.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-resolver",
        ],
        bases: ["base", "radix"],
        file: "hooks/use-social-post-preview.ts",
      },
      {
        name: "social-post-preview-media",
        type: "registry:component",
        title: "Social Post Preview Media",
        description:
          "The shared media rendering the per-platform chromes build on — the URL media item (image / video / local blob), the 1–4 feed grid collage, and the flat-media helpers. Not visual on its own; a chrome dependency.",
        dependencies: [],
        registryDependencies: ["@post-for-me/social-post-preview-types"],
        bases: ["base", "radix"],
        files: [
          "components/social-post-preview/social-post-preview-media.tsx",
          "components/social-post-preview/social-post-preview-feed-media.tsx",
          "components/social-post-preview/social-post-preview-flat-media.ts",
        ],
      },
      // Per-platform chrome primitives (registry:ui) — one item per platform, all of
      // that platform's surfaces/variants in a single `<platform>-chrome.tsx` file.
      {
        name: "x-chrome",
        type: "registry:ui",
        title: "X Chrome",
        description:
          "A strictly-primitive X (Twitter) timeline post — the XPost shell (avatar · header · caption · action bar) plus the XPostMedia (1–4 media grid) and XPostQuote (quote-tweet card) child slots. Compose them by hand, or use SocialPostPreview to map a whole post onto them.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/x-chrome.tsx",
      },
      {
        name: "tiktok-chrome",
        type: "registry:ui",
        title: "TikTok Chrome",
        description:
          "A strictly-primitive TikTok video surface — the TikTokPost frame (relative 9:19.5) plus the TikTokPostMedia (full-bleed media + scrim) and TikTokPostUI (right action rail + bottom-left meta) layers. Compose them by hand, or use SocialPostPreview to map a whole post onto them.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/tiktok-chrome.tsx",
      },
      {
        name: "instagram-chrome",
        type: "registry:ui",
        title: "Instagram Chrome",
        description:
          "Strictly-primitive Instagram surfaces — InstagramPost (feed shell + InstagramPostMedia slot, with the swipeable carousel), plus the InstagramReel and InstagramStory vertical frames with their media + UI layers. Compose them by hand, or use SocialPostPreview to map a whole post onto them.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
          "carousel",
        ],
        bases: ["base", "radix"],
        file: "ui/instagram-chrome.tsx",
      },
      {
        name: "facebook-chrome",
        type: "registry:ui",
        title: "Facebook Chrome",
        description:
          "The Facebook chrome for the Social Post Preview — feed, reel, and story surfaces.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/facebook-chrome.tsx",
      },
      {
        name: "youtube-chrome",
        type: "registry:ui",
        title: "YouTube Chrome",
        description:
          "The YouTube chrome for the Social Post Preview — the landscape video (watch) page and vertical Short surfaces as strict primitives (SocialPostPreview picks between them by the cover's orientation).",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/youtube-chrome.tsx",
      },
      {
        name: "linkedin-chrome",
        type: "registry:ui",
        title: "LinkedIn Chrome",
        description:
          "The LinkedIn chrome for the Social Post Preview — a feed post with media grid and action bar.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/linkedin-chrome.tsx",
      },
      {
        name: "threads-chrome",
        type: "registry:ui",
        title: "Threads Chrome",
        description:
          "The Threads chrome for the Social Post Preview — a feed post with media grid and action bar.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/threads-chrome.tsx",
      },
      {
        name: "bluesky-chrome",
        type: "registry:ui",
        title: "Bluesky Chrome",
        description:
          "The Bluesky chrome for the Social Post Preview — a feed post with media grid and action bar.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/bluesky-chrome.tsx",
      },
      {
        name: "pinterest-chrome",
        type: "registry:ui",
        title: "Pinterest Chrome",
        description:
          "The Pinterest chrome for the Social Post Preview — a pin with the action bar, Save button, and creator row.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/user-avatar",
          "skeleton",
        ],
        bases: ["base", "radix"],
        file: "ui/pinterest-chrome.tsx",
      },
      {
        name: "social-post-preview",
        type: "registry:component",
        title: "Social Post Preview",
        description:
          "Renders a Post for Me social post as platform-accurate mock previews. Hand SocialPostPreview a social post and it applies the full configuration cascade (post ▸ platform ▸ account) to render one frame per targeted account, each dispatched to its platform×surface chrome in a phone device frame. Drop to the per-platform `<platform>-chrome` primitives to build your own.",
        dependencies: [],
        registryDependencies: [
          "toggle",
          "skeleton",
          "@post-for-me/brand-mark",
          "@post-for-me/user-avatar",
          "@post-for-me/social-post-preview-types",
          "@post-for-me/social-post-preview-resolver",
          "@post-for-me/use-social-post-preview",
          "@post-for-me/social-post-preview-media",
          "@post-for-me/x-chrome",
          "@post-for-me/tiktok-chrome",
          "@post-for-me/instagram-chrome",
          "@post-for-me/facebook-chrome",
          "@post-for-me/youtube-chrome",
          "@post-for-me/linkedin-chrome",
          "@post-for-me/threads-chrome",
          "@post-for-me/bluesky-chrome",
          "@post-for-me/pinterest-chrome",
        ],
        // The story arrows' horizontal nudge. Ships as a real `animate-*` utility + its
        // `@keyframes` (not an inline <style>) so the same one keyframe drives every story
        // surface — Instagram, Facebook, … — and is tunable per install/consumer via the
        // CSS variables it reads:
        //   --social-post-story-arrow-travel  how far it nudges         (default 0.34em)
        //   --social-post-story-arrow-pause   the hold between bounces  (default 1.4s)
        //   --social-post-story-arrow-dir     ±1, set per arrow (next +, prev −)
        // The loop is bounce (first 32%) + pause (last 68%); duration is derived from
        // `pause` so tuning the hold keeps that ratio. Mirrored in app/app.css for the
        // showcase (which renders from source, not an install).
        cssVars: {
          theme: {
            "animate-social-post-story-arrow":
              "social-post-story-arrow calc(var(--social-post-story-arrow-pause, 1.4s) / 0.68) ease-out infinite",
          },
        },
        css: {
          "@keyframes social-post-story-arrow": {
            "0%": { transform: "translateX(0)" },
            "16%": {
              transform:
                "translateX(calc(var(--social-post-story-arrow-dir, 1) * var(--social-post-story-arrow-travel, 0.34em)))",
            },
            "32%, 100%": { transform: "translateX(0)" },
          },
        },
        // The integration: SocialPostPreview + dispatcher + its exclusive scaffolding
        // (device frame, frame context, feed skeleton). Primitive-agnostic plain React, so
        // one file list ships under both bases.
        bases: ["base", "radix"],
        files: [
          "components/social-post-preview/index.ts",
          "components/social-post-preview/social-post-preview.tsx",
          "components/social-post-preview/social-post-preview-story.tsx",
          "components/social-post-preview/social-post-preview-device.tsx",
          "components/social-post-preview/social-post-preview-context.tsx",
          "components/social-post-preview/social-post-preview-feed-skeleton.tsx",
        ],
      },
      // Blocks — complete, copyable compositions (registry:block). Wire our components
      // together into a full experience; a consumer copies and owns the result.
      {
        name: "social-account-connection-01",
        type: "registry:block",
        title: "Social Account Connection 01",
        description:
          "A list of social platforms, each offering to connect an account. Rows are shadcn's Item primitive, so they look native to the installed style; the connect click is yours to wire to your own auth-url route.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/platform-avatar",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/status-indicator",
          "@post-for-me/types",
          "@post-for-me/utils",
          "item",
          "button",
          "dialog",
        ],
        // Base-only: DialogTrigger/DialogClose use Base UI's `render` prop
        // (a radix consumer would use `asChild`).
        bases: ["base"],
        file: "blocks/social-account-connection-01.tsx",
      },
      {
        name: "social-account-connection-02",
        type: "registry:block",
        title: "Social Account Connection 02",
        description:
          "Multiple accounts per platform: the row shows an avatar group of who's connected, and manage opens a dialog listing each account with a disconnect plus a way to connect another.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/platform-avatar",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/status-indicator",
          "@post-for-me/types",
          "@post-for-me/utils",
          "avatar",
          "item",
          "button",
          "dialog",
          "dropdown-menu",
        ],
        // Base-only: DialogTrigger/DialogClose/DropdownMenuTrigger use Base UI's
        // `render` prop (a radix consumer would use `asChild`).
        bases: ["base"],
        file: "blocks/social-account-connection-02.tsx",
      },
      {
        name: "social-account-connection-03",
        type: "registry:block",
        title: "Social Account Connection 03",
        description:
          "Social sets (accordion): a purchased bundle holds one account per platform. Each set is a collapsible panel — header shows its name and fill summary; expanding reveals the per-platform connect/disconnect rows.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/platform-avatar",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/types",
          "@post-for-me/utils",
          "accordion",
          "avatar",
          "item",
          "button",
        ],
        bases: ["base", "radix"],
        file: "blocks/social-account-connection-03.tsx",
      },
      {
        name: "social-account-connection-04",
        type: "registry:block",
        title: "Social Account Connection 04",
        description:
          "Social sets (cards): each set is a card with its name and fill summary; Manage opens a dialog with the per-platform connect/disconnect rows. Reads as a dashboard overview.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/platform-avatar",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/types",
          "@post-for-me/utils",
          "card",
          "avatar",
          "item",
          "button",
          "dialog",
        ],
        // Base-only: DialogTrigger/DialogClose use Base UI's `render` prop.
        bases: ["base"],
        file: "blocks/social-account-connection-04.tsx",
      },
      {
        name: "social-account-connection-05",
        type: "registry:block",
        title: "Social Account Connection 05",
        description:
          "Social sets (tabs): each set is a tab (name + fill count), with the per-platform connect/disconnect rows in the panel. Clean for a small, fixed number of sets.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/platform-avatar",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/types",
          "@post-for-me/utils",
          "tabs",
          "item",
          "button",
        ],
        bases: ["base", "radix"],
        file: "blocks/social-account-connection-05.tsx",
      },
      {
        name: "social-post-composer-01",
        type: "registry:block",
        title: "Social Post Composer",
        description:
          "A complete social post composer — account selection, media (upload-at-publish), a per-platform caption, per-platform options, and scheduling — all wired to the useSocialPostComposer provider.",
        dependencies: ["date-fns"],
        registryDependencies: [
          "@post-for-me/account-selector",
          "@post-for-me/caption-composer",
          "@post-for-me/platform-avatar",
          "@post-for-me/user-avatar",
          "@post-for-me/social-post-configuration",
          "@post-for-me/social-post-media",
          "@post-for-me/use-social-post-composer",
          "@post-for-me/use-hydrated",
          "@post-for-me/types",
          "button",
          "input",
          "label",
        ],
        // Base-only: the account cluster renders the trigger AS a Button via Base UI's
        // `render` (a radix consumer would use `asChild`), like account-selector-inline-avatars.
        bases: ["base"],
        file: "blocks/social-post-composer-01.tsx",
      },
      // Registry-owned custom tokens (ReUI-derived). A cssVars-only item (no file):
      // the CLI injects theme -> @theme, light -> :root, dark -> .dark on install.
      // Every component that uses a custom token depends on this, so the tokens ship
      // once and stay consistent (the single-source pattern shared with `types`).
      {
        name: "tokens",
        type: "registry:style",
        title: "Post for Me Tokens",
        description:
          "Registry-owned semantic color tokens (success, warning, info, destructive-foreground, invert) injected into your global CSS.",
        dependencies: [],
        bases: ["base", "radix"],
        cssVars: TOKENS_CSS_VARS,
      },
      {
        name: "status-indicator",
        type: "registry:ui",
        title: "Status Indicator",
        description:
          "A small round status dot in a semantic color (default, success, warning, destructive, info).",
        dependencies: ["class-variance-authority"],
        registryDependencies: ["@post-for-me/tokens"],
        bases: ["base", "radix"],
        file: "ui/status-indicator.tsx",
      },
      {
        name: "brand-mark",
        type: "registry:ui",
        title: "Brand Mark",
        description:
          "Brand marks for the social platforms plus a dispatcher that renders one by id.",
        dependencies: [],
        registryDependencies: ["@post-for-me/types"],
        bases: ["base", "radix"],
        file: "ui/brand-mark.tsx",
      },
      {
        name: "platform-avatar",
        type: "registry:component",
        title: "Platform Avatar",
        description:
          "A social platform's brand mark in a rounded avatar, over the base Avatar. Optional status dot.",
        // Imports cva for the badge placement variants.
        dependencies: ["class-variance-authority"],
        // Only what it imports. The status dot is placed as children by the consumer
        // (via PlatformAvatarBadge); components that render one (caption-composer,
        // the examples) declare @post-for-me/status-indicator themselves.
        registryDependencies: [
          "avatar",
          "@post-for-me/types",
          "@post-for-me/brand-mark",
        ],
        // Wraps Avatar via its common API only (no render/asChild) — one source both bases.
        bases: ["base", "radix"],
        file: "components/platform-avatar.tsx",
      },
      {
        name: "user-avatar",
        type: "registry:component",
        title: "User Avatar",
        description:
          "A user identity avatar — photo, initials, or icon — with optional status + platform decorators.",
        // No icon library: the fallback glyph is authored via IconPlaceholder and
        // inlined to lucide (shadcn's assumed init default), so it isn't a declared dep.
        dependencies: ["class-variance-authority"],
        // Only the base Avatar it actually imports. The status/platform decorators are
        // placed as children by the consumer — the installable EXAMPLES pull those in.
        registryDependencies: ["avatar"],
        // Wraps Avatar via its common API only (no render/asChild); Avatar has no
        // base/radix API delta, so one source ships under both bases.
        bases: ["base", "radix"],
        file: "components/user-avatar.tsx",
      },
      {
        name: "user-badge",
        type: "registry:component",
        title: "User Badge",
        description:
          "A compact identity pill — a small user avatar plus a label — optionally removable.",
        // No npm deps: the × glyph is an IconPlaceholder inlined to lucide.
        dependencies: [],
        // brand-mark for the trailing platform indicator; types for `SocialProvider`.
        registryDependencies: [
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/types",
        ],
        bases: ["base", "radix"],
        file: "components/user-badge.tsx",
      },
      {
        name: "account-selector",
        type: "registry:component",
        title: "Account Selector",
        description:
          "A searchable, platform-grouped multi-select popover for connected social accounts.",
        // Glyphs (chevron, search, the checkbox's check) inline to lucide.
        dependencies: [],
        registryDependencies: [
          "popover",
          "command",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/types",
          "@post-for-me/utils",
        ],
        // Composes Popover/Command via their common (no render/asChild) API — Command
        // is cmdk under both bases — so one source ships under both.
        bases: ["base", "radix"],
        file: "components/account-selector.tsx",
      },
      {
        name: "caption-composer",
        type: "registry:component",
        title: "Caption Composer",
        description:
          "A multi-line caption field with optional per-platform character budgets.",
        dependencies: [],
        registryDependencies: [
          "field",
          "textarea",
          "tooltip",
          "@post-for-me/types",
          "@post-for-me/utils",
          "@post-for-me/platform-avatar",
          "@post-for-me/status-indicator",
        ],
        // Uses the tooltip trigger via its plain (no render/asChild) form, so it's
        // base-agnostic — one source ships under both bases.
        bases: ["base", "radix"],
        file: "components/caption-composer.tsx",
      },
      // Installable examples — each drops a composed usage AND pulls in the raw
      // components it uses (registryDependencies), like ReUI / shadcn examples.
      //
      // Block-style composition samples (a complete "select + display" flow) filed as
      // examples for now — each is independently installable via its own name.
      {
        name: "account-selector-combobox-accessory",
        type: "registry:example",
        title: "Account Selector — Combobox (avatar accessory)",
        description:
          "A multi-select combobox with removable badges inside the trigger; the platform notches on the avatar.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/account-selector",
          "@post-for-me/user-badge",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/types",
        ],
        // Composition JSX only — base-agnostic, ships under both.
        bases: ["base", "radix"],
        file: "examples/account-selector-combobox-accessory.tsx",
      },
      {
        name: "account-selector-combobox-brand",
        type: "registry:example",
        title: "Account Selector — Combobox (brand at end)",
        description:
          "A multi-select combobox with removable badges inside the trigger; the platform brand mark sits at the badge end.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/account-selector",
          "@post-for-me/user-badge",
          "@post-for-me/types",
        ],
        bases: ["base", "radix"],
        file: "examples/account-selector-combobox-brand.tsx",
      },
      {
        name: "account-selector-inline-avatars",
        type: "registry:example",
        title: "Account Selector — Inline Avatars",
        description:
          "Pick accounts, then show them as a Button + trigger plus an overlapping avatar cluster that fans out to remove on hover.",
        dependencies: [],
        registryDependencies: [
          "button",
          "@post-for-me/account-selector",
          "@post-for-me/user-avatar",
          "@post-for-me/brand-mark",
          "@post-for-me/types",
        ],
        // Base-only: renders the trigger AS a Button via Base UI's `render` (a radix
        // consumer would use `asChild`), so this sample ships under base only.
        file: "examples/account-selector-inline-avatars.tsx",
      },
      {
        name: "user-avatar-with-status",
        type: "registry:example",
        title: "User Avatar with Status",
        description:
          "A UserAvatar with a StatusIndicator placed in a badge slot.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/user-avatar",
          "@post-for-me/status-indicator",
        ],
        file: "examples/user-avatar-with-status.tsx",
      },
      {
        name: "user-avatar-with-status-and-platform",
        type: "registry:example",
        title: "User Avatar with Status and Platform",
        description:
          "A UserAvatar with a PlatformAvatar and a StatusIndicator in badge slots.",
        dependencies: [],
        registryDependencies: [
          "@post-for-me/user-avatar",
          "@post-for-me/status-indicator",
          "@post-for-me/platform-avatar",
        ],
        file: "examples/user-avatar-with-status-and-platform.tsx",
      },
      {
        name: "caption-composer-basic",
        type: "registry:example",
        title: "Caption Composer",
        description:
          "A caption field with per-platform character budgets.",
        dependencies: [],
        registryDependencies: ["@post-for-me/caption-composer"],
        file: "examples/caption-composer-basic.tsx",
      },
    ],
  },
];

// Components author icons as <IconPlaceholder lucide="User" tabler="IconUser" …/>
// so the showcase can swap the glyph live per the Icon Library configurator. The
// SHIPPED item must be one portable library, so inline the `lucide` glyph (the
// registry's default) and drop the placeholder + its other-library names — the
// icon analog of transformStyle's cn-* inlining.
function inlineIcons(source: string): string {
  const used = new Set<string>();
  const out = source.replace(
    /<IconPlaceholder\b([\s\S]*?)\/>/g,
    (whole, rawAttrs: string) => {
      const name = rawAttrs.match(/\blucide="([^"]+)"/)?.[1];
      if (!name) return whole;
      used.add(name);
      // Keep the non-library props (className, aria-*, …); drop the glyph names.
      const rest = rawAttrs
        .replace(
          /\s*\b(?:lucide|tabler|phosphor|hugeicons|remixicon)="[^"]*"/g,
          "",
        )
        .trim();
      return rest ? `<${name} ${rest} />` : `<${name} />`;
    },
  );
  if (used.size === 0) return source;
  return out.replace(
    /import\s*\{\s*IconPlaceholder\s*\}\s*from\s*["']~\/ui\/icon-placeholder["'];?/,
    `import { ${[...used].sort().join(", ")} } from "lucide-react";`,
  );
}

// Per-style `cn-*` maps (our style-adaptive components — the avatars — resolve their
// surface/radius hooks per style at build, so a consumer's install carries the look).
async function loadStyleMaps() {
  const entries = await Promise.all(
    STYLES.map(async (style) => {
      const css = await fs.readFile(
        path.join(ROOT, "registry", "styles", `style-${style}.css`),
        "utf8",
      );
      return [style, createStyleMap(css)] as const;
    }),
  );
  return new Map(entries);
}

async function build() {
  const styleMaps = await loadStyleMaps();
  const outRoot = path.join(ROOT, "registry-dist");
  // Start clean so a renamed/removed style can't leave a stale variant dir behind.
  await fs.rm(outRoot, { recursive: true, force: true });
  let written = 0;
  let remainingCn = 0;
  let remainingIcon = 0;

  for (const group of GROUPS) {
    for (const item of group.items) {
      // Components live in the app itself (app/ui, app/components) — where the
      // `~/…` aliases resolve for the showcase AND where the build reads them. A
      // cssVars-only item (the `tokens` item) has no file — it ships cssVars only.
      // Read every source file this item ships, once. A single-`file` item may add a
      // `radixFile` twin; a `files` item (a multi-file / directory component) lists all
      // its sources. Paths are relative to app/.
      const sourcePaths = [
        ...(item.file ? [item.file] : []),
        ...(item.radixFile ? [item.radixFile] : []),
        ...(item.files ?? []),
      ];
      const sourceByPath = new Map<string, string>();
      for (const sourcePath of sourcePaths) {
        sourceByPath.set(
          sourcePath,
          await fs.readFile(path.join(ROOT, "app", sourcePath), "utf8"),
        );
      }

      // The base axis is per item: a plain item ships under both from one source. A
      // multi-file item is primitive-agnostic, so the SAME file list ships under both
      // bases; a single-`file` item swaps in its `radixFile` twin for the radix base.
      for (const baseName of item.bases ?? ["base"]) {
        const sourceFiles = item.files
          ? item.files
          : baseName === "radix" && item.radixFile
            ? [item.radixFile]
            : item.file
              ? [item.file]
              : [];

        for (const style of STYLES) {
          const styleMap = styleMaps.get(style)!;
          let files:
            | { path: string; type: string; content: string }[]
            | undefined;

          if (sourceFiles.length > 0) {
            files = [];
            for (const sourceFile of sourceFiles) {
              // Resolve any `cn-*` surface/radius hooks into this style's concrete
              // utilities (style-adaptive components — the avatars), then inline the
              // placeholder icons to lucide. Components with no `cn-*` (most) pass
              // through unchanged and their per-style output is identical.
              let content = await transformStyle(sourceByPath.get(sourceFile)!, {
                styleMap,
              });
              content = inlineIcons(content);

              // The distributed output must not leak cn-* tokens (other than the
              // CLI-handled allowlist). Surface any that survive so a missing style
              // rule can't ship silently. Comments are stripped first — transformStyle
              // rewrites class strings, not prose, so cn-* mentioned in doc comments is
              // expected and harmless.
              const codeOnly = content
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/\/\/.*$/gm, "");
              const leaked = codeOnly.match(/\bcn-[\w-]+\b/g) ?? [];
              remainingCn += leaked.length;
              if (leaked.length > 0) {
                console.warn(
                  `   ⚠️  ${baseName}-${style}/${sourceFile}: unresolved ${[...new Set(leaked)].join(", ")}`,
                );
              }

              // The inlined output must not leak the showcase-only IconPlaceholder.
              if (content.includes("IconPlaceholder")) {
                remainingIcon += 1;
                console.warn(
                  `   ⚠️  ${baseName}-${style}/${sourceFile}: unresolved IconPlaceholder`,
                );
              }

              files.push({
                path: `registry/${baseName}-${style}/${sourceFile}`,
                type: item.type,
                content,
              });
            }
          }

          const registryItem = {
            $schema: REGISTRY_ITEM_SCHEMA,
            name: item.name,
            type: item.type,
            title: item.title,
            description: item.description,
            dependencies: item.dependencies,
            ...(item.registryDependencies
              ? { registryDependencies: item.registryDependencies }
              : {}),
            ...(item.cssVars ? { cssVars: item.cssVars } : {}),
            ...(item.css ? { css: item.css } : {}),
            ...(files ? { files } : {}),
          };

          const dir = path.join(outRoot, `${baseName}-${style}`);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(
            path.join(dir, `${item.name}.json`),
            `${JSON.stringify(registryItem, null, 2)}\n`,
            "utf8",
          );
          written += 1;
          console.log(`   ✅ ${baseName}-${style}/${item.name}.json`);
        }
      }
    }
  }

  console.log(
    `\nBuilt ${written} registry item(s) across ${STYLES.length} style(s).`,
  );
  if (remainingCn > 0 || remainingIcon > 0) {
    console.error(
      `\n❌ ${remainingCn} unresolved cn-* + ${remainingIcon} unresolved IconPlaceholder token(s) in the output — add the missing style rule / lucide name.`,
    );
    process.exit(1);
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
