import { task, tasks, wait } from "@trigger.dev/sdk";
import { readFile } from "fs/promises";
import { ApiResponseError, EUploadMimeType, TwitterApi, type TwitterApiTokens } from "twitter-api-v2";
import { PostClient } from "./posting/post-client";
import { shouldSkipProcessing } from "./posting/image-processing-utils";
import type { PostMedia, SocialAccount } from "./posting/post.types";
import type { transformLiveImageTask } from "./transform-live-image";

type TwitterMediaAuth = {
  appKey: string;
  appSecret: string;
  accessToken: string;
  refreshToken: SocialAccount["refresh_token"];
  isOAuth2: boolean;
};

type TwitterMediaUploadResult =
  | { success: true; mediaId: string }
  | {
      success: false;
      message: string;
      error: ReturnType<ApiResponseError["toJSON"]>
        | { name: string; message: string; stack?: string };
    };

export class TwitterMediaUploader extends PostClient {
  #uploadChunkSize = 5 * 1024 * 1024;

  async upload(medium: PostMedia, auth: TwitterMediaAuth): Promise<string> {
    const twitterClient = auth.isOAuth2
      ? new TwitterApi(auth.accessToken)
      : new TwitterApi({
          appKey: auth.appKey,
          appSecret: auth.appSecret,
          accessToken: auth.accessToken,
          accessSecret: auth.refreshToken,
        } as TwitterApiTokens);

    if (medium.type === "video") {
      const { filePath, mimeType } = await this.downloadToTempFile(
        medium.url,
        { prefix: "twitter" },
      );
      try {
        return await this.#uploadVideo({
          twitterClient,
          filePath,
          mimeType: medium.stored?.contentType || mimeType,
          isOAuth2: auth.isOAuth2,
        });
      } finally {
        await this.unlinkQuiet(filePath);
      }
    }

    return this.#uploadImage({ twitterClient, medium, isOAuth2: auth.isOAuth2 });
  }

  async #uploadVideo({
    twitterClient,
    filePath,
    mimeType,
    isOAuth2,
  }: {
    twitterClient: TwitterApi;
    filePath: string;
    mimeType: string;
    isOAuth2: boolean;
  }): Promise<string> {
    if (isOAuth2) {
      // The v2 client chunks, finalizes, and polls processing status
      // internally - the v1.1 endpoint used below doesn't support OAuth2.
      const buffer = await readFile(filePath);
      return await twitterClient.v2.uploadMedia(
        buffer,
        { media_type: this.#toUploadMimeType(mimeType) },
        this.#uploadChunkSize,
      );
    }

    const mediaId = await twitterClient.v1.uploadMedia(filePath, {
      mimeType,
      longVideo: true,
    });

    // Add delay and media status check
    let mediaInfo;
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      try {
        mediaInfo = await twitterClient.v1.mediaInfo(mediaId);

        if (mediaInfo.processing_info?.state === "succeeded") {
          break;
        } else if (mediaInfo.processing_info?.state === "failed") {
          throw new Error("Media processing failed");
        }

        console.log(
          `Media processing status: ${mediaInfo.processing_info?.state}`,
        );
        await wait.for({ seconds: 2 });
        attempts++;
      } catch (error) {
        console.error("Error checking media status:", error);
        throw error;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error("Media processing timeout");
    }

    return mediaId;
  }

  async #uploadImage({
    twitterClient,
    medium,
    isOAuth2,
  }: {
    twitterClient: TwitterApi;
    medium: PostMedia;
    isOAuth2: boolean;
  }): Promise<string> {
    let url = medium.url;
    let mimeType: string | undefined = medium.stored?.contentType;
    if (!shouldSkipProcessing(medium)) {
      const result = await tasks.triggerAndWait<typeof transformLiveImageTask>(
        "transform-live-image",
        { url, mediumId: medium.id, stored: medium.stored, platform: "twitter" },
      );
      if (!result.ok) {
        throw new Error("Failed to prepare Twitter image", { cause: result.error });
      }
      url = result.output.url;
      mimeType = result.output.mimeType;
    }
    const file = await this.getFile({ ...medium, url });
    const processedImage = Buffer.from(await file.arrayBuffer());
    mimeType ??= file.type;

    if (isOAuth2) {
      // The v1.1 endpoint used below doesn't support OAuth2.
      return await twitterClient.v2.uploadMedia(
        processedImage,
        { media_type: this.#toUploadMimeType(mimeType) },
        this.#uploadChunkSize,
      );
    }

    return await twitterClient.v1.uploadMedia(processedImage, {
      mimeType,
    });
  }

  #toUploadMimeType(mimeType: string): EUploadMimeType {
    if (!Object.values(EUploadMimeType).includes(mimeType as EUploadMimeType)) {
      throw new Error(`Unsupported media type for X: ${mimeType}`);
    }

    return mimeType as EUploadMimeType;
  }
}

export const uploadTwitterMedia = task({
  id: "upload-twitter-media",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ medium, auth }: {
    medium: PostMedia;
    auth: TwitterMediaAuth;
  }, { ctx }): Promise<TwitterMediaUploadResult> => {
    const uploader = new TwitterMediaUploader({
      app_id: auth.appKey,
      app_secret: auth.appSecret,
    });
    try {
      return { success: true, mediaId: await uploader.upload(medium, auth) };
    } catch (error) {
      if (ctx.attempt.number < 2) throw error;
      const message = error instanceof Error ? error.message : String(error);
      // Return final diagnostics as output; thrown task errors lose API fields.
      return {
        success: false,
        message,
        error: error instanceof ApiResponseError ? error.toJSON() : {
          name: error instanceof Error ? error.name : "Error",
          message,
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  },
});
