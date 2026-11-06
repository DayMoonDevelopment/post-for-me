import { task } from "@trigger.dev/sdk";
import { google } from "googleapis";

export const uploadYoutubeThumbnail = task({
  id: "upload-youtube-thumbnail",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ thumbnailUrl, videoId, source, oauth }: {
    thumbnailUrl: string;
    videoId: string;
    source: { thumbnailUrl?: string; thumbnailTimestampMs?: number };
    oauth: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      credentials: Parameters<InstanceType<typeof google.auth.OAuth2>["setCredentials"]>[0];
    };
  }, { ctx }) => {
    const oauth2Client = new google.auth.OAuth2(
      oauth.clientId, oauth.clientSecret, oauth.redirectUri,
    );
    oauth2Client.setCredentials(oauth.credentials);
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const res = await fetch(thumbnailUrl);
    if (!res.ok) {
      let bodyText = "";
      try {
        const text = await res.text();
        bodyText = text ? text.slice(0, 4000) : "";
      } catch { /* Preserve the original download error if reading fails. */ }
      throw new Error(
        `Failed to download thumbnail: ${res.status} ${res.statusText}. ${bodyText}`,
      );
    }
    const imageBuffer = Buffer.from(await res.arrayBuffer());
    const rawContentType = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = source.thumbnailTimestampMs != null
      ? "image/jpeg"
      : rawContentType.split(";")[0].trim() || "image/jpeg";
    const request = {
      thumbnailUploadRequest: {
        videoId, ...source, mimeType, sizeBytes: imageBuffer.length,
      },
    };
    try {
      const thumbnailResponse = await youtube.thumbnails.set({
        videoId,
        media: { body: imageBuffer, mimeType },
      });
      console.log("Thumbnail uploaded successfully for video:", videoId);
      return { request, response: { thumbnailResponse: thumbnailResponse.data } };
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      if (ctx.attempt.number < 2) throw error;
      // Return the final API failure so the parent retains its nonfatal diagnostics.
      return {
        request,
        response: {
          thumbnailError: {
            videoId, ...source,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      };
    }
  },
});
