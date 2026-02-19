/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { PostClient } from "../post-client";
import { BlobRef, AtpAgent, RichText, AppBskyVideoDefs } from "@atproto/api";
import sharp from "sharp";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
} from "../post.types";
import { Main } from "@atproto/api/dist/client/types/app/bsky/richtext/facet";
import ffmpeg from "fluent-ffmpeg";
import { createReadStream } from "fs";
import { logger, tasks } from "@trigger.dev/sdk/v3";

export class BlueskyPostClient extends PostClient {
  #agent: AtpAgent;
  #charLimit = 300;
  #maxImages = 4;
  #maxFileSize = 976.56 * 1024;
  #maxVideoFileSize = 100_000_000;
  #requests: any[] = [];
  #responses: any[] = [];

  constructor(
    supabaseClient: SupabaseClient,
    appCredentials: PlatformAppCredentials
  ) {
    super(supabaseClient, appCredentials);
    this.#agent = new AtpAgent({
      service: "https://bsky.social",
    });
  }

  async refreshAccessToken(
    account: SocialAccount
  ): Promise<RefreshTokenResult> {
    try {
      this.#requests.push({ refreshRequest: "Resuming Session" });
      await this.#agent.resumeSession({
        accessJwt: account.access_token,
        refreshJwt: account.refresh_token!,
        handle: account.social_provider_user_name!,
        did: account.social_provider_user_id,
        active: true,
      });

      this.#responses.push({ refreshResponse: "Resumed Session" });
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

      this.#responses.push({ refreshResponse: "New Session Created" });
      return {
        access_token: this.#agent.session?.accessJwt,
        refresh_token: this.#agent.session?.refreshJwt,
        expires_at: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 365
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

      this.#requests.push({ postRequest: postPayload });

      const response = await this.#agent.post(postPayload);

      this.#responses.push({ postResponse: response });
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
          requests: this.#requests,
          responses: this.#responses,
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
          requests: this.#requests,
          responses: this.#responses,
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

    const tmp = await this.downloadToTempFile(fileUrl, {
      prefix: "bluesky_video",
      filename: remoteName,
    });
    const inputPath = tmp.filePath;

    const metadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const videoStream = metadata.streams.find(
      (s: any) => s.codec_type === "video"
    );
    if (!videoStream) {
      throw new Error("No video stream found in file");
    }

    const { width, height } = videoStream;

    let uploadResponseData: unknown;
    try {
      const uploadUrl = new URL(
        "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo"
      );
      uploadUrl.searchParams.append("did", this.#agent.session!.did);
      uploadUrl.searchParams.append("name", remoteName);

      this.#requests.push({ uploadVideoRequest: uploadUrl });
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

    this.#responses.push({ uploadVideoResponse: uploadResponseData });

    const jobStatus = uploadResponseData as AppBskyVideoDefs.JobStatus;

    if (!jobStatus.jobId) {
      logger.error("Error starting video upload job", {
        error: uploadResponseData,
      });

      throw new Error(`Unable to start video upload, ${jobStatus.error}`);
    }

    let blob: BlobRef | undefined = jobStatus.blob;
    let jobFinished: boolean = false;
    const videoAgent = new AtpAgent({ service: "https://video.bsky.app" });

    while (!jobFinished) {
      const { data: status } = await videoAgent.app.bsky.video.getJobStatus({
        jobId: jobStatus.jobId,
      });
      console.log(
        "Status:",
        status.jobStatus.state,
        status.jobStatus.progress || ""
      );
      if (status.jobStatus.blob) {
        blob = status.jobStatus.blob;
        jobFinished = true;
      }

      if (
        jobStatus.state == "JOB_STATE_COMPLETED" ||
        jobStatus.state == "JOB_STATE_FAILED"
      ) {
        jobFinished = true;
      }

      if (!jobFinished) {
        // wait a second
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!blob) {
      throw new Error("Failed to process video");
    }

    return {
      video: blob,
      aspectRatio: {
        width,
        height,
      },
    };
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

      const file = await this.getFile(medium);

      const buffer = Buffer.from(await file.arrayBuffer());
      let sharpBuffer = await sharp(buffer).toBuffer();
      const metadata = await sharp(sharpBuffer).metadata();
      const { width, height } = metadata;
      // Resize image if needed
      if (buffer.length > this.#maxFileSize) {
        sharpBuffer = await sharp(sharpBuffer)
          .rotate() // Add this to automatically rotate based on EXIF data
          .resize(2000, 2000, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 80,
          })
          .toBuffer();

        console.log(`Resized to ${sharpBuffer.length} bytes`);

        // If still too large, reduce quality further
        if (sharpBuffer.length > this.#maxFileSize) {
          sharpBuffer = await sharp(sharpBuffer)
            .jpeg({
              quality: 60,
            })
            .toBuffer();
          console.log(`Further compressed to ${sharpBuffer.length} bytes`);
        }
      }

      const uploadResult = await this.#agent.uploadBlob(sharpBuffer, {
        encoding: "image/jpeg",
      });

      images.push({
        alt: caption || "Image",
        image: uploadResult.data.blob,
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
      // Fetch the webpage
      const response = await fetch(url);
      const html = await response.text();

      // Parse HTML using JSDOM
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Create the card object with required fields
      const card: {
        uri: string;
        title: string | null;
        description: string | null;
        thumb?: BlobRef;
      } = {
        uri: url,
        title: "",
        description: "",
      };

      // Extract metadata
      const titleTag = document.querySelector('meta[property="og:title"]');
      const descriptionTag = document.querySelector(
        'meta[property="og:description"]'
      );
      const imageTag = document.querySelector('meta[property="og:image"]');

      if (titleTag) {
        card.title = titleTag.getAttribute("content");
      } else {
        card.title = document.querySelector("title")?.textContent || "";
      }

      if (descriptionTag) {
        card.description = descriptionTag.getAttribute("content");
      } else {
        const metaDesc = document.querySelector('meta[name="description"]');
        card.description = metaDesc ? metaDesc.getAttribute("content") : "";
      }

      // Handle thumbnail image if present
      if (imageTag) {
        let imageUrl = imageTag.getAttribute("content") || "";

        // Handle relative URLs
        if (!imageUrl.startsWith("http")) {
          const urlObj = new URL(url);
          imageUrl = imageUrl.startsWith("/")
            ? `${urlObj.protocol}//${urlObj.host}${imageUrl}`
            : `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
        }

        // Fetch and upload the image
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();

        const { data: uploadData } = await this.#agent.uploadBlob(
          new Uint8Array(imageBuffer),
          {
            encoding: imageResponse.headers.get("content-type") || "image/jpeg",
          }
        );

        if (uploadData?.blob) {
          card.thumb = uploadData.blob;
        }
      }

      return {
        $type: "app.bsky.embed.external",
        external: card,
      };
    } catch (error) {
      console.error("Error creating embed card:", error);
      return null;
    }
  }
}
