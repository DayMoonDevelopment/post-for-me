/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { SupabaseClient } from "@supabase/supabase-js";
import { PostClient } from "../post-client";
import {
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";

export class LinkedInPostClient extends PostClient {
  #clientId: string;
  #clientSecret: string;
  #maxImages = 20;
  #requests: any[] = [];
  #responses: any[] = [];

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
    const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
    this.#requests.push({ refreshRequest: tokenUrl });
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

    this.#responses.push({ refreshResponse: data });

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
  }: {
    postId: string;
    account: SocialAccount;
    caption: string;
    media: PostMedia[];
  }): Promise<PostResult> {
    try {
      const authorUrn =
        account.social_provider_metadata?.connection_type === "page"
          ? `urn:li:company:${account.social_provider_user_id}`
          : `urn:li:person:${account.social_provider_user_id}`;

      const { uploadedMedia, mediaCategory } = await this.#processMedia({
        caption,
        media,
        authorUrn,
        account,
      });

      const postBody: Record<string, any> = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: caption,
            },
            shareMediaCategory: mediaCategory,
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      if (uploadedMedia.length > 0) {
        postBody.specificContent["com.linkedin.ugc.ShareContent"].media =
          uploadedMedia;
      }

      this.#requests.push({ postRequest: postBody });
      const response = await fetch(`https://api.linkedin.com/v2/ugcPosts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postBody),
      });

      if (!response.ok) {
        throw new Error(
          `LinkedIn API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      this.#responses.push({ postResponse: result });
      return {
        success: true,
        provider_connection_id: account.id,
        post_id: postId,
        provider_post_id: result.id,
        provider_post_url: `https://www.linkedin.com/feed/update/${result.id}`,
        details: {
          requests: this.#requests,
          responses: this.#responses,
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
          error,
          requests: this.#requests,
          responses: this.#responses,
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

  async #createMedia({
    file,
    caption,
    authorUrn,
    account,
  }: {
    file: File;
    caption: string;
    authorUrn: string;
    account: SocialAccount;
  }): Promise<any> {
    const isVideo = file.type.startsWith("video/");
    const buffer = Buffer.from(await file.arrayBuffer());

    this.#requests.push({
      registerRequest: {
        registerUploadRequest: {
          recipes: [
            isVideo
              ? "urn:li:digitalmediaRecipe:feedshare-video"
              : "urn:li:digitalmediaRecipe:feedshare-image",
          ],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      },
    });
    // Step 1: Register upload
    const registerResponse = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: [
              isVideo
                ? "urn:li:digitalmediaRecipe:feedshare-video"
                : "urn:li:digitalmediaRecipe:feedshare-image",
            ],
            owner: authorUrn,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      },
    );

    const registerData = await registerResponse.json();

    this.#responses.push({ registerResponse: registerData });

    const uploadUrl =
      registerData.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const asset = registerData.value.asset;

    // Step 2: Upload the video/image
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": file.type,
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload media: ${uploadResponse.status} ${uploadResponse.statusText}`,
      );
    }

    this.#responses.push({ uploadResponse: uploadResponse.status });

    const mediaObject: any = {
      status: "READY",
      description: {
        text: caption.substring(0, 200),
      },
      media: asset,
    };

    return mediaObject;
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
          this.#requests.push({ processMedia: medium });
          const file = await this.getFile(medium);
          uploadedMedia.push(
            await this.#createMedia({
              file,
              caption,
              authorUrn,
              account,
            }),
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
