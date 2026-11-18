import { OutOfMemoryError, task } from "@trigger.dev/sdk";
import axios from "axios";
import { createReadStream } from "fs";
import { PostClient } from "./posting/post-client";

type TikTokVideoUploadPayload = {
  url: string;
  accessToken: string;
  postUrl: string;
  initBody: { post_info: Record<string, string | number | boolean | undefined> };
};

export class TikTokVideoUploader extends PostClient {
  #planVideoUploadChunks(size: number): {
    chunkSize: number;
    totalChunkCount: number;
  } {
    if (size <= 0) {
      throw new Error(`Invalid TikTok video size: ${size}`);
    }

    const minChunkSize = 5 * 1024 * 1024;
    const maxChunkSize = 64 * 1024 * 1024;
    if (size < minChunkSize) {
      return { chunkSize: size, totalChunkCount: 1 };
    }
    if (size <= maxChunkSize) {
      return { chunkSize: size, totalChunkCount: 1 };
    }

    // TikTok counts full chunks; the final chunk includes any remainder.
    const minChunkCount = Math.ceil(size / maxChunkSize);
    if (minChunkCount > 1000) {
      throw new Error(
        `TikTok upload requires too many chunks (${minChunkCount}). Max is 1000.`,
      );
    }
    const chunkSize = Math.max(
      minChunkSize,
      Math.min(maxChunkSize, Math.floor(size / minChunkCount)),
    );
    const totalChunkCount = Math.floor(size / chunkSize);
    if (totalChunkCount < 2) {
      throw new Error(
        `TikTok upload requires multiple chunks for files over 64MB (size=${size}, chunk_size=${chunkSize}, total_chunk_count=${totalChunkCount})`,
      );
    }
    if (totalChunkCount > 1000) {
      throw new Error(
        `TikTok upload exceeds maximum chunk count (total_chunk_count=${totalChunkCount}). Max is 1000.`,
      );
    }
    return { chunkSize, totalChunkCount };
  }

  async upload({ url, accessToken, postUrl, initBody }: TikTokVideoUploadPayload) {
    const { filePath, mimeType, size } = await this.downloadToTempFile(url, {
      prefix: "tiktok",
    });
    try {
      const { chunkSize, totalChunkCount } = this.#planVideoUploadChunks(size);
      const payload = {
        ...initBody,
        source_info: {
          source: "FILE_UPLOAD",
          video_size: size,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      };
      this.requests.push({ publishIdRequest: { postUrl, payload } });
      const initResponse = await axios.post(postUrl, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      });
      this.responses.push({ publishIdResponse: initResponse.data });
      const { publish_id, upload_url } = initResponse.data.data;
      if (!upload_url) {
        throw new Error("TikTok did not return an upload_url for FILE_UPLOAD source");
      }
      await this.#uploadVideoFile({ filePath, uploadUrl: upload_url, mimeType, size });
      return publish_id as string;
    } finally {
      await this.unlinkQuiet(filePath);
    }
  }

  async #uploadVideoFile({ filePath, uploadUrl, mimeType, size }: {
    filePath: string;
    uploadUrl: string;
    mimeType: string;
    size: number;
  }): Promise<void> {
    if (size <= 0) {
      throw new Error(
        `Cannot upload video to TikTok: downloaded file is empty (${size} bytes)`,
      );
    }
    const baseMimeType = mimeType.split(";")[0].trim().toLowerCase();
    const contentType = ["video/mp4", "video/quicktime", "video/webm"].includes(baseMimeType)
      ? baseMimeType : "video/mp4";
    const { chunkSize, totalChunkCount } = this.#planVideoUploadChunks(size);
    for (let chunkIndex = 0; chunkIndex < totalChunkCount; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const isLastChunk = chunkIndex === totalChunkCount - 1;
      const end = isLastChunk ? size - 1 : start + chunkSize - 1;
      const contentRange = `bytes ${start}-${end}/${size}`;
      this.requests.push({
        videoUploadRequest: { chunkIndex, totalChunkCount, contentRange },
      });
      const stream = createReadStream(filePath, { start, end });
      try {
        const uploadResponse = await axios.put(uploadUrl, stream, {
          headers: {
            "Content-Type": contentType,
            "Content-Length": end - start + 1,
            "Content-Range": contentRange,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
        this.responses.push({
          videoUploadResponse: { chunkIndex, status: uploadResponse.status },
        });
      } finally {
        stream.destroy();
      }
    }
  }

  diagnostics() {
    return { requests: [...this.requests], responses: [...this.responses] };
  }
}

export const uploadTikTokVideo = task({
  id: "upload-tiktok-video",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async (payload: TikTokVideoUploadPayload) => {
    const uploader = new TikTokVideoUploader({ app_id: "", app_secret: "" });
    try {
      const publishId = await uploader.upload(payload);
      return { success: true as const, publishId, ...uploader.diagnostics() };
    } catch (error) {
      // Replaying init/upload after an ordinary error can publish a duplicate.
      if (error instanceof OutOfMemoryError) throw error;
      // Preserve API diagnostics without serializing Axios's circular request object.
      return {
        success: false as const,
        ...uploader.diagnostics(),
        error: {
          message: error.message,
          response: error.response ? {
            data: error.response.data,
            status: error.response.status,
            headers: error.response.headers,
          } : undefined,
          request: error.request ? {
            method: error.request.method,
            path: error.request.path,
            headers: error.request.headers,
          } : undefined,
        },
      };
    }
  },
});
