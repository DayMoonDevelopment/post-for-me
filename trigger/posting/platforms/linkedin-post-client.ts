import { SupabaseClient } from "@supabase/supabase-js";
import { PostClient } from "../post-client";
import {
  LinkedinConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";

// https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api
// "The file size can't exceed 100MB and 300 pages."
const LINKEDIN_MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

export class LinkedInPostClient extends PostClient {
  supportedMediaTypes = ["image", "video", "document"];

  #clientId: string;
  #clientSecret: string;
  #maxImages = 20;
  #apiVersion = process.env.LINKEDIN_API_VERSION || "202601";
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

      this.#requests.push({ postRequest: postBody });
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

      this.#responses.push({ postResponse: result });
      return {
        success: true,
        provider_connection_id: account.id,
        post_id: postId,
        provider_post_id: providerPostId,
        provider_post_url: providerPostId
          ? `https://www.linkedin.com/feed/update/${providerPostId}`
          : undefined,
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

  // Safely parses a LinkedIn response body as JSON without throwing on a
  // non-JSON (e.g. plain-text or empty) error body, so callers can still
  // inspect `response.ok`/status and raise their own descriptive error.
  async #parseJsonSafe(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  // Shared by #createDocumentMedia and #createMedia: streams a downloaded
  // file's body to a LinkedIn upload URL without buffering it into memory.
  async #streamUploadFile({
    uploadUrl,
    method,
    fileRes,
    accessToken,
    contentType,
  }: {
    uploadUrl: string;
    method: "PUT" | "POST";
    fileRes: Response;
    accessToken: string;
    contentType: string;
  }): Promise<Response> {
    const contentLength = fileRes.headers.get("content-length");

    return fetch(uploadUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
      body: fileRes.body,
      // Required by Node/undici fetch for streaming request bodies.
      duplex: "half",
    });
  }

  // LinkedIn document (PDF) posts have no representation in the legacy
  // /v2/ugcPosts share model, so they're published through LinkedIn's
  // versioned Documents + Posts API instead, independent of the legacy
  // image/video/article flow below.
  async #createDocumentMedia({
    medium,
    authorUrn,
    account,
  }: {
    medium: PostMedia;
    authorUrn: string;
    account: SocialAccount;
  }): Promise<string> {
    this.#requests.push({
      initializeDocumentUploadRequest: { owner: authorUrn },
    });

    // The file download doesn't depend on the initializeUpload result, so
    // run them concurrently rather than paying both round trips serially.
    const [initializeResponse, fileRes] = await Promise.all([
      fetch("https://api.linkedin.com/rest/documents?action=initializeUpload", {
        method: "POST",
        headers: this.#versionedHeaders(account.access_token),
        body: JSON.stringify({
          initializeUploadRequest: { owner: authorUrn },
        }),
      }),
      fetch(medium.url),
    ]);

    const initializeData = await this.#parseJsonSafe(initializeResponse);
    this.#responses.push({ initializeDocumentUploadResponse: initializeData });

    const uploadUrl = initializeData?.value?.uploadUrl;
    const documentUrn = initializeData?.value?.document;

    if (!initializeResponse.ok || !uploadUrl || !documentUrn) {
      // The download raced initializeUpload and may have already resolved;
      // release it rather than leaving the connection/socket open.
      await fileRes.body?.cancel().catch(() => undefined);
      throw new Error(
        `Failed to initialize LinkedIn document upload: ${initializeResponse.status} ${initializeResponse.statusText}`,
      );
    }

    if (!fileRes.ok || !fileRes.body) {
      throw new Error(
        `Failed to download document for upload: ${fileRes.status} ${fileRes.statusText}`,
      );
    }

    // LinkedIn's Documents API rejects files over 100MB. `fileRes` already
    // has headers (fetch resolves once headers arrive, before the body is
    // read), so this check needs no extra round trip.
    const contentLength = fileRes.headers.get("content-length");
    if (contentLength && Number(contentLength) > LINKEDIN_MAX_DOCUMENT_BYTES) {
      await fileRes.body.cancel().catch(() => undefined);
      throw new Error(
        `Document exceeds LinkedIn's 100MB upload limit (${contentLength} bytes)`,
      );
    }

    const contentType = fileRes.headers.get("content-type") || "application/pdf";

    const uploadResponse = await this.#streamUploadFile({
      uploadUrl,
      method: "PUT",
      fileRes,
      accessToken: account.access_token,
      contentType,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload document: ${uploadResponse.status} ${uploadResponse.statusText}`,
      );
    }

    this.#responses.push({ uploadDocumentResponse: uploadResponse.status });

    return documentUrn;
  }

  async #postDocument({
    postId,
    account,
    caption,
    medium,
    authorUrn,
  }: {
    postId: string;
    account: SocialAccount;
    caption: string;
    medium: PostMedia;
    authorUrn: string;
  }): Promise<PostResult> {
    const documentUrn = await this.#createDocumentMedia({
      medium,
      authorUrn,
      account,
    });

    // LinkedIn's Posts API rejects a blank `commentary` (INVALID_VALUE_BLANK_FIELD),
    // so a document posted with no caption needs a non-empty fallback.
    const trimmedCaption = caption?.trim();
    const documentTitle = trimmedCaption
      ? trimmedCaption.slice(0, 200)
      : "Document";

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

    this.#requests.push({ postRequest: postBody });

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
    this.#responses.push({ postResponse: { status: response.status } });

    return {
      success: true,
      provider_connection_id: account.id,
      post_id: postId,
      provider_post_id: providerPostId,
      provider_post_url: providerPostId
        ? `https://www.linkedin.com/feed/update/${providerPostId}`
        : undefined,
      details: {
        requests: this.#requests,
        responses: this.#responses,
      },
    };
  }

  async #createMedia({
    medium,
    caption,
    authorUrn,
    account,
  }: {
    medium: PostMedia;
    caption: string;
    authorUrn: string;
    account: SocialAccount;
  }): Promise<any> {
    const isVideo = medium.type === "video";

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

    // Step 2: Stream upload the video/image (avoid buffering into memory)
    const fileRes = await fetch(medium.url);
    if (!fileRes.ok || !fileRes.body) {
      throw new Error(
        `Failed to download media for upload: ${fileRes.status} ${fileRes.statusText}`,
      );
    }

    const contentType =
      fileRes.headers.get("content-type") ||
      (isVideo ? "video/mp4" : "image/jpeg");

    const uploadResponse = await this.#streamUploadFile({
      uploadUrl,
      method: "POST",
      fileRes,
      accessToken: account.access_token,
      contentType,
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
          uploadedMedia.push(
            await this.#createMedia({
              medium,
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
