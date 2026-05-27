import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@trigger.dev/sdk/v3";
import { PostClient } from "../post-client";
import {
  GoogleMyBusinessConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";

export class GoogleMyBusinessPostClient extends PostClient {
  // ── platform constants ──────────────────────────────────────────────
  readonly #CHAR_LIMIT = 1500;
  readonly #MAX_IMAGES = 1; // GMB local posts support one media item

  // ── state ────────────────────────────────────────────────────────────
  #requests: any[] = [];
  #responses: any[] = [];

  // ── credentials ──────────────────────────────────────────────────────
  #clientId: string;
  #clientSecret: string;

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials,
  ) {
    super(supabaseClient, appCredentials);
    this.#clientId = appCredentials.app_id;
    this.#clientSecret = appCredentials.app_secret;
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<RefreshTokenResult> {
    const url = "https://oauth2.googleapis.com/token";

    this.#requests.push({ refreshRequest: { url } });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refresh_token!,
        client_id: this.#clientId,
        client_secret: this.#clientSecret,
      }),
    });

    const data = await res.json();
    this.#responses.push({ refreshResponse: data });

    if (!res.ok) {
      throw new Error(
        `Failed to refresh Google token: ${data.error_description ?? data.error}`,
      );
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? account.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
  }

  async post({
    postId,
    account,
    caption,
    media,
    platformConfig,
  }: {
    postId: string;
    account: SocialAccount;
    caption: string;
    media: PostMedia[];
    platformConfig: GoogleMyBusinessConfiguration;
  }): Promise<PostResult> {
    this.#requests = [];
    this.#responses = [];

    try {
      logger.log("Starting Google My Business post", {
        postId,
        accountId: account.id,
      });

      // The location resource name is stored in social_provider_user_id
      // e.g. "accounts/123456789/locations/987654321"
      const locationName = account.social_provider_user_id;

      const sanitizedSummary = this.#sanitizeSummary(
        platformConfig?.caption ?? caption,
      );

      const topicType = platformConfig?.topic_type ?? "STANDARD";

      const postBody: Record<string, any> = {
        languageCode: platformConfig?.language_code ?? "en",
        topicType,
      };

      // summary is required for STANDARD and EVENT posts; optional for OFFER
      if (sanitizedSummary) {
        postBody.summary = sanitizedSummary;
      }

      if (platformConfig?.call_to_action) {
        postBody.callToAction = {
          actionType: platformConfig.call_to_action.action_type,
          ...(platformConfig.call_to_action.url
            ? { url: platformConfig.call_to_action.url }
            : {}),
        };
      }

      if (topicType === "EVENT" || topicType === "OFFER") {
        postBody.event = this.#buildEvent(platformConfig?.event);
      }

      if (topicType === "OFFER" && platformConfig?.offer) {
        postBody.offer = {
          ...(platformConfig.offer.coupon_code
            ? { couponCode: platformConfig.offer.coupon_code }
            : {}),
          ...(platformConfig.offer.redeem_online_url
            ? { redeemOnlineUrl: platformConfig.offer.redeem_online_url }
            : {}),
          ...(platformConfig.offer.terms_conditions
            ? { termsConditions: platformConfig.offer.terms_conditions }
            : {}),
        };
      }

      const effectiveMedia = platformConfig?.media ?? media;
      if (effectiveMedia.length > 0) {
        postBody.media = await this.#processMedia(
          effectiveMedia.slice(0, this.#MAX_IMAGES),
        );
      }

      const postUrl = `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`;
      this.#requests.push({ postRequest: { url: postUrl, body: postBody } });

      const res = await fetch(postUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postBody),
      });

      const data = await res.json();
      this.#responses.push({ postResponse: data });

      if (!res.ok) {
        throw new Error(
          data.error?.message ?? `HTTP ${res.status} ${res.statusText}`,
        );
      }

      const providerPostId = data.name as string;
      const providerPostUrl = data.searchUrl as string | undefined;

      logger.log("Google My Business post published", {
        providerPostId,
        providerPostUrl,
      });

      return {
        success: true,
        post_id: postId,
        provider_connection_id: account.id,
        provider_post_id: providerPostId,
        provider_post_url: providerPostUrl,
        details: {
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    } catch (error: any) {
      console.error("Error posting to Google My Business:", error);

      return {
        success: false,
        post_id: postId,
        provider_connection_id: account.id,
        error_message: this.#humanError(error),
        details: {
          error: error?.message ?? error,
          requests: this.#requests,
          responses: this.#responses,
        },
      };
    }
  }

  async #processMedia(
    media: PostMedia[],
  ): Promise<{ mediaFormat: string; sourceUrl: string }[]> {
    logger.log("Attaching media to Google My Business post", {
      count: media.length,
    });

    const items: { mediaFormat: string; sourceUrl: string }[] = [];

    for (const medium of media) {
      const sourceUrl = await this.getSignedUrlForFile(medium);
      this.#requests.push({ mediaAttach: { mediaId: medium.id, sourceUrl } });

      const mediaFormat = medium.type === "video" ? "VIDEO" : "PHOTO";
      items.push({ mediaFormat, sourceUrl });

      this.#responses.push({
        mediaAttached: { mediaId: medium.id, mediaFormat },
      });
    }

    return items;
  }

  #buildEvent(
    event?: GoogleMyBusinessConfiguration["event"],
  ): Record<string, any> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const defaultStart = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
    const defaultEnd = {
      year: tomorrow.getFullYear(),
      month: tomorrow.getMonth() + 1,
      day: tomorrow.getDate(),
    };

    return {
      title: event?.title ?? "Event",
      schedule: {
        startDate: event?.schedule?.start_date ?? defaultStart,
        ...(event?.schedule?.start_time
          ? { startTime: event.schedule.start_time }
          : {}),
        endDate: event?.schedule?.end_date ?? defaultEnd,
        ...(event?.schedule?.end_time
          ? { endTime: event.schedule.end_time }
          : {}),
      },
    };
  }

  #sanitizeSummary(summary: string): string {
    return summary.trim().slice(0, this.#CHAR_LIMIT);
  }

  #humanError(error: any): string {
    const status = error?.response?.status ?? error?.status;
    const apiMsg =
      error?.response?.data?.error?.message ??
      error?.response?.data?.message ??
      error?.message;

    if (status === 401) {
      return "Your Google Business Profile account needs to be reconnected — the access token has expired.";
    }
    if (status === 403) {
      return "Permission denied by Google. Check that the account has access to manage this Business Profile location.";
    }
    if (status === 404) {
      return "The Google Business Profile location was not found. Ensure the location ID is correct and the account has access.";
    }
    if (apiMsg?.toLowerCase().includes("quota")) {
      return "Google Business Profile API quota exceeded. Please wait and try again.";
    }

    return `Failed to post to Google My Business: ${apiMsg ?? "unknown error"}. Check the details for more information.`;
  }
}
