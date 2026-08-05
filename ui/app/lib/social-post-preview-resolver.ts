import type { SocialProvider } from "~/lib/post-for-me.types";
import { PLATFORM_LABELS } from "~/lib/post-for-me.utils";

import type {
  SocialPostPreviewDescriptor,
  SocialPostPreviewInput,
  SocialPostPreviewMedia,
  SocialPostPreviewQuote,
  SocialPostPreviewSurface,
} from "./social-post-preview-types";

/** Extensions we treat as video (Post for Me media has no image/video field). */
const VIDEO_EXTENSION = /\.(mp4|mov|webm|m4v|avi|mkv)(?:$|[?#])/i;

/** Meta placement value → surface (Instagram / Facebook / Threads share these). */
const META_PLACEMENT_SURFACE: Record<string, SocialPostPreviewSurface> = {
  reels: "reel",
  stories: "story",
  timeline: "feed",
};

/** One Post for Me media item — everything is loose (a local `file` may stand in for `url`). */
type MediaItem = { url?: string; thumbnail_url?: unknown; file?: unknown };

/**
 * The render-affecting slice of a configuration layer — a platform DTO or an account
 * override. Every layer can override `caption` and `media`; `placement` is a surface
 * hint (Instagram / Facebook / Threads). Read loosely because these come off the SDK's
 * union / kitchen-sink config types.
 */
type RenderConfig = {
  caption?: unknown;
  media?: readonly MediaItem[] | null;
  placement?: unknown;
};

/** A per-platform caption override is typed `unknown` on the SDK — coerce to a string. */
function coerceCaption(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Normalize one media item for rendering — handles the full matrix (remote URL / local file,
 * image / video, video ± thumbnail). `kind` comes from the file's MIME type when a local file
 * is given, else the URL extension. For a video, `src` is the poster (thumbnail) ONLY — never
 * the `.mp4` — and `videoSrc` is the playable URL; {@link SocialPostPreviewMediaItem} renders
 * the poster (or the video's own first frame when there's no thumbnail).
 */
function toPreviewMedia(item: MediaItem, index: number): SocialPostPreviewMedia {
  const file = item.file instanceof Blob ? item.file : undefined;
  const url = typeof item.url === "string" ? item.url : undefined;
  const thumbnail =
    typeof item.thumbnail_url === "string" ? item.thumbnail_url : undefined;
  const kind: SocialPostPreviewMedia["kind"] = file
    ? file.type.startsWith("video/")
      ? "video"
      : "image"
    : url && VIDEO_EXTENSION.test(url)
      ? "video"
      : "image";
  const id = url ?? `local-${index}`;
  if (kind === "video") {
    return { id, kind, src: thumbnail, videoSrc: url };
  }
  return { id, kind, src: url };
}

/**
 * Pick the rendering surface for a platform. Instagram / Facebook / Threads carry an
 * explicit `placement` (reels / stories / timeline); TikTok is always vertical video;
 * everyone else (and any platform without a placement) renders the standard feed post.
 * YouTube Short and TikTok photo inference are deferred.
 */
function resolveSurface(
  platform: SocialProvider,
  placement: unknown,
): SocialPostPreviewSurface {
  if (platform === "tiktok" || platform === "tiktok_business") return "video";
  if (typeof placement === "string" && placement in META_PLACEMENT_SURFACE) {
    return META_PLACEMENT_SURFACE[placement]!;
  }
  return "feed";
}

/**
 * Normalize a quote reference into a {@link SocialPostPreviewQuote}. A bare `quote_tweet_id`
 * string yields a **placeholder** quote — we have no content for it, so the chrome renders a
 * skeleton (still tweet-shaped). The full object maps straight through. Enrich by hand to fill
 * it in.
 */
function resolveQuote(
  quoted: SocialPostPreviewInput["quoted_post"],
): SocialPostPreviewQuote | undefined {
  if (!quoted) return undefined;
  if (typeof quoted === "string") {
    return { placeholder: true, username: "", caption: "", media: [] };
  }
  return {
    username: quoted.username,
    displayName: quoted.display_name ?? undefined,
    avatarUrl: quoted.profile_photo_url ?? undefined,
    caption: quoted.caption ?? "",
    media: (quoted.media ?? []).map(toPreviewMedia),
  };
}

/**
 * Build a placeholder frame for an account passed as a bare id string — the platform is
 * unknown, so a neutral chrome renders the post's caption/media with a **skeleton** identity
 * (no fabricated name/avatar). Any per-account override targeting this id still applies.
 */
function resolvePlaceholderFrame(
  id: string,
  post: SocialPostPreviewInput,
  accountConfigById: Map<string, RenderConfig>,
): SocialPostPreviewDescriptor {
  const accountConfig = accountConfigById.get(id);
  const caption =
    coerceCaption(accountConfig?.caption) ?? post.caption ?? "";
  const mediaSource = accountConfig?.media ?? post.media ?? [];
  return {
    id,
    account: { id, username: "" },
    surface: "feed",
    caption,
    media: mediaSource.map(toPreviewMedia),
    device: "phone",
    placeholder: true,
  };
}

/**
 * Turn a Post for Me social post into one {@link SocialPostPreviewDescriptor} per
 * targeted account, applying the **configuration cascade** exactly as the API does:
 * `post ▸ platform_configurations[platform] ▸ account_configurations[account]` (the
 * account override wins, then the platform config, then the post-level value). Caption
 * and media resolve through all three layers; the surface comes from the effective
 * placement. Pure and headless — {@link SocialPostPreview} and any manual
 * composition both build on it.
 */
export function resolveSocialPost(
  post: SocialPostPreviewInput,
): SocialPostPreviewDescriptor[] {
  // Index the per-account overrides by account id for O(1) lookup during the cascade.
  const accountConfigById = new Map<string, RenderConfig>();
  for (const entry of post.account_configurations ?? []) {
    accountConfigById.set(
      entry.social_account_id,
      entry.configuration as unknown as RenderConfig,
    );
  }

  // The embedded quoted post, if any — post-level, so shared by every frame.
  const quote = resolveQuote(post.quoted_post);

  return post.social_accounts.map((ref) => {
    // A bare id string → a dummy-filled placeholder frame (platform unknown).
    if (typeof ref === "string") {
      return resolvePlaceholderFrame(ref, post, accountConfigById);
    }

    const account = ref;
    const platform = account.platform as SocialProvider;
    const platformConfig = post.platform_configurations?.[platform] as
      | RenderConfig
      | undefined;
    const accountConfig = accountConfigById.get(account.id);

    // Cascade: account ▸ platform ▸ post (account override wins).
    const caption =
      coerceCaption(accountConfig?.caption) ??
      coerceCaption(platformConfig?.caption) ??
      post.caption ??
      "";
    const mediaSource =
      accountConfig?.media ?? platformConfig?.media ?? post.media ?? [];
    const placement = accountConfig?.placement ?? platformConfig?.placement;

    return {
      id: account.id,
      account: {
        id: account.id,
        platform,
        username: account.username ?? "",
        displayName: account.display_name ?? undefined,
        avatarUrl: account.profile_photo_url ?? undefined,
      },
      platform,
      surface: resolveSurface(platform, placement),
      caption,
      media: mediaSource.map(toPreviewMedia),
      device: "phone",
      quote,
    };
  });
}

/**
 * A **unique view** in the preview — a distinct configuration rendering the reader can
 * toggle to. The cascade collapses accounts that render the same way:
 *
 * - `platform` views: ONE per platform — the platform-default rendering (post ▸ platform),
 *   represented by its first non-overridden account (or its only account).
 * - `account` views: shown ONLY when a platform has MORE THAN ONE account — each
 *   overridden account beyond the platform default renders distinctly and gets its own
 *   chip. A single account per platform never splits (its platform view IS its rendering).
 *
 * So Instagram A + Instagram B (overridden) + TikTok C → platform views [Instagram, TikTok]
 * plus the account view [Instagram B]. But Instagram + TikTok + X, where X is the lone
 * (even overridden) X account → just [Instagram, TikTok, X], no account row.
 */
export interface SocialPostPreviewView {
  /** Stable key for selection (`platform:<id>`, `account:<id>`, or `placeholder:<id>`). */
  key: string;
  kind: "platform" | "account";
  /** The platform, when known — absent for a placeholder (bare-id) view. */
  platform?: SocialProvider;
  /** Chip label — the platform name for platform views, the handle for account views. */
  label: string;
  /** The descriptor to render when this view is selected. */
  descriptor: SocialPostPreviewDescriptor;
}

/** Resolve a post into its unique views — see {@link SocialPostPreviewView}. */
export function resolveSocialPostViews(
  post: SocialPostPreviewInput,
): SocialPostPreviewView[] {
  const descriptors = resolveSocialPost(post);
  const overriddenIds = new Set(
    (post.account_configurations ?? []).map((entry) => entry.social_account_id),
  );

  const platformViews: SocialPostPreviewView[] = [];
  const accountViews: SocialPostPreviewView[] = [];

  // Placeholder frames (bare-id accounts, platform unknown) — each is its own view.
  for (const descriptor of descriptors) {
    if (!descriptor.placeholder) continue;
    platformViews.push({
      key: `placeholder:${descriptor.id}`,
      kind: "platform",
      label: descriptor.account.username || descriptor.id,
      descriptor,
    });
  }

  // Group the real accounts by known platform, preserving first-seen order.
  const byPlatform = new Map<SocialProvider, SocialPostPreviewDescriptor[]>();
  for (const descriptor of descriptors) {
    if (descriptor.placeholder || !descriptor.platform) continue;
    const list = byPlatform.get(descriptor.platform) ?? [];
    list.push(descriptor);
    byPlatform.set(descriptor.platform, list);
  }

  for (const [platform, accounts] of byPlatform) {
    // The platform default rendering — the first account WITHOUT an override, or the
    // lone account when every account on the platform is overridden (a single account IS
    // the platform's rendering, override and all).
    const representative =
      accounts.find((account) => !overriddenIds.has(account.id)) ?? accounts[0]!;
    platformViews.push({
      key: `platform:${platform}`,
      kind: "platform",
      platform,
      label: PLATFORM_LABELS[platform],
      descriptor: representative,
    });

    // Split out account-level selection ONLY when a platform has more than one account.
    // A lone account never splits — its platform view already is its rendering. With
    // multiple, each overridden account (other than the representative) renders
    // distinctly and earns its own chip.
    if (accounts.length > 1) {
      for (const account of accounts) {
        if (account.id === representative.id || !overriddenIds.has(account.id)) {
          continue;
        }
        accountViews.push({
          key: `account:${account.id}`,
          kind: "account",
          platform,
          label: account.account.username || account.id,
          descriptor: account,
        });
      }
    }
  }

  return [...platformViews, ...accountViews];
}
