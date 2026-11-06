import { PostClient } from "../post-client";
import { BlobRef, AtpAgent, RichText, AppBskyVideoDefs, jsonToLex } from "@atproto/api";
import type { uploadBlueskyImage, uploadBlueskyLinkPreview } from "../../upload-bluesky-media";
import type { transformBufferedImage } from "../../transform-buffered-image";
import type { probeVideoDimensions } from "../../video-child-tasks";
import { shouldSkipProcessing } from "../image-processing-utils";
import fetch from "node-fetch";
import {
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";
import { Main } from "@atproto/api/dist/client/types/app/bsky/richtext/facet";
import { createReadStream } from "fs";
import { logger, tasks, wait } from "@trigger.dev/sdk/v3";

export class BlueskyPostClient extends PostClient {
  #agent: AtpAgent;
  #charLimit = 300;
  #maxImages = 4;
  #maxVideoFileSize = 100_000_000;
  #videoStatusMaxAttempts = 30;
  #videoStatusInitialDelayMs = 5000;
  #videoStatusRetryBackoffMultiplier = 1.5;
  #maxRetryDelayMs = 60000;

  constructor(appCredentials: PlatformAppCredentials) {
    super(appCredentials);
    this.#agent = new AtpAgent({
      service: "https://bsky.social",
    });
  }

  async refreshAccessToken(
    account: SocialAccount,
  ): Promise<RefreshTokenResult> {
    try {
      this.requests.push({ refreshRequest: "Resuming Session" });
      await this.#agent.resumeSession({
        accessJwt: account.access_token,
        refreshJwt: account.refresh_token!,
        handle: account.social_provider_user_name!,
        did: account.social_provider_user_id,
        active: true,
      });

      this.responses.push({ refreshResponse: "Resumed Session" });
      return {
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: new Date(account.access_token_expires_at!).toISOString(),
      };
    } catch (error: any) {
      console.error("Failed to resume session", error);
      await this.#agent.login({
        identifier: account.social_provider_user_name!,
        password: account.social_provider_metadata.bluesky_app_password!,
      });

      this.responses.push({ refreshResponse: "New Session Created" });
      return {
        access_token: this.#agent.session?.accessJwt,
        refresh_token: this.#agent.session?.refreshJwt,
        expires_at: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 365,
        ).toISOString(),
      };
    }
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
      const trimmedCaption = caption.slice(0, this.#charLimit);

      // Create a new RichText instance with the caption
      const rt = new RichText({ text: trimmedCaption });
      await rt.detectFacets(this.#agent);

      let embed = null;

      switch (true) {
        case media.length == 1: {
          const medium = media[0];
          if (medium.type == "video") {
            const processVideo = await this.#processVideo({
              medium,
            });

            embed = {
              $type: "app.bsky.embed.video",
              ...processVideo,
            };

            break;
          }
          const processedMedia = await this.#processImages({
            caption: trimmedCaption,
            media,
          });
          if (processedMedia.length > 0) {
            embed = {
              $type: "app.bsky.embed.images",
              images: processedMedia,
            };
          }
          break;
        }
        case media.length > 1: {
          const processedMedia = await this.#processImages({
            caption: trimmedCaption,
            media,
          });
          if (processedMedia.length > 0) {
            embed = {
              $type: "app.bsky.embed.images",
              images: processedMedia,
            };
          }
          break;
        }
        default: {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const matches = [...trimmedCaption.matchAll(urlRegex)];

          if (matches.length > 0) {
            const embedUrl = matches[0][0].replace(/[.,;!?)]+$/, "");
            embed = await this.#fetchEmbedCard(embedUrl);
          }
          break;
        }
      }

      const postPayload: {
        text: string;
        facets: Main[] | undefined;
        embed?:
          | {
              $type: string;
              external: {
                uri: any;
                title: string | null;
                description: string | null;
                thumb?: BlobRef;
              };
            }
          | {
              $type: string;
              images: {
                alt: any;
                image: BlobRef;
                aspectRatio: {
                  width: number | undefined;
                  height: number | undefined;
                };
              }[];
            }
          | {
              $type: string;
              video: BlobRef;
              aspectRatio: {
                width: number | undefined;
                height: number | undefined;
              };
            };
      } = {
        text: rt.text,
        facets: rt.facets,
      };

      if (embed) {
        postPayload.embed = embed;
      }

      this.requests.push({ postRequest: postPayload });

      const response = await this.#agent.post(postPayload);

      this.responses.push({ postResponse: response });
      return {
        post_id: postId,
        provider_connection_id: account.id,
        success: true,
        provider_post_id: response.uri,
        provider_post_url: `https://bsky.app/profile/${
          account.social_provider_user_name
        }/post/${response.uri.split("/").pop()}`,
        details: {
          trimmed: caption.length > trimmedCaption.length,
          requests: this.requests,
          responses: this.responses,
        },
      };
    } catch (error) {
      console.error(error);
      return {
        post_id: postId,
        provider_connection_id: account.id,
        success: false,
        error_message: error.message,
        details: {
          error,
          requests: this.requests,
          responses: this.responses,
        },
      };
    }
  }

  async #processVideo({ medium }: { medium: PostMedia }): Promise<{
    video: BlobRef;
    aspectRatio: {
      width: number | undefined;
      height: number | undefined;
    };
  }> {
    const { data: serviceAuth } =
      await this.#agent.com.atproto.server.getServiceAuth({
        aud: `did:web:${this.#agent.dispatchUrl.host}`,
        lxm: "com.atproto.repo.uploadBlob",
        exp: Date.now() / 1000 + 60 * 30, // 30 minutes
      });

    const token = serviceAuth.token;

    const processedFile = await tasks.triggerAndWait("ffmpeg-compress-video", {
      url: medium.url,
      maxSizeBytes: this.#maxVideoFileSize,
    });

    let fileUrl = medium.url;
    if (processedFile.ok) {
      fileUrl = processedFile.output;
    }

    const remoteName =
      new URL(fileUrl).pathname.split("/").pop() || "video.mp4";

    const dimensions = await tasks.triggerAndWait<typeof probeVideoDimensions>(
      "probe-video-dimensions",
      { url: fileUrl },
    );
    if (!dimensions.ok) {
      throw new Error("Failed to probe Bluesky video dimensions", { cause: dimensions.error });
    }
    const { width, height } = dimensions.output;

    const tmp = await this.downloadToTempFile(fileUrl, {
      prefix: "bluesky_video",
      filename: remoteName,
    });
    const inputPath = tmp.filePath;

    let uploadResponseData: unknown;
    try {
      const uploadUrl = new URL(
        "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo",
      );
      uploadUrl.searchParams.append("did", this.#agent.session!.did);
      uploadUrl.searchParams.append("name", remoteName);

      this.requests.push({ uploadVideoRequest: uploadUrl });
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": tmp.mimeType || "video/mp4",
          "Content-Length": tmp.size.toString(),
        },
        body: createReadStream(inputPath) as any,
      });

      uploadResponseData = await uploadResponse.json();
    } finally {
      await this.unlinkQuiet(inputPath);
    }

    this.responses.push({ uploadVideoResponse: uploadResponseData });

    const jobStatus = uploadResponseData as AppBskyVideoDefs.JobStatus;

    if (!jobStatus.jobId) {
      logger.error("Error starting video upload job", {
        error: uploadResponseData,
      });

      throw new Error(`Unable to start video upload, ${jobStatus.error}`);
    }

    let blob: BlobRef | undefined = jobStatus.blob;
    let lastJobStatus: AppBskyVideoDefs.JobStatus = jobStatus;
    const videoAgent = new AtpAgent({ service: "https://video.bsky.app" });

    for (
      let attempt = 1;
      !blob && attempt <= this.#videoStatusMaxAttempts;
      attempt++
    ) {
      console.log(
        `Checking Bluesky video status, attempt ${attempt}/${this.#videoStatusMaxAttempts}`,
      );

      this.requests.push({
        videoStatusRequest: {
          jobId: jobStatus.jobId,
          attempt,
        },
      });

      const { data: status } = await videoAgent.app.bsky.video.getJobStatus({
        jobId: jobStatus.jobId,
      });

      lastJobStatus = status.jobStatus;

      this.responses.push({
        videoStatusResponse: status.jobStatus,
        attempt,
      });

      console.log(
        "Bluesky video status:",
        status.jobStatus.state,
        status.jobStatus.progress || "",
        status.jobStatus.error || "",
        status.jobStatus.message || "",
      );

      if (status.jobStatus.blob) {
        blob = status.jobStatus.blob;
        break;
      }

      if (status.jobStatus.state?.trim() === "JOB_STATE_FAILED") {
        const errorMessage = this.#getJobStatusErrorMessage(status.jobStatus);

        logger.error("Bluesky video processing job failed", {
          jobId: jobStatus.jobId,
          error: status.jobStatus.error,
          message: status.jobStatus.message,
          jobStatus: status.jobStatus,
        });

        throw new Error(`Failed to process video: ${errorMessage}`);
      }

      if (status.jobStatus.state?.trim() === "JOB_STATE_COMPLETED") {
        break;
      }

      if (attempt < this.#videoStatusMaxAttempts) {
        const delay = this.#getRetryDelayMs(attempt);
        console.log(
          `Bluesky video not ready. Waiting ${delay / 1000} seconds before retrying...`,
        );
        await wait.for({ seconds: delay / 1000 });
      }
    }

    if (!blob) {
      const errorMessage = this.#getJobStatusErrorMessage(lastJobStatus);

      logger.error("Bluesky video processing max attempts reached", {
        jobId: jobStatus.jobId,
        error: lastJobStatus.error,
        message: lastJobStatus.message,
        jobStatus: lastJobStatus,
      });

      throw new Error(
        `Max attempts reached. Failed to process video: ${errorMessage}. Last status: ${JSON.stringify(lastJobStatus)}`,
      );
    }

    return {
      video: blob,
      aspectRatio: {
        width,
        height,
      },
    };
  }

  #getRetryDelayMs(attempt: number): number {
    return Math.min(
      this.#videoStatusInitialDelayMs *
        Math.pow(this.#videoStatusRetryBackoffMultiplier, attempt - 1),
      this.#maxRetryDelayMs,
    );
  }

  #getJobStatusErrorMessage(jobStatus: AppBskyVideoDefs.JobStatus): string {
    const details = [jobStatus.error, jobStatus.message].filter(Boolean);

    if (details.length > 0) {
      return details.join(": ");
    }

    return JSON.stringify(jobStatus);
  }

  async #processImages({
    caption,
    media,
  }: {
    caption: string;
    media: PostMedia[];
  }): Promise<
    {
      alt: string;
      image: BlobRef;
      aspectRatio: {
        width: number | undefined;
        height: number | undefined;
      };
    }[]
  > {
    const images = [];
    const allowedMedia = media.slice(0, this.#maxImages);
    for (const medium of allowedMedia) {
      const isVideo = medium.type === "video";

      if (isVideo) {
        continue;
      }

      const result = await tasks.triggerAndWait<typeof transformBufferedImage>(
        "transform-buffered-image",
        { url: medium.url, platform: "bluesky", skipProcessing: shouldSkipProcessing(medium) },
      );
      if (!result.ok) {
        throw new Error("Failed to prepare Bluesky image", { cause: result.error });
      }
      const { width, height, mimeType: encoding, url } = result.output;
      const uploadResult = await tasks.triggerAndWait<typeof uploadBlueskyImage>(
        "upload-bluesky-image",
        { url, encoding, service: this.#agent.dispatchUrl.toString(), session: this.#agent.session! },
      );
      if (!uploadResult.ok) {
        const childError = uploadResult.error;
        const message = childError && typeof childError === "object" &&
          "message" in childError && typeof childError.message === "string" && childError.message
          ? childError.message
          : "Failed to upload Bluesky image";
        throw Object.assign(new Error(), {
          name: "Error", message, cause: childError,
        });
      }

      images.push({
        alt: medium.alt_text || caption || "Image",
        image: jsonToLex(uploadResult.output) as BlobRef,
        aspectRatio: {
          width,
          height,
        },
      });
    }

    return images;
  }

  async #fetchEmbedCard(url: string): Promise<{
    $type: string;
    external: {
      uri: string;
      title: string | null;
      description: string | null;
      thumb?: BlobRef;
    };
  } | null> {
    try {
      const result = await tasks.triggerAndWait<typeof uploadBlueskyLinkPreview>(
        "upload-bluesky-link-preview",
        { url, service: this.#agent.dispatchUrl.toString(), session: this.#agent.session! },
      );
      if (!result.ok) throw new Error("Failed to create Bluesky embed card", { cause: result.error });
      return jsonToLex(result.output) as typeof result.output;
    } catch (error) {
      console.error("Error creating embed card:", error);
      return null;
    }
  }
}
