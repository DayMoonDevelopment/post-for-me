import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { tasks, wait } from "@trigger.dev/sdk";
import axios from "axios";
import { TikTokPostClient } from "./tiktok-post-client";
import { TikTokBusinessPostClient } from "./tiktok_business-post-client";
import type { SocialAccount } from "../post.types";

afterEach(() => {
  mock.restore();
});

for (const failure of ["task failure", "rejection"]) {
  test(`TikTok video ${failure} stops before polling or parent media access`, async () => {
    const client = new TikTokPostClient({ app_id: "app", app_secret: "secret" });
    const fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("Parent media access"));
    const post = spyOn(axios, "post").mockResolvedValue({ data: { data: { creator_username: "tester" } } });
    const put = spyOn(axios, "put").mockRejectedValue(new Error("Parent upload"));
    const dispatch = spyOn(tasks, "triggerAndWait");
    for (const spy of [fetchSpy, post, put, dispatch]) spy.mockClear();
    if (failure === "task failure") dispatch.mockResolvedValue({ ok: false, error: { message: "worker unavailable" } } as any);
    else dispatch.mockRejectedValue(new Error("dispatch rejected"));
    const result = await client.post({
      postId: "post", account: { id: "account", access_token: "token" } as SocialAccount,
      caption: "caption", media: [{ id: "media", type: "video", url: "https://example.com/video" }], platformConfig: {},
    });
    expect(result.success).toBe(false);
    expect(result.error_message).toBe("Failed to post to TikTok");
    expect(result.details.error.message).toBe(failure === "task failure" ? "Failed to upload TikTok video" : "dispatch rejected");
    expect(dispatch).toHaveBeenCalledWith("upload-tiktok-video", expect.objectContaining({ url: "https://example.com/video", accessToken: "token" }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
}

for (const Client of [TikTokPostClient, TikTokBusinessPostClient]) {
  describe(Client.name, () => {
    for (const isDraft of [false, true]) {
      for (const status of [
        "PROCESSING",
        "PROCESSING_DOWNLOAD",
        "PROCESSING_UPLOAD",
        "PUBLISH_COMPLETE",
        "PUBLISH_SUCCESS",
        "SEND_TO_USER_INBOX",
        "FAILED",
        "UNKNOWN",
      ]) {
        test(`${isDraft ? "draft" : "direct post"} with status ${status}`, async () => {
          const client = new Client({
            app_id: "app-id",
            app_secret: "app-secret",
          });
          spyOn(client, "getSignedUrlForFile").mockResolvedValue(
            "https://example.com/image.jpg",
          );
          const waitFor = spyOn(wait, "for").mockResolvedValue(undefined);
          waitFor.mockClear();
          let statusChecks = 0;
          const response = async (url: string) => {
            if (url.includes("/status/")) {
              statusChecks++;
              return {
                data: JSON.stringify({
                  code: 0,
                  data: {
                    status,
                    fail_reason: "invalid_media",
                    reason: "invalid_media",
                    publicaly_available_post_id: ["public-id"],
                    post_ids: ["public-id"],
                  },
                }),
              };
            }
            return {
              data: {
                code: 0,
                data: {
                  creator_username: "tester",
                  username: "tester",
                  publish_id: "publish-id",
                  share_id: "publish-id",
                },
              },
            };
          };
          spyOn(axios, "get").mockImplementation(response as any);
          spyOn(axios, "post").mockImplementation(response as any);

          const result = await client.post({
            postId: "post-id",
            account: {
              id: "account-id",
              access_token: "token",
              social_provider_user_id: "user-id",
            } as SocialAccount,
            caption: "caption",
            media: [{
              id: "media-id",
              url: "https://example.com/image.jpg",
              type: "image",
              skip_processing: true,
            }],
            platformConfig: { is_draft: isDraft },
          });

          const isProcessing = status.startsWith("PROCESSING");
          expect(result.success).toBe(
            !isProcessing && status !== "FAILED" && status !== "UNKNOWN" &&
              (isDraft || status !== "SEND_TO_USER_INBOX"),
          );
          if (isProcessing) {
            expect(statusChecks).toBe(15);
            expect(waitFor).toHaveBeenCalledTimes(14);
            expect(result.error_message).toContain("still processing");
            expect(result.error_message).toContain("Check with TikTok");
            expect(result.details.status).toBe("Processing");
            expect(result.details.publish_id).toBe("publish-id");
          } else if (!result.success) {
            expect(result.error_message).toContain(status);
            expect(result.details.status).toBe(status);
            expect(result.details.fail_reason).toBe("invalid_media");
          }
        });
      }
    }
  });
}
