import type { ComponentType, SVGProps } from "react";

import {
  IconCircleCheck as IconCircleCheckFilled,
  IconCircleQuestionmark as IconCircleQuestionmarkFilled,
  IconFolder1 as IconFolderFilled,
} from "@central-icons/filled";
/**
 * The app icon layer — the design-system home for iconography, and the `app/ui`
 * equivalent for icons.
 *
 * Think of this file as a "locale file for icons": a single binding table that
 * maps a semantic name (intent) to a Central Icons glyph, exactly like i18n maps
 * a key to a string. Referencing project settings? Use {@link SettingsIcon}.
 * Change which glyph that is — here, once — and every call site updates.
 *
 * RULES
 * - This module is the ONLY place in app code that imports `@central-icons/*`.
 *   Everything else under `app/` imports its icons from `~/icons` — including
 *   `app/ui` shadcn components, which are LOCAL code the moment they're added
 *   (the registry is a starting point, not a dependency). A `no-restricted-imports`
 *   lint rule enforces this — currently with ZERO opt-outs; reach for
 *   `// eslint-disable-next-line no-restricted-imports -- <why>` only for a
 *   genuinely justified exception (`reportUnusedDisableDirectives` keeps it honest).
 * - Naming is SEMANTIC for stable, single-intent actions/status
 *   ({@link EditIcon}, {@link DeleteIcon}, {@link SuccessIcon}). It stays closer
 *   to LITERAL for glyphs that genuinely serve several intents
 *   ({@link RocketIcon}, {@link TagIcon}, {@link ChevronLeftIcon}) — forcing one
 *   intent-name onto a multi-purpose glyph is the trap to avoid (a pencil is
 *   edit, but also compose, rename…).
 * - Variant (outlined vs filled) is decided HERE, per concept, never at the call
 *   site. Filled = emphasis / active / selected (see the `central-icons` skill).
 * - Picking an icon from DATA at runtime (a config row that says which glyph to
 *   show) is BUSINESS LOGIC, not a primitive — build it as a component in
 *   `app/components` (or route-local) that consumes these icons. Do not add a
 *   `name → glyph` map here. `ProjectTypeIcon` (`app/ui/project-type-badge.tsx`)
 *   is the reference for that pattern.
 *
 * Adding an icon: import the glyph, wrap it with {@link icon}, export it under a
 * name chosen by the rule above, and add it to the showcase grid
 * (`app/showcase/components/icons-demo.tsx`).
 */
// prettier-ignore
import {
  IconArrowCornerDownRight,
  IconArrowDown,
  IconArrowLeft, IconArrowLeftRight, IconArrowRight,
  IconArrowRightSquare, IconArrowUp, IconArrowUpRight, IconArrowWallLeft,
  IconArrowWallRight, IconAt, IconBell2,
  IconBolt, IconBook, IconBrokenChainLink1, IconCalendarClock,
  IconCheckmark1Medium, IconCheckmark1Small,
  IconChevronDownMedium, IconChevronGrabberVertical, IconChevronLeftMedium,
  IconChevronRightMedium, IconChevronTopMedium,
  IconCircleCheck, IconCircleInfo, IconCirclePlus, IconCode, IconCreditCard1,
  IconCrossMedium,
  IconCuteRobot, IconDevices, IconDiscord, IconDotGrid1x3Horizontal, IconDotGrid2x3, IconDraft, IconEditSmall1,
  IconExclamationCircle, IconExclamationTriangle, IconEyeOpen, IconEyeSlash,
  IconFilter2, IconFolder1, IconGlobe, IconHomeLine,
  IconImages2, IconInfoSimple, IconKey2, IconLightBulbSimple, IconLoadingCircle,
  IconMagnifyingGlass,
  IconMegaphone, IconMinusMedium, IconMoon,
  IconPaperPlane, IconPlay, IconPlugin1, IconPlusMedium, IconPostcard2, IconRocket,
  IconSandbox, IconSettingsGear1, IconSettingsSliderHor,
  IconSidebarSimpleLeftSquare, IconSquareBehindSquare1,
  IconSun, IconTag, IconText1,
  IconTrashCan, IconUnpin, IconUser, IconVideo, IconWebhooks,
} from "@central-icons/outlined";
// Social-platform chrome glyphs — used by the installed `social-post-preview` component to
// mimic each network's post UI (like / comment / repost / bookmark / verified …). These are
// LITERAL platform glyphs, not app-action intents; they live here only because the icon
// boundary requires every glyph to be bound in this layer. See the `social-post-preview`
// retro note about consolidating these upstream.
// prettier-ignore
import {
  IconArrowShareRight,
  IconArrowsRepeat,
  IconBookmark,
  IconChart3,
  IconChatBubble7,
  IconFileDownload,
  IconHeart,
  IconNote1,
  IconShareOs,
  IconThumbsDown,
  IconThumbsUp,
} from "@central-icons/outlined";

import { cn } from "~/lib/utils";

/** The prop surface every icon primitive accepts — Central's SVG-compatible API. */
export type IconProps = SVGProps<SVGSVGElement> & {
  ariaHidden?: boolean;
  ariaLabel?: string;
  size?: string | number;
};

/**
 * Wrap a raw Central glyph into a design-system icon: a single binding point with
 * `shrink-0` baked in (icons should never flex-shrink), and everything else
 * forwarded. Size and color stay contextual — set them at the call site or via a
 * parent `[&_svg]:size-*` rule, exactly as before.
 */
function icon(Glyph: ComponentType<IconProps>) {
  return function Icon({ className, ...props }: IconProps) {
    return <Glyph className={cn("shrink-0", className)} {...props} />;
  };
}

// ── Actions ──────────────────────────────────────────────────────────────────
export const AddIcon = icon(IconPlusMedium);
export const EditIcon = icon(IconEditSmall1);
export const DeleteIcon = icon(IconTrashCan);
export const SendIcon = icon(IconPaperPlane);
export const ExternalLinkIcon = icon(IconArrowUpRight);
export const LogoutIcon = icon(IconArrowRightSquare);
export const MoreIcon = icon(IconDotGrid1x3Horizontal);
/** Drag handle for reorderable rows (six-dot grip). */
export const DragHandleIcon = icon(IconDotGrid2x3);
export const SearchIcon = icon(IconMagnifyingGlass);
/** Disconnect a connected account — clears its tokens (broken-chain glyph). */
export const DisconnectIcon = icon(IconBrokenChainLink1);
/** Copy-to-clipboard affordance (the two-squares glyph). Pairs with
 * {@link CheckIcon} for the copied-confirmation swap. */
export const CopyIcon = icon(IconSquareBehindSquare1);
/** The funnel — adding/representing a filter. */
export const FilterIcon = icon(IconFilter2);
/** The up/down grabber that toggles a menu/panel open. */
export const ExpandIcon = icon(IconChevronGrabberVertical);
export const ChevronLeftIcon = icon(IconChevronLeftMedium);

// ── Status / feedback ────────────────────────────────────────────────────────
export const SuccessIcon = icon(IconCircleCheck);
/** Filled success, for emphasis/active completion states. */
export const SuccessSolidIcon = icon(IconCircleCheckFilled);
export const CheckIcon = icon(IconCheckmark1Medium);
export const WarningIcon = icon(IconExclamationTriangle);
/** The ONE app-wide info icon — info alerts, education callouts, inline hints. */
export const InfoIcon = icon(IconInfoSimple);
/** Lightbulb — the "hint" glyph (a tip / idea), paired with the `hint`
 * (amber) colorspace. */
export const HintIcon = icon(IconLightBulbSimple);
/** Circled "i" — the secondary info glyph, for standalone use on a flat surface
 * (e.g. a "More info" affordance) where the bare `i` reads poorly. */
export const InfoCircleIcon = icon(IconCircleInfo);
export const HelpIcon = icon(IconCircleQuestionmarkFilled);

// ── Post lifecycle status ─────────────────────────────────────────────────────
// The `social_post_status` states, surfaced as icon-only (+ tooltip) in the posts
// grid. `processing` reuses {@link LoadingIcon}; `posted`/`processed` reuse
// {@link SuccessIcon}/{@link SuccessSolidIcon}.
/** A post saved but not yet scheduled/published. */
export const DraftIcon = icon(IconDraft);
/** A post scheduled to publish at a future time (calendar + clock). */
export const ScheduleIcon = icon(IconCalendarClock);

// ── Content / media ───────────────────────────────────────────────────────────
/** A post that carries media (image/video) — the posts grid's caption indicator. */
export const MediaIcon = icon(IconImages2);
/** A video attachment (a video-camera glyph) — distinguishes video media from images. */
export const VideoIcon = icon(IconVideo);
/** A bare play glyph — the centered "this is a video" affordance on a media thumbnail. */
export const PlayIcon = icon(IconPlay);
/** A text-only post (no media) — the posts grid's caption indicator. */
export const TextIcon = icon(IconText1);

// ── Navigation / feature areas ───────────────────────────────────────────────
export const HomeIcon = icon(IconHomeLine);
export const PostsIcon = icon(IconPostcard2);
/** Connected social accounts (the "@" mark), distinct from the user account. */
export const SocialAccountsIcon = icon(IconAt);
export const ApiKeysIcon = icon(IconKey2);
export const WebhooksIcon = icon(IconWebhooks);
export const PlaygroundIcon = icon(IconSandbox);
export const SettingsIcon = icon(IconSettingsGear1);
export const BillingIcon = icon(IconCreditCard1);
export const NotificationsIcon = icon(IconBell2);
export const DocsIcon = icon(IconBook);
export const DiscordIcon = icon(IconDiscord);
export const DebugIcon = icon(IconBolt);
export const AccountIcon = icon(IconUser);
export const ProjectIcon = icon(IconFolder1);
/** Filled project folder, for the active/selected project. */
export const ProjectActiveIcon = icon(IconFolderFilled);

// ── Theme / appearance ───────────────────────────────────────────────────────
/** Light theme option (the theme-switcher submenu). */
export const ThemeLightIcon = icon(IconSun);
/** Dark theme option (the theme-switcher submenu). */
export const ThemeDarkIcon = icon(IconMoon);
/** Follow-OS theme option (the theme-switcher submenu). */
export const ThemeSystemIcon = icon(IconDevices);

// ── Domain / segmentation ────────────────────────────────────────────────────
export const IntegrationIcon = icon(IconPlugin1);
export const DeveloperIcon = icon(IconCode);
export const MarketingIcon = icon(IconMegaphone);
export const AiAgentIcon = icon(IconCuteRobot);

// ── Multi-intent glyphs (named closer to the shape on purpose) ────────────────
/** Used for "getting started" and the Quickstart project type. */
export const RocketIcon = icon(IconRocket);
/** Used for tags and the White Label project type. */
export const TagIcon = icon(IconTag);

// ── Structural / form primitives ──────────────────────────────────────────────
// Used inside `app/ui` components (dialog/sheet close, dropdown/carousel chevrons,
// OTP separator, choicebox tick, sidebar toggle, spinner). They live here too so
// shadcn-sourced components — once added, they are LOCAL, not a library — obey the
// same boundary as the rest of the app.
export const CloseIcon = icon(IconCrossMedium);
export const ChevronRightIcon = icon(IconChevronRightMedium);
export const MinusIcon = icon(IconMinusMedium);
/** Small selection tick (e.g. choicebox), distinct from the medium {@link CheckIcon}. */
export const CheckSmallIcon = icon(IconCheckmark1Small);
export const SidebarToggleIcon = icon(IconSidebarSimpleLeftSquare);
/** The loading glyph — pass `animate-spin` at the call site to spin it. */
export const LoadingIcon = icon(IconLoadingCircle);
export const EyeIcon = icon(IconEyeOpen);
export const EyeOffIcon = icon(IconEyeSlash);

// ── Data grid / table structural ──────────────────────────────────────────────
// Bound for the vendored ReUI data grid + filters (app/components). Directional
// arrows and chevrons named close to their shape (multi-intent), the rest semantic.
export const ChevronDownIcon = icon(IconChevronDownMedium);
export const ChevronUpIcon = icon(IconChevronTopMedium);
export const ArrowUpIcon = icon(IconArrowUp);
export const ArrowDownIcon = icon(IconArrowDown);
export const ArrowLeftIcon = icon(IconArrowLeft);
export const ArrowRightIcon = icon(IconArrowRight);
/** Subdirectory / nested arrow (↳) — marks a child detail attached under a row. */
export const CornerDownRightIcon = icon(IconArrowCornerDownRight);
/** Global scope — a config value applied to every account (the post's base). */
export const GlobeIcon = icon(IconGlobe);
/** A two-way exchange (←→) — a request/response round-trip in the result logs. */
export const ExchangeIcon = icon(IconArrowLeftRight);
/** Move/pin a column to the left edge (arrow-to-wall). */
export const ArrowToLineLeftIcon = icon(IconArrowWallLeft);
/** Move/pin a column to the right edge (arrow-to-wall). */
export const ArrowToLineRightIcon = icon(IconArrowWallRight);
/** Column-settings / adjust toggle (horizontal sliders). */
export const SlidersIcon = icon(IconSettingsSliderHor);
/** Unpin a pinned column/row. */
export const UnpinIcon = icon(IconUnpin);
/** Circle-plus affordance — add a facet/value (data grid column filter). */
export const CirclePlusIcon = icon(IconCirclePlus);
/** Circle-exclamation — inline validation error (filters). */
export const AlertCircleIcon = icon(IconExclamationCircle);

// ── Social-platform chrome glyphs ─────────────────────────────────────────────
// Literal glyphs the installed `social-post-preview` uses to mimic each network's
// post UI. Bound here to satisfy the icon boundary; not part of the app's own
// action vocabulary. Outlined variants read as the resting (un-engaged) state the
// mock previews show.
/** Like affordance (feed / reel action rows). */
export const HeartIcon = icon(IconHeart);
/** Comment / reply affordance. */
export const CommentIcon = icon(IconChatBubble7);
/** Repost / retweet affordance. */
export const RepostIcon = icon(IconArrowsRepeat);
/** Save-to-collection affordance (IG bookmark). */
export const BookmarkIcon = icon(IconBookmark);
/** Share affordance (OS share sheet glyph — also stands in for X's share). */
export const ShareIcon = icon(IconShareOs);
/** Forward / send-in-DM affordance (Messenger-style). */
export const ForwardIcon = icon(IconArrowShareRight);
/** Upvote (YouTube / LinkedIn / Facebook like). */
export const ThumbUpIcon = icon(IconThumbsUp);
/** Downvote (YouTube dislike). */
export const ThumbDownIcon = icon(IconThumbsDown);
/** Audio-track chip (TikTok / Reels "original audio"). */
export const MusicIcon = icon(IconNote1);
/** Verified account badge (blue check). */
export const VerifiedIcon = icon(IconCircleCheck);
/** View / analytics count (X post metrics). */
export const ChartIcon = icon(IconChart3);
/** Download affordance (YouTube watch actions). */
export const DownloadIcon = icon(IconFileDownload);

// ── Product brand marks ───────────────────────────────────────────────────────
// The Post for Me logo + wordmark (NOT Central glyphs). SOCIAL platform marks
// live in the registry brand-mark component — the app dog-foods our own registry
// for those (`import { InstagramIcon } from "~/ui/brand-mark"`), so they are NOT
// re-exported here.
export * from "./post-for-me-icon";
export * from "./post-for-me-wordmark";
