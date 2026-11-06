import { task } from "@trigger.dev/sdk";
import FormData from "form-data";
import fetch from "node-fetch";

export const uploadFacebookThumbnail = task({
  id: "upload-facebook-thumbnail",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ thumbnailUrl, videoId, accessToken, baseUrl }: {
    thumbnailUrl: string;
    videoId: string;
    accessToken: string;
    baseUrl: string;
  }): Promise<void> => {
    let file: File;
    try {
      const response = await globalThis.fetch(thumbnailUrl);
      const data = await response.blob();
      if (!data) throw new Error("Failed to get file");
      const filename = thumbnailUrl.split("/").pop() ?? "file";
      file = new File([data], filename, { type: data.type });
    } catch (error) {
      console.error("Error downloading media file:", error);
      throw error;
    }

    const form = new FormData();
    form.append("access_token", accessToken);
    form.append("is_preferred", "true");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    form.append("source", buffer, {
      filename: file.name,
      contentType: file.type,
    });
    await fetch(`${baseUrl}/${videoId}/thumbnails`, {
      method: "POST",
      body: form,
      headers: { ...form.getHeaders() },
    });
  },
});
