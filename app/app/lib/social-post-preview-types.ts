import type { SocialAccount, SocialProvider } from "~/lib/post-for-me.types";
import type {
  SocialPost,
  SocialPostConfiguration,
} from "~/lib/social-post-configuration.types";

/**
 * The device frame a preview renders inside. Extensible on purpose — one style
 * (`phone`) ships now; more (browser, bare) drop in without a type rewrite.
 */
export type SocialPostPreviewDeviceKind = "phone";

/**
 * A rendering **surface** — a platform × placement that has its OWN chrome. This is
 * the atomic unit of the preview: Instagram feed / reel / story are three surfaces,
 * while X (media vs no-media) is one surface with a variant. Round one ships concrete
 * chrome for `feed` and `video`; `reel` / `story` resolve but fall back to a stub
 * until their chrome lands.
 */
export type SocialPostPreviewSurface =
  | "feed" // standard timeline post (X, IG/FB feed, LinkedIn, Threads, Bluesky, Pinterest)
  | "reel" // vertical full-bleed short-form reel (IG / FB)
  | "story" // vertical full-bleed ephemeral story (IG / FB)
  | "video"; // vertical full-bleed video (TikTok)

/**
 * A media attachment normalized for rendering. Post for Me media carries no image/video
 * field, so {@link resolveSocialPost} infers `kind` from the URL and resolves the best
 * display `src` (and a playable `videoSrc` when hosted).
 */
export interface SocialPostPreviewMedia {
  id: string;
  kind: "image" | "video";
  /** Best still to show — the image URL, or a video's poster / thumbnail (may be absent). */
  src?: string;
  /** A playable video URL, when `kind === "video"`. */
  videoSrc?: string;
}

/**
 * One frame's render instructions — a single targeted account's post as it appears on
 * its {@link SocialPostPreviewSurface}, with the config cascade already applied.
 * {@link resolveSocialPost} produces one per targeted account; a chrome consumes one.
 */
export interface SocialPostPreviewDescriptor {
  account: SocialPostPreviewFrameAccount;
  caption: string;
  device: SocialPostPreviewDeviceKind;
  /** Stable React key — the targeted account id. */
  id: string;
  media: SocialPostPreviewMedia[];
  /**
   * True when this frame is a placeholder rendered from a bare reference (an account id
   * string, so its platform is unknown). The identity is dummy-filled; a chrome renders a
   * neutral card. Pass the full account object to get a platform-accurate preview instead.
   */
  placeholder?: boolean;
  /** The platform, when known. Absent when the account was passed as a bare id string. */
  platform?: SocialProvider;
  /** An embedded quoted post (a quote repost), when the post quotes another. */
  quote?: SocialPostPreviewQuote;
  surface: SocialPostPreviewSurface;
}

/**
 * The account on a resolved frame — a full {@link SocialAccount}, or (for a placeholder
 * built from a bare id string) the same shape without a known `platform`.
 */
export type SocialPostPreviewFrameAccount = Omit<SocialAccount, "platform"> & {
  platform?: SocialProvider;
};

/** A quoted post embedded in a quote repost (e.g. X's `quote_tweet_id`). */
export interface SocialPostPreviewQuote {
  avatarUrl?: string;
  caption: string;
  displayName?: string;
  media: SocialPostPreviewMedia[];
  /**
   * True when the quote came in as a bare `quote_tweet_id` — no content to render, so a chrome
   * shows a skeleton (still tweet-shaped). Enrich by hand (the full object) to fill it in.
   */
  placeholder?: boolean;
  username: string;
}

/**
 * The render-relevant account fields — a full `SocialPost` account satisfies this.
 * `display_name` is an optional extra (PFM accounts carry only `username`): supply it and
 * the chrome shows a proper name over the handle; omit it and the handle stands in.
 */
export type SocialPostPreviewAccount = Pick<
  SocialPost["social_accounts"][number],
  "id" | "platform"
> & {
  display_name?: string | null;
  profile_photo_url?: string | null;
  /** Optional: an unenriched account may be just `{ id, platform }` — the chrome then skeletons
   *  the identity (avatar / name / handle) until you supply it. */
  username?: string | null;
};

/**
 * A targeted account, as the API models it: **the raw account id string**, or the full
 * account object for a platform-accurate preview. Passing the string renders a dummy-filled
 * placeholder frame — enough to see the post's caption/media — with the option to hand in
 * the object to upgrade to the real chrome.
 */
export type SocialPostPreviewAccountRef = string | SocialPostPreviewAccount;

/**
 * A quoted post (X quote repost). The API stores only the `quote_tweet_id` **string**, so
 * either pass that raw id (a placeholder quote card is rendered) or the full object below to
 * render the real quoted content.
 */
export type SocialPostPreviewQuoteRef =
  | string
  | {
      caption?: string;
      display_name?: string | null;
      media?: SocialPost["media"];
      profile_photo_url?: string | null;
      username: string;
    };

/**
 * The Post for Me social post a preview renders — the render-relevant slice of a post.
 * Works for **both** post shapes: a real, retrieved `SocialPost` is assignable as-is (its
 * `social_accounts` are full objects and it carries both configuration maps), AND a post
 * still being **authored** is too — the configuration fields use the create-body
 * {@link SocialPostConfiguration} shape, so the value a composer holds (or `socialPosts.create`
 * accepts) drops in without a cast. This is the opinionated input that makes
 * {@link SocialPostPreview} the model citizen for previewing a PFM post.
 */
/**
 * A post media item as the preview accepts it — the SDK `SocialPost` media (a public `url`,
 * optional `thumbnail_url`) plus two preview-only affordances: the `url` is optional (so a
 * not-yet-uploaded item can be file-only) and an optional local `file`. A real
 * `SocialPost.media[number]` is assignable as-is. The full matrix is supported: remote image,
 * remote video (± `thumbnail_url`), and a local `File`/`Blob` (image or video).
 */
export type SocialPostPreviewMediaInput = Omit<
  NonNullable<SocialPost["media"]>[number],
  "url"
> & {
  file?: Blob;
  url?: string;
};

export type SocialPostPreviewInput = Pick<SocialPost, "caption"> &
  SocialPostConfiguration & {
  /** The post media — remote URLs, local files, images, or videos (± thumbnail). */
  media?: readonly SocialPostPreviewMediaInput[] | null;
  /**
   * Preview-only: the quoted post to embed (a quote repost). Pass the raw `quote_tweet_id`
   * string (the API stores only that) for a placeholder quote card, or the full object to
   * render the real quoted content.
   */
  quoted_post?: SocialPostPreviewQuoteRef | null;
  /**
   * The targeted accounts. Mirrors the API, where a created post carries account **id
   * strings** — pass those for a placeholder, or full account objects (a real
   * `SocialPost.social_accounts` satisfies this) for a platform-accurate preview. The two
   * forms can be mixed in the same array.
   */
  social_accounts: readonly SocialPostPreviewAccountRef[];
};
