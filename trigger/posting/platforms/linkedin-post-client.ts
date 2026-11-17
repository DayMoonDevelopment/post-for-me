import { tasks } from "@trigger.dev/sdk";
import type { uploadLinkedInMedia } from "../../upload-linkedin-media";
import { PostClient } from "../post-client";
import {
  LinkedinConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";

export class LinkedInPostClient extends PostClient {
  supportedMediaTypes = ["image", "video", "document"];

  #clientId: string;
  #clientSecret: string;
  #maxImages = 20;
  #apiVersion = process.env.LINKEDIN_API_VERSION || "202601";

  constructor(appCredentials: PlatformAppCredentials) {
    super(appCredentials);
    this.#clientId = appCredentials.app_id;
    this.#clientSecret = appCredentials.app_secret;
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<RefreshTokenResult> {
    const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
    this.requests.push({ refreshRequest: tokenUrl });
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refresh_token!,
        client_id: this.#clientId,
        client_secret: this.#clientSecret,
      }),
    });

    const data = await response.json();

    this.responses.push({ refreshResponse: data });

    if (!response.ok) {
      throw new Error(
        `Failed to refresh LinkedIn token: ${data.error_description}`,
      );
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() - 300);

    return {
      access_token: data.access_token,
      expires_at: newExpiresAt.toISOString(),
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
    platformConfig?: LinkedinConfiguration;
  }): Promise<PostResult> {
    try {
      const authorUrn =
        account.social_provider_metadata?.connection_type === "page"
          ? `urn:li:organization:${account.social_provider_user_id}`
          : `urn:li:person:${account.social_provider_user_id}`;

      if (!platformConfig?.reshare_post_id) {
        const documentMedium =
          media.length === 1 && media[0].type === "document"
            ? media[0]
            : null;

        if (!documentMedium && media.some((m) => m.type === "document")) {
          throw new Error(
            "LinkedIn document posts support exactly one PDF and no other media",
          );
        }

        if (documentMedium) {
          return await this.#postDocument({
            postId,
            account,
            caption,
            medium: documentMedium,
            authorUrn,
            title: platformConfig?.title,
          });
        }
      }

      const postBody: Record<string, any> = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: caption,
            },
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      if (platformConfig?.reshare_post_id) {
        postBody.responseContext = {
          parent: this.#toUgcPostUrn(platformConfig.reshare_post_id),
        };
        postBody.specificContent["com.linkedin.ugc.ShareContent"] = {
          ...postBody.specificContent["com.linkedin.ugc.ShareContent"],
          shareMediaCategory: "NONE",
          media: [],
          shareCategorization: {},
        };
      } else {
        const { uploadedMedia, mediaCategory } = await this.#processMedia({
          caption,
          media,
          authorUrn,
          account,
        });

        postBody.specificContent[
          "com.linkedin.ugc.ShareContent"
        ].shareMediaCategory = mediaCategory;

        if (uploadedMedia.length > 0) {
          postBody.specificContent["com.linkedin.ugc.ShareContent"].media =
            uploadedMedia;
        }
      }

      this.requests.push({ postRequest: postBody });
      const response = await fetch(`https://api.linkedin.com/v2/ugcPosts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postBody),
      });

      if (!response.ok) {
        throw new Error(
          `LinkedIn API error: ${response.status} ${response.statusText}`,
        );
      }

      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) : {};
      const providerPostId =
        result.id || response.headers.get("x-restli-id") || undefined;

      this.responses.push({ postResponse: result });
      return {
        success: true,
        provider_connection_id: account.id,
        post_id: postId,
        provider_post_id: providerPostId,
        provider_post_url: providerPostId
          ? `https://www.linkedin.com/feed/update/${providerPostId}`
          : undefined,
        details: {
          requests: this.requests,
          responses: this.responses,
        },
      };
    } catch (error) {
      console.error(
        `Failed to post to linked for account: ${account.id}`,
        error,
      );
      return {
        success: false,
        provider_connection_id: account.id,
        post_id: postId,
        error_message: `Failed to post to LinkedIn: ${error.message}`,
        details: {
          error: error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack, cause: error.cause }
            : error,
          requests: this.requests,
          responses: this.responses,
        },
      };
    }
  }

  #extractFirstUrl(text: string) {
    const urlRegex = /(https?:\/\/|www\.)[^\s]+/g;
    const matches = text.match(urlRegex);

    if (!matches) return null;

    let url = matches[0];
    if (url.startsWith("www.")) {
      url = "https://" + url;
    }

    return url;
  }

  #toUgcPostUrn(ugcPostId: string) {
    return ugcPostId.startsWith("urn:")
      ? ugcPostId
      : `urn:li:ugcPost:${ugcPostId}`;
  }

  #versionedHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": this.#apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  async #uploadMedia({
    medium,
    authorUrn,
    account,
  }: {
    medium: PostMedia;
    authorUrn: string;
    account: SocialAccount;
  }): Promise<string> {
    const result = await tasks.triggerAndWait<typeof uploadLinkedInMedia>(
      "upload-linkedin-media",
      {
        medium: { url: medium.url, type: medium.type },
        authorUrn,
        accessToken: account.access_token,
        apiVersion: this.#apiVersion,
      },
    );
    if (!result.ok) {
      const error = result.error;
      const message = error && typeof error === "object" && "message" in error
        && typeof error.message === "string" ? error.message : "Child task failed";
      throw new Error(
        `Failed to upload LinkedIn media: ${message}`,
        { cause: error },
      );
    }
    this.requests.push(...result.output.requests);
    this.responses.push(...result.output.responses);
    if (!result.output.success) {
      throw new Error(result.output.message, { cause: result.output.error });
    }
    return result.output.urn;
  }

  async #postDocument({
    postId,
    account,
    caption,
    medium,
    authorUrn,
    title,
  }: {
    postId: string;
    account: SocialAccount;
    caption: string;
    medium: PostMedia;
    authorUrn: string;
    title?: string;
  }): Promise<PostResult> {
    const documentUrn = await this.#uploadMedia({
      medium,
      authorUrn,
      account,
    });

    // LinkedIn's Posts API rejects a blank `commentary` (INVALID_VALUE_BLANK_FIELD),
    // so a document posted with no caption needs a non-empty fallback.
    const trimmedCaption = caption?.trim();
    const documentTitle = (title?.trim() || trimmedCaption || "Document").slice(
      0,
      200,
    );

    const postBody = {
      author: authorUrn,
      commentary: trimmedCaption || documentTitle,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          id: documentUrn,
          // Without an explicit title, LinkedIn falls back to the storage
          // filename (an opaque UUID) as the document card's display name.
          title: documentTitle,
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    this.requests.push({ postRequest: postBody });

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: this.#versionedHeaders(account.access_token),
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      throw new Error(
        `LinkedIn API error: ${response.status} ${response.statusText}`,
      );
    }

    const providerPostId = response.headers.get("x-restli-id") || undefined;
    this.responses.push({ postResponse: { status: response.status } });

    return {
      success: true,
      provider_connection_id: account.id,
      post_id: postId,
      provider_post_id: providerPostId,
      provider_post_url: providerPostId
        ? `https://www.linkedin.com/feed/update/${providerPostId}`
        : undefined,
      details: {
        requests: this.requests,
        responses: this.responses,
      },
    };
  }

  async #processMedia({
    caption,
    media,
    authorUrn,
    account,
  }: {
    caption: string;
    media: PostMedia[];
    authorUrn: string;
    account: SocialAccount;
  }): Promise<any> {
    const uploadedMedia = [];
    let mediaCategory = "NONE";
    switch (true) {
      case media.length === 0: {
        const firstUrl = this.#extractFirstUrl(caption);
        if (firstUrl) {
          uploadedMedia.push({
            status: "READY",
            originalUrl: firstUrl,
          });
          mediaCategory = "ARTICLE";
        }
        break;
      }
      case media.length > 0: {
        const allowedMedia = media.slice(0, this.#maxImages);

        mediaCategory = "IMAGE";
        for (let i = 0; i < allowedMedia.length; i++) {
          const medium = allowedMedia[i];
          this.requests.push({ processMedia: medium });
          uploadedMedia.push(
            {
              status: "READY",
              description: { text: caption.substring(0, 200) },
              media: await this.#uploadMedia({ medium, authorUrn, account }),
            },
          );

          if (i === 0 && medium.type === "video") {
            mediaCategory = "VIDEO";
            break;
          }
        }
        break;
      }
    }

    return { uploadedMedia, mediaCategory };
  }
}
