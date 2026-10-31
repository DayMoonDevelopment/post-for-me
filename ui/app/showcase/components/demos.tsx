import accountSelectorSource from "~/components/account-selector.tsx?raw";
import captionComposerSource from "~/components/caption-composer.tsx?raw";
import accountSelectorComboboxAccessorySource from "~/examples/account-selector-combobox-accessory.tsx?raw";
import accountSelectorComboboxBrandSource from "~/examples/account-selector-combobox-brand.tsx?raw";
import accountSelectorInlineAvatarsSource from "~/examples/account-selector-inline-avatars.tsx?raw";
import platformAvatarSource from "~/components/platform-avatar.tsx?raw";
import userAvatarSource from "~/components/user-avatar.tsx?raw";
import userBadgeSource from "~/components/user-badge.tsx?raw";
import captionComposerBasicSource from "~/examples/caption-composer-basic.tsx?raw";
import userAvatarWithStatusSource from "~/examples/user-avatar-with-status.tsx?raw";
import userAvatarWithStatusAndPlatformSource from "~/examples/user-avatar-with-status-and-platform.tsx?raw";
import postForMeTypesSource from "~/lib/post-for-me.types.ts?raw";
import brandMarkSource from "~/ui/brand-mark.tsx?raw";
import statusIndicatorSource from "~/ui/status-indicator.tsx?raw";
import socialPostComposerSource from "~/blocks/social-post-composer-01.tsx?raw";
import socialAccountConnection01Source from "~/blocks/social-account-connection-01.tsx?raw";
import socialAccountConnection02Source from "~/blocks/social-account-connection-02.tsx?raw";
import socialAccountConnection03Source from "~/blocks/social-account-connection-03.tsx?raw";
import socialAccountConnection04Source from "~/blocks/social-account-connection-04.tsx?raw";
import socialAccountConnection05Source from "~/blocks/social-account-connection-05.tsx?raw";
import socialPostConfigurationComponentSource from "~/components/social-post-configuration.tsx?raw";
import socialPostPreviewSource from "~/components/social-post-preview/social-post-preview.tsx?raw";

import {
  AccountSelectorCustomTrigger,
  AccountSelectorPreview,
} from "./account-selector-demo";
import { AccountSelectorComboboxAccessory } from "~/examples/account-selector-combobox-accessory";
import { AccountSelectorComboboxBrand } from "~/examples/account-selector-combobox-brand";
import { AccountSelectorInlineAvatars } from "~/examples/account-selector-inline-avatars";
import { Callout } from "./callout";
import {
  CaptionComposerBasic,
  CaptionComposerOverLimit,
  CaptionComposerPreview,
  CaptionComposerWithHeader,
} from "./caption-composer-demo";
import {
  PlatformAvatarPreview,
  PlatformAvatarSizes,
  PlatformAvatarStatus,
} from "./platform-avatar-demo";
import type { PropGroup } from "./props-table";
import {
  BrandMarkMonochrome,
  BrandMarkPreview,
  BrandMarkReference,
  BrandMarkSizing,
} from "./brand-mark-demo";
import {
  StatusIndicatorPreview,
  StatusIndicatorSizes,
} from "./status-indicator-demo";
import { SocialProviderReference } from "./types-demo";
import { SocialAccountConnection01 } from "~/blocks/social-account-connection-01";
import { SocialAccountConnection02 } from "~/blocks/social-account-connection-02";
import { SocialAccountConnection03 } from "~/blocks/social-account-connection-03";
import { SocialAccountConnection04 } from "~/blocks/social-account-connection-04";
import { SocialAccountConnection05 } from "~/blocks/social-account-connection-05";
import {
  SocialPostConfigurationCascadeFigure,
  SocialPostConfigurationInstagramFacebook,
  SocialPostConfigurationOverrides,
  SocialPostConfigurationYoutubeTiktok,
} from "./social-post-configuration-demo";
import { SocialPostComposer } from "~/blocks/social-post-composer-01";
import { SocialPostConfigurationAccordionDemo } from "./social-post-configuration-component-demo";
import {
  SocialPostPreviewManual,
  SocialPostPreviewPreview,
} from "./social-post-preview-demo";
import {
  UserAvatarFallback,
  UserAvatarPreview,
  UserAvatarWithStatus,
  UserAvatarWithStatusAndPlatform,
} from "./user-avatar-demo";
import {
  UserBadgeDecorated,
  UserBadgePlatform,
  UserBadgePreview,
  UserBadgeRemovable,
  UserBadgeTruncated,
} from "./user-badge-demo";

export type ExampleEntry = {
  name: string;
  description?: string;
  /** A reference link rendered under the description, above the preview. */
  docs?: { href: string; label: string };
  preview: React.ReactNode;
  /** The example's source — shown in the Code tab, copyable. */
  code?: string;
  /** The @post-for-me item name — when set, the example is installable on its
   * own (and pulls in the components it uses). */
  install?: string;
};

/**
 * One installable LAYOUT within an application category on a `block-family` page:
 * its own preview + source, install command, and usage. When a category has just
 * one variation, `name` is omitted and the category heading stands for it; when
 * it has several (e.g. accordion / cards / tabs) each carries a `name`.
 */
export type DemoVariation = {
  /** The layout's full source, shown in the preview's Code tab. */
  code: string;
  /** The @post-for-me item this variation installs, e.g. `…-03`. */
  install: string;
  /** Layout name within the category (e.g. "Accordion"). Omit for a
   *  single-variation category — the category heading stands alone. */
  name?: string;
  preview: React.ReactNode;
  usage: string;
};

/**
 * An application CATEGORY on a block-family page — the use-case (e.g. "Social
 * sets"), with one or more layout {@link DemoVariation}s beneath it.
 */
export type DemoCategory = {
  description: string;
  name: string;
  variations: DemoVariation[];
};

export type Demo = {
  title: string;
  /** Nav section this page belongs to. Defaults to "Components". */
  section?: string;
  /** If set, this page nests UNDER the given demo key in the nav (a sub-item). */
  parent?: string;
  /** platform-chrome layout only: which platform's chromes this page documents. */
  platform?: string;
  /** Which page layout renders this entry (see app/showcase/layouts). Defaults
   * to "component" — the standard order. "block-family" repeats a full
   * name/preview/install/usage section per {@link variants} entry. */
  layout?:
    | "block-family"
    | "component"
    | "social-post-preview"
    | "platform-chrome";
  /** block-family only: application categories, each with 1+ layout variations. */
  categories?: DemoCategory[];
  /** block-family only: extra guidance under the one-time registry config. */
  installNote?: React.ReactNode;
  /** The @post-for-me item the Installation command adds. Defaults to the page
   * slug; set it when the slug differs from the item (every Types page → `types`). */
  install?: string;
  description: string;
  sourceFile: string;
  preview: React.ReactNode;
  /** The component's source — shown in the preview's Code tab, copyable. */
  code: string;
  usage: string;
  /** Optional reference content rendered under the Usage code (e.g. an export list). */
  usageExtra?: React.ReactNode;
  composition?: string;
  examples: ExampleEntry[];
  api: PropGroup[];
};

const STATUS_TYPE =
  '"default" | "success" | "warning" | "destructive" | "info"';

const CONFIG_DOCS = {
  href: "https://docs.postforme.dev/#tag/social-posts",
  label: "See every configuration option in the API reference",
};

/**
 * A per-platform sub-page under Social Post Preview (nested via `parent`). The
 * platform-chrome layout drives everything off `platform` + PLATFORM_DOCS, so these entries
 * only carry the nav/routing metadata; the content fields go unused (empty).
 */
function platformDemo(platform: string, title: string): Demo {
  return {
    title,
    section: "Components",
    parent: "social-post-preview",
    layout: "platform-chrome",
    platform,
    description: `${title} chromes for Social Post Preview — renderings, primitives, and composition.`,
    sourceFile: "app/components/social-post-preview",
    preview: null,
    code: "",
    usage: "",
    examples: [],
    api: [],
  };
}

// The gallery's source of truth: one entry per published Post for Me component.
export const demos: Record<string, Demo> = {
  "account-selector": {
    title: "Account Selector",
    description:
      "A searchable, platform-grouped multi-select popover for connected social accounts. Pair it with the User Badge to display the selection.",
    sourceFile: "app/components/account-selector.tsx",
    preview: <AccountSelectorPreview />,
    code: accountSelectorSource,
    usage: `import {
  AccountSelector,
  AccountSelectorTrigger,
  AccountSelectorContent,
} from "@/components/account-selector";

const [ids, setIds] = useState<string[]>([]);

// default: dropdown trigger + content
<AccountSelector accounts={accounts} value={ids} onValueChange={setIds} />

// compound: bring your own trigger (any button content), keep the Command list
<AccountSelector accounts={accounts} value={ids} onValueChange={setIds}>
  <AccountSelectorTrigger className="rounded-full border border-dashed px-3 py-1.5">
    {ids.length ? \`\${ids.length} selected\` : "Add accounts"}
  </AccountSelectorTrigger>
  <AccountSelectorContent />
</AccountSelector>`,
    examples: [
      {
        name: "Custom trigger",
        description:
          "Compose your own AccountSelectorTrigger — any button content and styling — with AccountSelectorContent. Here a dashed 'add' pill instead of the dropdown.",
        preview: <AccountSelectorCustomTrigger />,
      },
      {
        name: "Combobox · avatar accessory (block)",
        description:
          "A multi-select combobox: removable badges live inside the trigger, platform notched on the avatar. Copy it and own it.",
        preview: <AccountSelectorComboboxAccessory />,
        code: accountSelectorComboboxAccessorySource,
        install: "account-selector-combobox-accessory",
      },
      {
        name: "Combobox · brand at end (block)",
        description:
          "Same combobox, but each badge shows the platform brand mark at its trailing end (× on hover).",
        preview: <AccountSelectorComboboxBrand />,
        code: accountSelectorComboboxBrandSource,
        install: "account-selector-combobox-brand",
      },
      {
        name: "Inline avatars (block)",
        description:
          "A round + trigger plus an overlapping avatar cluster (platform notched lower-right). Empty, it's a '＋ Select account' button; hover the cluster to fan the avatars out and reveal a remove × on each.",
        preview: <AccountSelectorInlineAvatars />,
        code: accountSelectorInlineAvatarsSource,
        install: "account-selector-inline-avatars",
      },
    ],
    api: [
      {
        title: "AccountSelector (root)",
        rows: [
          {
            prop: "accounts",
            type: "SocialAccount[]",
            description: "The connected accounts to choose from.",
          },
          {
            prop: "value",
            type: "string[]",
            description: "Selected account ids (controlled).",
          },
          {
            prop: "onValueChange",
            type: "(ids: string[]) => void",
            description: "Called with the next selected ids.",
          },
          {
            prop: "defaultValue",
            type: "string[]",
            description: "Initial selection (uncontrolled).",
          },
          {
            prop: "children",
            type: "ReactNode",
            description:
              "Compose Trigger + Content; omit for the default dropdown + content.",
          },
        ],
      },
      {
        title: "AccountSelectorTrigger / AccountSelectorContent",
        rows: [
          {
            prop: "Trigger children",
            type: "ReactNode",
            description:
              "Your own button content; omit for the default count + chevron.",
          },
          {
            prop: "Trigger placeholder",
            type: "string",
            default: '"Select accounts"',
          },
          {
            prop: "Content searchPlaceholder / emptyText",
            type: "string / ReactNode",
            description: "Command search placeholder and no-results message.",
          },
          {
            prop: "Content align / className",
            type: "PopoverContent props",
            description: "Forwarded to the popover panel.",
          },
        ],
      },
      {
        title: "useAccountSelector(options)",
        rows: [
          {
            prop: "→ groups",
            type: "AccountSelectorGroup[]",
            description: "Accounts grouped by platform, in display order.",
          },
          {
            prop: "→ selectedAccounts",
            type: "SocialAccount[]",
            description: "The full account objects currently selected.",
          },
          {
            prop: "→ toggle / isSelected / clear / count",
            type: "fns + number",
            description: "Mutate and query the selection.",
          },
        ],
      },
    ],
  },
  "user-avatar": {
    title: "User Avatar",
    description:
      "A user identity — photo, initials, or icon — with composable badge decorators.",
    sourceFile: "app/components/user-avatar.tsx",
    preview: <UserAvatarPreview />,
    code: userAvatarSource,
    usage: `import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
  UserAvatarStatusBadge,
} from "@/components/user-avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { BrandMark } from "@/components/ui/brand-mark";

// UserAvatarBadge places; the pre-styled content badges own sizing + the
// "hole-punch" knockout, and scale themselves to the avatar's size. Prefer the
// icon badge over embedding a PlatformAvatar.
<UserAvatar name="Jane Doe" src="https://…/jane.jpg">
  <UserAvatarBadge placement="default">
    <UserAvatarIconBadge>
      <BrandMark platform="instagram" />
    </UserAvatarIconBadge>
  </UserAvatarBadge>
  <UserAvatarBadge placement="secondary">
    <UserAvatarStatusBadge>
      <StatusIndicator status="success" />
    </UserAvatarStatusBadge>
  </UserAvatarBadge>
</UserAvatar>`,
    composition: `UserAvatar (name, src, size, variant)
└── UserAvatarBadge (placement only)
    ├── UserAvatarIconBadge     {/* knockout disc; forces svg size */}
    │   └── <BrandMark /> or any icon
    └── UserAvatarStatusBadge   {/* knockout dot; forces size + ring */}
        └── <StatusIndicator />`,
    examples: [
      {
        name: "Fallback chain",
        description: "Photo → 2-char initials → generic user icon.",
        preview: <UserAvatarFallback />,
      },
      {
        name: "With status",
        description:
          "A UserAvatarStatusBadge owns the dot's size and its knockout ring — drop a bare StatusIndicator in.",
        preview: <UserAvatarWithStatus />,
        code: userAvatarWithStatusSource,
        install: "user-avatar-with-status",
      },
      {
        name: "With status + platform",
        description:
          "A UserAvatarIconBadge (brand mark) in the default corner, a status badge bumped to secondary. No embedded PlatformAvatar.",
        preview: <UserAvatarWithStatusAndPlatform />,
        code: userAvatarWithStatusAndPlatformSource,
        install: "user-avatar-with-status-and-platform",
      },
    ],
    api: [
      {
        title: "UserAvatar",
        rows: [
          {
            prop: "name",
            type: "string | null",
            description: "Drives the initials and the image alt text.",
          },
          {
            prop: "src",
            type: "string | null",
            description:
              "Profile photo URL. Falls back to initials, then icon.",
          },
          {
            prop: "size",
            type: '"sm" | "default" | "lg"',
            default: '"default"',
          },
          {
            prop: "variant",
            type: '"default" | "prominent"',
            default: '"default"',
          },
          {
            prop: "children",
            type: "ReactNode",
            description: "UserAvatarBadge decorator slots.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "UserAvatarBadge",
        rows: [
          {
            prop: "placement",
            type: '"default" | "secondary"',
            default: '"default"',
            description:
              "Position: default = lower-trailing corner; secondary = upper-leading.",
          },
          {
            prop: "children",
            type: "ReactNode",
            description:
              "A UserAvatarIconBadge or UserAvatarStatusBadge. Placement only — the content badge owns its styling.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "UserAvatarIconBadge",
        rows: [
          {
            prop: "children",
            type: "ReactNode",
            description:
              "A BrandMark or any icon (svg). Forced to size by a child selector; scales with the avatar's size.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "UserAvatarStatusBadge",
        rows: [
          {
            prop: "children",
            type: "ReactNode",
            description:
              "A StatusIndicator. The badge forces its size and adds the knockout ring; scales with the avatar's size.",
          },
          { prop: "className", type: "string" },
        ],
      },
    ],
  },
  "user-badge": {
    title: "User Badge",
    description:
      "A compact identity pill — a small user avatar plus a label — optionally removable.",
    sourceFile: "app/components/user-badge.tsx",
    preview: <UserBadgePreview />,
    code: userBadgeSource,
    usage: `import { UserBadge } from "@/components/user-badge";
import { UserAvatarBadge } from "@/components/user-avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";

// static
<UserBadge name="Jane Doe" />

// account chip: platform brand at rest, × on hover, removable
<UserBadge name="Jane Doe" platform="instagram" onRemove={() => remove(id)} />

// cap the width — the label truncates, avatar + action stay put
<UserBadge className="max-w-40" name="A very long display name" onRemove={() => remove(id)} />

// removable + a status dot on the avatar
<UserBadge name="Jane Doe" onRemove={() => remove(id)}>
  <UserAvatarBadge>
    <StatusIndicator status="success" className="size-1.5" />
  </UserAvatarBadge>
</UserBadge>`,
    examples: [
      {
        name: "Removable",
        description: "Pass onRemove to add a trailing × that deselects.",
        preview: <UserBadgeRemovable />,
      },
      {
        name: "Platform + remove on hover",
        description:
          "With platform + onRemove, the brand mark rests on the trailing edge and swaps to × on hover/focus — the account indicator doubles as the remove control.",
        preview: <UserBadgePlatform />,
      },
      {
        name: "Truncated",
        description:
          "Cap the badge with max-w-* and the label ellipsizes; the avatar and trailing action keep their size. The full name shows on hover via a native title.",
        preview: <UserBadgeTruncated />,
      },
      {
        name: "Decorated avatar",
        description:
          "UserAvatarBadge children forward to the inner avatar — a status dot or a corner platform notch.",
        preview: <UserBadgeDecorated />,
      },
    ],
    api: [
      {
        title: "UserBadge",
        rows: [
          {
            prop: "name",
            type: "string | null",
            description: "The label, and the avatar's initials + alt text.",
          },
          {
            prop: "src",
            type: "string | null",
            description: "Profile photo URL for the avatar.",
          },
          { prop: "size", type: '"sm" | "default" | "lg"', default: '"sm"' },
          {
            prop: "platform",
            type: "SocialProvider",
            description:
              "Shows the platform brand mark on the trailing edge; with onRemove it rests as the brand and reveals × on hover/focus.",
          },
          {
            prop: "onRemove",
            type: "() => void",
            description:
              "When set, the trailing edge removes the badge (a ×, or a hover-revealed × when platform is set).",
          },
          {
            prop: "label",
            type: "ReactNode",
            description: "Override the visible label (defaults to name).",
          },
          {
            prop: "children",
            type: "ReactNode",
            description:
              "Avatar decorators — a UserAvatarBadge with a status dot / platform mark.",
          },
          { prop: "className", type: "string" },
        ],
      },
    ],
  },
  "caption-composer": {
    title: "Caption Composer",
    description:
      "A multi-line caption field with optional per-platform character budgets.",
    sourceFile: "app/components/caption-composer.tsx",
    preview: <CaptionComposerPreview />,
    code: captionComposerSource,
    usage: `import {
  CaptionComposer,
  CaptionComposerHeader,
  CaptionComposerTitle,
  CaptionComposerInput,
  CaptionComposerFooter,
  CaptionComposerCount,
  CaptionComposerPlatforms,
} from "@/components/caption-composer";

<CaptionComposer defaultValue="" platforms={["x", "instagram", "bluesky"]}>
  <CaptionComposerHeader>
    <CaptionComposerTitle>What do you want to post?</CaptionComposerTitle>
  </CaptionComposerHeader>
  <CaptionComposerInput placeholder="Write a caption…" />
  <CaptionComposerFooter>
    <CaptionComposerCount />
    <CaptionComposerPlatforms />
  </CaptionComposerFooter>
</CaptionComposer>`,
    usageExtra: (
      <Callout>
        Character limits are approximate hints for the tightest targeted
        platform — they highlight the field and the affected platforms, but
        never block typing. The platform itself is the final word on what it
        accepts.
      </Callout>
    ),
    composition: `CaptionComposer (value, defaultValue, onValueChange, platforms)
├── CaptionComposerHeader
│   └── CaptionComposerTitle
├── CaptionComposerInput (placeholder)
└── CaptionComposerFooter
    ├── CaptionComposerCount (platform)
    └── CaptionComposerPlatforms
        └── CaptionComposerPlatform (platform)`,
    examples: [
      {
        name: "Basic",
        description:
          "The full composer — the field, a count, and the targeted platforms (hover one for its character limit).",
        preview: <CaptionComposerBasic />,
        code: captionComposerBasicSource,
        install: "caption-composer-basic",
      },
      {
        name: "With a header",
        description:
          "Add a CaptionComposerHeader for a label and the count above the field.",
        preview: <CaptionComposerWithHeader />,
      },
      {
        name: "Over the limit",
        description:
          "The field borders destructive and each over-budget platform flips to an invalid state.",
        preview: <CaptionComposerOverLimit />,
      },
    ],
    api: [
      {
        title: "CaptionComposer",
        rows: [
          {
            prop: "value",
            type: "string",
            description: "Controlled caption text.",
          },
          {
            prop: "defaultValue",
            type: "string",
            default: '""',
            description: "Initial text when uncontrolled.",
          },
          {
            prop: "onValueChange",
            type: "(value: string) => void",
            description: "Called with the caption on every edit.",
          },
          {
            prop: "platforms",
            type: "SocialProvider[]",
            default: "[]",
            description: "Platforms to measure the caption against.",
          },
          { prop: "children", type: "ReactNode" },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "CaptionComposerTitle",
        rows: [
          {
            prop: "children",
            type: "ReactNode",
            description: "The header title or prompt text.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "CaptionComposerInput",
        rows: [
          { prop: "placeholder", type: "string" },
          { prop: "className", type: "string" },
          {
            prop: "…textarea props",
            type: 'ComponentProps<"textarea">',
            description:
              "Forwarded to the underlying Textarea (which grows with its content).",
          },
        ],
      },
      {
        title: "CaptionComposerCount",
        rows: [
          {
            prop: "platform",
            type: "SocialProvider",
            description:
              "Count against this platform. Omitted → the tightest targeted platform, or a plain count when none are targeted.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "CaptionComposerPlatforms",
        rows: [
          {
            prop: "children",
            type: "ReactNode",
            description:
              "Explicit CaptionComposerPlatform children. Omitted → one per targeted platform.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "CaptionComposerPlatform",
        rows: [
          {
            prop: "platform",
            type: "SocialProvider",
            description: "The targeted platform this avatar represents.",
          },
          { prop: "className", type: "string" },
        ],
      },
    ],
  },
  "platform-avatar": {
    title: "Platform Avatar",
    description:
      "A social platform's brand mark in a soft rounded avatar, with composable corner badges.",
    sourceFile: "app/components/platform-avatar.tsx",
    preview: <PlatformAvatarPreview />,
    code: platformAvatarSource,
    usage: `import {
  PlatformAvatar,
  PlatformAvatarBadge,
  PlatformAvatarStatusBadge,
} from "@/components/platform-avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";

// The pre-styled content badges own sizing + the knockout and scale to the
// avatar's size; PlatformAvatarBadge is placement only.
<PlatformAvatar platform="instagram">
  <PlatformAvatarBadge placement="default">
    <PlatformAvatarStatusBadge>
      <StatusIndicator status="success" />
    </PlatformAvatarStatusBadge>
  </PlatformAvatarBadge>
</PlatformAvatar>`,
    composition: `PlatformAvatar (platform, size)
└── PlatformAvatarBadge (placement only)
    ├── PlatformAvatarIconBadge     {/* knockout disc; forces svg size */}
    │   └── <BrandMark /> or any icon
    └── PlatformAvatarStatusBadge   {/* knockout dot; forces size + ring */}
        └── <StatusIndicator />`,
    examples: [
      {
        name: "Sizes",
        description: "sm · default · lg — forwarded to the base Avatar.",
        preview: <PlatformAvatarSizes />,
      },
      { name: "With a status dot", preview: <PlatformAvatarStatus /> },
    ],
    api: [
      {
        title: "PlatformAvatar",
        rows: [
          {
            prop: "platform",
            type: "SocialProvider",
            description: "The platform whose brand mark to render.",
          },
          {
            prop: "size",
            type: '"sm" | "default" | "lg"',
            default: '"default"',
            description: "Forwarded to the base Avatar.",
          },
          {
            prop: "children",
            type: "ReactNode",
            description: "PlatformAvatarBadge decorator slots.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "PlatformAvatarBadge",
        rows: [
          {
            prop: "placement",
            type: '"default" | "secondary"',
            default: '"default"',
            description:
              "Position: default = lower-trailing corner; secondary = upper-leading.",
          },
          {
            prop: "children",
            type: "ReactNode",
            description:
              "A PlatformAvatarIconBadge or PlatformAvatarStatusBadge. Placement only.",
          },
          { prop: "className", type: "string" },
        ],
      },
      {
        title: "PlatformAvatarIconBadge / PlatformAvatarStatusBadge",
        rows: [
          {
            prop: "children",
            type: "ReactNode",
            description:
              "An icon (svg) or a StatusIndicator. The badge forces its size (and, for status, the knockout ring) and scales with the avatar's size.",
          },
          { prop: "className", type: "string" },
        ],
      },
    ],
  },
  "brand-mark": {
    title: "Brand Mark",
    description:
      "Brand marks for every social platform — used on their own, or picked by id with a small helper.",
    sourceFile: "app/ui/brand-mark.tsx",
    preview: <BrandMarkPreview />,
    code: brandMarkSource,
    usage: `import {
  BrandMark,
  InstagramIcon,
} from "@/components/ui/brand-mark";

// Dispatch by provider id…
<BrandMark platform="instagram" className="size-6" />

// …or drop in a brand mark directly:
<InstagramIcon className="size-6" />`,
    usageExtra: (
      <Callout>
        TikTok Business is a standalone, secondary official TikTok API, so the
        TikTok mark is re-exported under both <code>TikTokIcon</code> (
        <code>tiktok</code>) and <code>TikTokBusinessIcon</code> (
        <code>tiktok_business</code>).
      </Callout>
    ),
    examples: [
      {
        name: "Sizing",
        description: "Size via className; official brand colors by default.",
        preview: <BrandMarkSizing />,
      },
      {
        name: "Monochrome",
        description:
          'variant="monochrome" drops the brand color and inherits currentColor.',
        preview: <BrandMarkMonochrome />,
      },
      {
        name: "Every icon",
        description: "Each brand mark, exported by name.",
        preview: <BrandMarkReference />,
      },
    ],
    api: [
      {
        title: "BrandMark",
        rows: [
          {
            prop: "platform",
            type: "SocialProvider",
            description: "Which platform's brand mark to render.",
          },
          {
            prop: "variant",
            type: '"brand" | "monochrome"',
            default: '"brand"',
            description:
              "brand = official colors; monochrome inherits currentColor.",
          },
          {
            prop: "className",
            type: "string",
            description: "Size and any one-off color.",
          },
        ],
      },
    ],
  },
  "status-indicator": {
    title: "Status Indicator",
    description:
      "A small round status dot in a semantic color (default, success, warning, destructive, info).",
    sourceFile: "app/ui/status-indicator.tsx",
    preview: <StatusIndicatorPreview />,
    code: statusIndicatorSource,
    usage: `import { StatusIndicator } from "@/components/ui/status-indicator";

<StatusIndicator status="success" className="size-3" />`,
    examples: [
      {
        name: "Size + ring",
        description: "Size, ring, and position come from className.",
        preview: <StatusIndicatorSizes />,
      },
    ],
    api: [
      {
        title: "StatusIndicator",
        rows: [
          {
            prop: "status",
            type: STATUS_TYPE,
            default: '"default"',
            description: "The semantic color of the dot.",
          },
          {
            prop: "className",
            type: "string",
            description: "Size, ring, and position.",
          },
        ],
      },
    ],
  },
  "social-provider": {
    title: "Social Provider",
    section: "Types",
    install: "types",
    description:
      "The union of social providers the API returns — for typing platform props and account data.",
    sourceFile: "app/lib/post-for-me.types.ts",
    preview: <SocialProviderReference />,
    code: postForMeTypesSource,
    usage: `import type { SocialProvider } from "~/lib/post-for-me.types";

// The platforms the API returns.
const provider: SocialProvider = "instagram";`,
    examples: [],
    api: [],
  },
  "social-post-configuration": {
    title: "Social Post Configuration",
    install: "social-post-configuration",
    description:
      "Per-platform post configuration as an accordion: a validity dot per platform (green once its required options are set, amber when not), required options always visible, advanced ones behind an inline toggle, and a per-account override drill-in. It runs the useSocialPostConfiguration hook internally and shares it via context.",
    sourceFile: "app/components/social-post-configuration.tsx",
    preview: <SocialPostConfigurationAccordionDemo />,
    code: socialPostConfigurationComponentSource,
    usage: `<SocialPostConfiguration
  accounts={accounts}
  value={value}
  onValueChange={setValue}
/>`,
    examples: [],
    api: [
      {
        title: "SocialPostConfiguration",
        rows: [
          {
            prop: "accounts",
            type: "SocialAccount[]",
            description:
              "The connected accounts the post targets — one accordion item per platform present.",
          },
          {
            prop: "value / defaultValue",
            type: "SocialPostConfiguration",
            description:
              "Controlled value (with onValueChange) or an uncontrolled initial value.",
          },
          {
            prop: "onValueChange",
            type: "(value) => void",
            description:
              "Called with the full, API-shaped configuration on every change.",
          },
        ],
      },
    ],
  },
  "social-post-preview": {
    title: "Social Post Preview",
    layout: "social-post-preview",
    description:
      "Renders a Post for Me social post as platform-accurate mock previews. Hand SocialPostPreview a social post and it does the rest — one frame per targeted account, the full configuration cascade applied (post ▸ platform ▸ account), each dispatched to its platform×surface chrome inside a phone device frame. Or drop to the primitives to build your own.",
    sourceFile:
      "app/components/social-post-preview/social-post-preview.tsx",
    preview: <SocialPostPreviewPreview />,
    code: socialPostPreviewSource,
    usage: `import { SocialPostPreview } from "@/components/social-post-preview";

// The Post for Me client is server-only (it holds your secret API key) — fetch the post in a
// route loader / server action / RSC and pass it down. A retrieved SocialPost works as-is: its
// social_accounts are full objects and it carries the configuration cascade.
//   // server
//   const post = await client.socialPosts.retrieve("sp_123");

// client component — just render what the server handed you:
<SocialPostPreview post={post} />

// Compose your own — resolve the cascade, then place a device + chrome by hand
import {
  SocialPostPreviewDevice,
  SocialPostPreviewChrome,
  resolveSocialPost,
} from "@/components/social-post-preview";

const [frame] = resolveSocialPost(post);

<SocialPostPreviewDevice>
  <SocialPostPreviewChrome descriptor={frame} />
</SocialPostPreviewDevice>`,
    composition: `<SocialPostPreview post={post}>   opinionated — cascade + layout + dispatch
  <SocialPostPreviewDevice>                 phone frame (owns rounding + scale)
    <SocialPostPreviewChrome>               dispatch: platform × surface → concrete
      XPost + XPostMedia/Quote                    feed
      InstagramPost + InstagramPostMedia          feed
      TikTokPost + TikTokPostMedia/UI             vertical video`,
    examples: [
      {
        name: "Compose one frame",
        description:
          "Skip the opinionated auto-renderer: resolve the cascade to descriptors and place a device + chrome yourself. The chrome dispatcher still picks the right surface (here TikTok's vertical video).",
        preview: <SocialPostPreviewManual />,
      },
    ],
    api: [
      {
        title: "SocialPostPreview",
        rows: [
          {
            prop: "post",
            type: "SocialPostPreviewInput",
            description:
              "A Post for Me social post (a retrieved SocialPost satisfies it). Rendered as one frame per targeted account with the config cascade applied.",
          },
          {
            prop: "className",
            type: "string",
            description: "Forwarded to the layout grid.",
          },
        ],
      },
      {
        title: "Primitives",
        rows: [
          {
            prop: "SocialPostPreviewDevice",
            type: "children, className",
            description:
              "The phone frame — one rounded clip that owns the corner radius and the container-relative scale.",
          },
          {
            prop: "SocialPostPreviewChrome",
            type: "descriptor?",
            description:
              "Dispatches a frame to its concrete chrome; pass a descriptor to render one by hand, or omit inside SocialPostPreview.",
          },
        ],
      },
      {
        title: "resolveSocialPost(post)",
        rows: [
          {
            prop: "→ SocialPostPreviewDescriptor[]",
            type: "one per account",
            description:
              "Pure: applies the post ▸ platform ▸ account cascade, infers media kind, and picks each account's surface.",
          },
        ],
      },
    ],
  },
  // Per-platform sub-pages (nested under Social Post Preview), in breadth-wall order.
  "social-post-preview-tiktok": platformDemo("tiktok", "TikTok"),
  "social-post-preview-instagram": platformDemo("instagram", "Instagram"),
  "social-post-preview-youtube": platformDemo("youtube", "YouTube"),
  "social-post-preview-x": platformDemo("x", "X"),
  "social-post-preview-facebook": platformDemo("facebook", "Facebook"),
  "social-post-preview-linkedin": platformDemo("linkedin", "LinkedIn"),
  "social-post-preview-pinterest": platformDemo("pinterest", "Pinterest"),
  "social-post-preview-threads": platformDemo("threads", "Threads"),
  "social-post-preview-bluesky": platformDemo("bluesky", "Bluesky"),
  "use-social-post-configuration": {
    title: "useSocialPostConfiguration",
    section: "Hooks",
    description:
      "Headless state for a per-platform post configuration UI. It holds the value, shows the right fields per platform, resolves per-account overrides, and hands you exactly what you submit — so you can build any layout (accordion, tabs, drawer) on top.",
    sourceFile: "app/hooks/use-social-post-configuration.ts",
    preview: <SocialPostConfigurationCascadeFigure />,
    code: `import { useSocialPostConfiguration } from "~/hooks/use-social-post-configuration";

// A configuration layers three sources. Field defaults come from the schema,
// platform config applies to every account, and an account override wins for one.
const value = {
  platform_configurations: {
    instagram: { placement: "reels", collaborators: ["@brand"] },
  },
  account_configurations: [
    { social_account_id: "acme_shop", configuration: { share_to_feed: false } },
  ],
};

const config = useSocialPostConfiguration({ accounts, value });

// Each account resolves account ▸ platform ▸ default, key by key:
config.getAccountValue("acme_shop", "placement");     // "reels"  — from platform
config.getAccountValue("acme_shop", "share_to_feed"); // false    — from account override
config.getAccountValue("acme_shop", "allow_comment"); // true     — from field default`,
    usage: `import { useSocialPostConfiguration } from "~/hooks/use-social-post-configuration";

function Configurator({ accounts }) {
  const config = useSocialPostConfiguration({ accounts });

  // One section per platform present among the accounts.
  return config.groups.map((group) => (
    <section key={group.platform}>
      <h4>{group.label}</h4>
      <p>{config.summaryForPlatform(group.platform) || "No extra options"}</p>

      {config.visibleFieldsForPlatform(group.platform).map((field) => (
        <Field
          key={field.key}
          field={field}
          value={config.getPlatformValue(group.platform, field.key)}
          onChange={(next) =>
            config.setPlatformField(group.platform, field.key, next)
          }
        />
      ))}
    </section>
  ));
}`,
    usageExtra: (
      <Callout>
        This hook is the headless core — it draws no UI itself. Pair it with the
        configuration schema to render each field however you like, and, when
        you want the platform rules (character limits, TikTok privacy, X polls)
        enforced before submitting, add the validation package. The value it
        holds is the exact shape you send to the API.
      </Callout>
    ),
    examples: [
      {
        name: "Set platform-specific options",
        description:
          "Give each platform its own settings. Instagram and Facebook each set their placement, and Instagram additionally overrides the post media with its own Reel — the override appears as just another value in the platform config.",
        docs: CONFIG_DOCS,
        preview: <SocialPostConfigurationInstagramFacebook />,
      },
      {
        name: "Configure several platforms at once",
        description:
          "One post, many platforms: a single configuration sets YouTube (title, privacy, made-for-kids) and TikTok (privacy, comments, branded-content disclosure) together, each under its own key in platform_configurations.",
        docs: CONFIG_DOCS,
        preview: <SocialPostConfigurationYoutubeTiktok />,
      },
      {
        name: "Override options per account",
        description:
          "When a setting differs between two accounts on the same platform, override it per account. Pinterest boards are account-specific — each account pins to its own board — so each board lands in account_configurations while shared options stay in platform_configurations.",
        docs: CONFIG_DOCS,
        preview: <SocialPostConfigurationOverrides />,
      },
    ],
    api: [
      {
        title: "useSocialPostConfiguration(options)",
        rows: [
          {
            prop: "accounts",
            type: "SocialAccount[]",
            description:
              "The connected accounts the post targets — decides which platforms appear.",
          },
          {
            prop: "value / defaultValue",
            type: "SocialPostConfiguration",
            description:
              "Controlled value (with onValueChange) or an uncontrolled initial value.",
          },
          {
            prop: "onValueChange",
            type: "(value) => void",
            description:
              "Called with the full, API-shaped value on every change.",
          },
        ],
      },
      {
        title: "→ Platform tier",
        rows: [
          {
            prop: "groups / platforms",
            type: "PlatformGroup[] / SocialProvider[]",
            description:
              "The platforms present among the accounts, ordered, each with its accounts.",
          },
          {
            prop: "visibleFieldsForPlatform",
            type: "(platform) => Field[]",
            description:
              "The fields to show for a platform, with conditional ones already filtered.",
          },
          {
            prop: "getPlatformValue / setPlatformField",
            type: "fns",
            description:
              "Read (with defaults applied) and write a platform field.",
          },
          {
            prop: "summaryForPlatform / resetPlatform",
            type: "fns",
            description:
              "A one-line summary of the current settings, and a clear-all for the platform.",
          },
        ],
      },
      {
        title: "→ Account tier (overrides)",
        rows: [
          {
            prop: "isAccountOverridden",
            type: "(accountId) => boolean",
            description: "Whether an account is being customized separately.",
          },
          {
            prop: "overrideAccount / clearAccountOverride",
            type: "fns",
            description:
              "Start or stop customizing one account; a fresh override inherits the platform.",
          },
          {
            prop: "getAccountValue / setAccountField",
            type: "fns",
            description:
              "Read (inheriting platform + defaults) and write a single account's field.",
          },
          {
            prop: "visibleFieldsForAccount / summaryForAccount",
            type: "fns",
            description:
              "The visible fields and summary for one account's override.",
          },
        ],
      },
    ],
  },
  "social-account-connection": {
    title: "Social Account Connection",
    section: "Blocks",
    layout: "block-family",
    install: "social-account-connection-01",
    description:
      "How you let people connect their social accounts depends on the app you're building — how many accounts a user may hold, and how those accounts are organized. The categories below walk through the common patterns and give you a ready-to-use block for each; pick the one that fits, install it, and own the code from there. They all build on shadcn's Item primitive, so they read native to whatever style you installed.",
    sourceFile: "app/blocks/social-account-connection-01.tsx",
    preview: <SocialAccountConnection01 />,
    code: socialAccountConnection01Source,
    usage: `import { SocialAccountConnection01 } from "~/blocks/social-account-connection-01";

<SocialAccountConnection01 />`,
    categories: [
      {
        name: "Single account per platform",
        description:
          "You might want to let each person connect only one account per platform — one Instagram, one TikTok, and so on. It keeps things unambiguous: there's never a question of which account a post goes to, and the connection list reads as settings rather than inventory. It suits focused products where someone manages their own presence. Each row shows its state: an empty slot offers to connect, a filled one shows whose account it is behind a quiet Manage, and a broken one says so and offers to reconnect.",
        variations: [
          {
            name: "List by platform",
            install: "social-account-connection-01",
            preview: <SocialAccountConnection01 />,
            code: socialAccountConnection01Source,
            usage: `import { SocialAccountConnection01 } from "~/blocks/social-account-connection-01";

<SocialAccountConnection01 />`,
          },
        ],
      },
      {
        name: "Multiple accounts per platform",
        description:
          "If your users run several presences on the same network — a few Instagram accounts, a couple of TikToks — you can let each platform hold multiple accounts. The row shows an avatar group of who's connected, and Manage opens a dialog listing every account with its own disconnect, plus a way to connect another. This fits agencies and teams as much as power users.",
        variations: [
          {
            name: "List by platform",
            install: "social-account-connection-02",
            preview: <SocialAccountConnection02 />,
            code: socialAccountConnection02Source,
            usage: `import { SocialAccountConnection02 } from "~/blocks/social-account-connection-02";

<SocialAccountConnection02 />`,
          },
        ],
      },
      {
        name: "Social sets",
        description:
          "A common pattern in social-media-management apps is the idea of a \u201csocial set\u201d — a bundle (often something a user buys) that holds one account per platform. A user can own several sets, so the job of these layouts is to organize the sets and surface each one's fill progress; within a set, it's the single-account-per-platform model above. Pick the arrangement that fits how many sets a user typically owns — accordion scales to many, cards read as an overview, tabs suit a handful.",
        variations: [
          {
            name: "Accordion",
            install: "social-account-connection-03",
            preview: <SocialAccountConnection03 />,
            code: socialAccountConnection03Source,
            usage: `import { SocialAccountConnection03 } from "~/blocks/social-account-connection-03";

<SocialAccountConnection03 />`,
          },
          {
            name: "Cards",
            install: "social-account-connection-04",
            preview: <SocialAccountConnection04 />,
            code: socialAccountConnection04Source,
            usage: `import { SocialAccountConnection04 } from "~/blocks/social-account-connection-04";

<SocialAccountConnection04 />`,
          },
          {
            name: "Tabs",
            install: "social-account-connection-05",
            preview: <SocialAccountConnection05 />,
            code: socialAccountConnection05Source,
            usage: `import { SocialAccountConnection05 } from "~/blocks/social-account-connection-05";

<SocialAccountConnection05 />`,
          },
        ],
      },
    ],
    examples: [],
    api: [],
  },
  "social-post-composer": {
    title: "Social Post Composer",
    section: "Blocks",
    install: "social-post-composer-01",
    description:
      "The composer we run in the dashboard. Pick accounts (shown as an inline avatar cluster), write a caption within each platform's limit, then tune per-platform options: required options stay visible, advanced ones collapse, and any single account can override the platform defaults. One configuration, shared via the useSocialPostConfiguration provider — the value it builds is the create-post request body. Copy it and make it yours.",
    sourceFile: "app/blocks/social-post-composer-01.tsx",
    preview: <SocialPostComposer />,
    code: socialPostComposerSource,
    usage: `import { SocialPostComposer } from "~/blocks/social-post-composer-01";

<SocialPostComposer />`,
    usageExtra: (
      <Callout>
        A block is a starting point you own, not a component with an API. This
        one composes Account Selector, Caption Composer, Platform Avatar, and
        the useSocialPostConfiguration provider. Swap the sample accounts for
        your connected accounts, and wire the Schedule button to your
        create-post call.
      </Callout>
    ),
    examples: [],
    api: [],
  },
};

export const demoOrder = Object.keys(demos);
