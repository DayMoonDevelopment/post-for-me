import { task } from "@trigger.dev/sdk";
import type { PostMedia } from "./posting/post.types";
import { TimestampedArray } from "./posting/timestamped-array";

type LinkedInMediaPayload = {
  medium: Pick<PostMedia, "url" | "type">;
  authorUrn: string;
  accessToken: string;
  apiVersion: string;
};

type LinkedInMediaUploadResult = {
  requests: Record<string, unknown>[];
  responses: Record<string, unknown>[];
} & (
  | { success: true; urn: string }
  | { success: false; message: string; error: { name: string; message: string; stack?: string } }
);

// https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api
// "The file size can't exceed 100MB and 300 pages."
const LINKEDIN_MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

class LinkedInMediaUploader {
  requests = new TimestampedArray();
  responses = new TimestampedArray();

  async upload(payload: LinkedInMediaPayload): Promise<string> {
    return payload.medium.type === "document"
      ? this.#createDocumentMedia(payload)
      : this.#createMedia(payload);
  }

  // Safely parse empty or non-JSON LinkedIn error bodies.
  async #parseJsonSafe(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

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

  async #createDocumentMedia({
    medium,
    authorUrn,
    accessToken,
    apiVersion,
  }: LinkedInMediaPayload): Promise<string> {
    this.requests.push({
      initializeUploadRequest: { owner: authorUrn },
    });

    // The download is independent of initializeUpload; keep both concurrent.
    const [initializeResponse, fileRes] = await Promise.all([
      fetch("https://api.linkedin.com/rest/documents?action=initializeUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Linkedin-Version": apiVersion,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          initializeUploadRequest: { owner: authorUrn },
        }),
      }),
      fetch(medium.url),
    ]);

    const initializeData = await this.#parseJsonSafe(initializeResponse);
    this.responses.push({ initializeDocumentUploadResponse: initializeData });

    const uploadUrl = initializeData?.value?.uploadUrl;
    const documentUrn = initializeData?.value?.document;

    if (!initializeResponse.ok || !uploadUrl || !documentUrn) {
      // Release the concurrent download when initialization fails.
      await fileRes.body?.cancel().catch(() => undefined);
      throw new Error(
        `Failed to initialize LinkedIn document upload: ${initializeResponse.status} ${initializeResponse.statusText}`,
      );
    }

    if (!fileRes.ok || !fileRes.body) {
      await fileRes.body?.cancel().catch(() => undefined);
      throw new Error(
        `Failed to download document for upload: ${fileRes.status} ${fileRes.statusText}`,
      );
    }

    // Check headers before reading the body, without an extra round trip.
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
      accessToken,
      contentType,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload document: ${uploadResponse.status} ${uploadResponse.statusText}`,
      );
    }

    this.responses.push({ uploadDocumentResponse: uploadResponse.status });
    return documentUrn;
  }

  async #createMedia({
    medium,
    authorUrn,
    accessToken,
  }: LinkedInMediaPayload): Promise<string> {
    const isVideo = medium.type === "video";

    this.requests.push({
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
    const registerResponse = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
    this.responses.push({ registerResponse: registerData });

    if (!registerResponse.ok || !registerData.value) {
      throw new Error(
        `Failed to register LinkedIn media upload: ${registerResponse.status} ${JSON.stringify(registerData)}`,
      );
    }

    const uploadUrl =
      registerData.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const asset = registerData.value.asset;

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
      accessToken,
      contentType,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload media: ${uploadResponse.status} ${uploadResponse.statusText}`,
      );
    }

    this.responses.push({ uploadResponse: uploadResponse.status });
    return asset;
  }
}

export const uploadLinkedInMedia = task({
  id: "upload-linkedin-media",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async (payload: LinkedInMediaPayload, { ctx }): Promise<LinkedInMediaUploadResult> => {
    const uploader = new LinkedInMediaUploader();
    try {
      const urn = await uploader.upload(payload);
      return { success: true, urn, requests: uploader.requests, responses: uploader.responses };
    } catch (error) {
      if (ctx.attempt.number < 2) throw error;
      const message = error instanceof Error ? error.message : String(error);
      // Return final diagnostics as output; thrown task errors lose API fields.
      return {
        success: false,
        message,
        error: {
          name: error instanceof Error ? error.name : "Error",
          message,
          stack: error instanceof Error ? error.stack : undefined,
        },
        requests: uploader.requests,
        responses: uploader.responses,
      };
    }
  },
});
