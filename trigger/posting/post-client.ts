 
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import * as fsp from "fs/promises";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BlueskyConfiguration,
  FacebookConfiguration,
  InstagramConfiguration,
  LinkedinConfiguration,
  PinterestConfiguration,
  PlatformAppCredentials,
  PostMedia,
  PostResult,
  RefreshTokenResult,
  SocialAccount,
  ThreadsConfiguration,
  TiktokConfiguration,
  TwitterConfiguration,
  YoutubeConfiguration,
} from "./post.types";

export class PostClient {
  constructor(
    _supabaseClient: SupabaseClient,
    _appCredentials: PlatformAppCredentials,
  ) {}

  //##ABSTRACT METHODS##
  async refreshAccessToken(
    account: SocialAccount
  ): Promise<RefreshTokenResult> {
    //Implement at platform level
    console.log(account);
    return {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.access_token_expires_at!.toISOString(),
    };
  }

  /**
   *
   * @param {*} account : {id: string, platform: string, platform_user_id: string, platform_username: string, access_token: string, refresh_token: string, expires_at: string}
   * @param {*} caption : string
   * @param {*} media : {id: string, bucket: string, key: string, type: 'image' | 'video'}[]
   * @param {*} platformConfig
   * @returns
   */
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
    platformConfig:
      | PinterestConfiguration
      | InstagramConfiguration
      | TiktokConfiguration
      | TwitterConfiguration
      | YoutubeConfiguration
      | FacebookConfiguration
      | LinkedinConfiguration
      | BlueskyConfiguration
      | ThreadsConfiguration;
  }): Promise<PostResult> {
    //Implement at platform level
    console.log(postId, account, caption, media, platformConfig);
    return {
      post_id: postId,
      provider_connection_id: account.id,
      success: false,
    };
  }

  //##HELPER METHODS##
  /**
   *
   * @param {*} medium : {id: string, bucket: string, key: string, type: 'image' | 'video'}
   * @returns File
   */
  async getFile(medium: PostMedia) {
    try {
      const response = await fetch(medium.url);
      const data = await response.blob();

      if (!data) {
        throw new Error("Failed to get file");
      }

      const filename = medium.url.split("/").pop() ?? "file";

      return new File([data], filename, {
        type: data.type,
      });
    } catch (error) {
      console.error("Error getting file from supa:", error);
      throw error;
    }
  }

  /**
   *
   * @param {*} media : {id: string, bucket: string, key: string, type: 'image' | 'video'}
   * @returns string
   */
  async getSignedUrlForFile(medium: PostMedia) {
    try {
      return medium.url;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error("Failed to generate signed URL for file");
    }
  }

  protected async downloadToTempFile(
    url: string,
    opts?: {
      prefix?: string;
      filename?: string;
    },
  ): Promise<{ filePath: string; mimeType: string; size: number }> {
    const res = await fetch(url);
    if (!res.ok || !res.body) {
      throw new Error(
        `Failed to download media: ${res.status} ${res.statusText}`,
      );
    }

    const mimeType =
      res.headers.get("content-type") || "application/octet-stream";

    const urlName = new URL(url).pathname.split("/").pop() || "file";
    const rawName = opts?.filename || urlName;
    const safeName = rawName
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .slice(0, 120);

    const prefix = (opts?.prefix || "pfm")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .slice(0, 40);

    const filePath = path.join(
      os.tmpdir(),
      `${prefix}_${Date.now()}_${randomUUID()}_${safeName}`,
    );

    const body: any = res.body;
    const inputStream =
      typeof body?.getReader === "function" ? Readable.fromWeb(body) : body;

    await pipeline(inputStream, createWriteStream(filePath));
    const stat = await fsp.stat(filePath);
    return { filePath, mimeType, size: stat.size };
  }

  protected async unlinkQuiet(filePath: string): Promise<void> {
    await fsp.unlink(filePath).catch(() => undefined);
  }

  // Meta Graph API OAuthException (code 190) subcodes that mean the
  // session/token is permanently dead and will never succeed on retry:
  // 460 = password changed, 463 = expired, 467 = invalid, 458/490 = deauthorized
  private static readonly TERMINAL_AUTH_ERROR_SUBCODES = new Set([
    458, 460, 463, 467, 490,
  ]);

  private static readonly TERMINAL_AUTH_ERROR_KEYWORDS = [
    "session has been invalidated",
    "sessions for the user are not allowed because the user is not a confirmed user",
    "user access is restricted",
    "error validating access token",
  ];

  protected getErrorMessage(error: any): string {
    return (
      error?.response?.data?.error?.message ||
      error?.message ||
      "Unknown error"
    );
  }

  protected isTerminalAuthError(error: any): boolean {
    const graphError = error?.response?.data?.error;
    const code = graphError?.code;
    const subcode = graphError?.error_subcode;
    const message = this.getErrorMessage(error).toLowerCase();

    const hasTerminalSubcode =
      code === 190 &&
      subcode !== undefined &&
      PostClient.TERMINAL_AUTH_ERROR_SUBCODES.has(subcode);

    const hasTerminalKeyword = PostClient.TERMINAL_AUTH_ERROR_KEYWORDS.some(
      (kw) => message.includes(kw),
    );

    return hasTerminalSubcode || hasTerminalKeyword;
  }

  protected buildAuthErrorMessage(error: any): string {
    return `Account needs to be reconnected: ${this.getErrorMessage(error)}`;
  }
}
