import { beforeAll, beforeEach, expect, mock, test } from "bun:test";
import type { LiveImageInput } from "./transform-live-image";

// Isolate the SDK mock from the task and platform tests.
if (!process.env.PFM_IMAGE_DISPATCH_TEST_CHILD) {
  test("image transform dispatch in an isolated process", async () => {
    const child = Bun.spawn([process.execPath, "test", __filename], {
      cwd: __dirname,
      env: { ...process.env, PFM_IMAGE_DISPATCH_TEST_CHILD: "1" },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, output: exitCode === 0 ? "" : stdout + stderr }).toEqual({ exitCode: 0, output: "" });
  });
} else {
  const outputUrl = "https://media.example/transformed";
  const child = mock(async (id: string, _payload: unknown): Promise<any> => ({
    ok: true,
    output: id === "transform-tiktok-image" ? outputUrl : {
      url: outputUrl, signedUrl: outputUrl, mimeType: "image/png", width: 600, height: 800,
    },
  }));
  mock.module("@trigger.dev/sdk", () => ({ tasks: { triggerAndWait: child } }));
  let dispatch: typeof import("./trigger-image-transform").triggerImageTransform;
  beforeAll(async () => { dispatch = (await import("./trigger-image-transform")).triggerImageTransform; });
  beforeEach(() => { child.mockClear(); process.env.ZENITH_MEDIA_PERCENTAGE = "0"; });

  const platforms: LiveImageInput["platform"][] = ["instagram", "tiktok", "tiktok_business", "twitter", "bluesky"];
  for (const platform of platforms) {
    for (const backend of ["trigger", "zenith"] as const) {
      for (const inherited of [false, true]) {
        test(`${platform}: ${backend}, inherited=${inherited}, dispatches exactly one task`, async () => {
          // An explicit parent's backend must win over the rollout percentage.
          process.env.ZENITH_MEDIA_PERCENTAGE = (backend === "zenith") !== inherited ? "100" : "0";
          const input: LiveImageInput = {
            platform, mediumId: "medium-id", url: "https://source.example/image",
            ...(inherited ? { mediaProcessingBackend: backend } : {}),
          };
          const result = await dispatch(input);
          expect(child).toHaveBeenCalledTimes(1);
          const [id, payload] = child.mock.calls[0];
          expect(id).toBe(backend === "zenith" ? "transform-live-image"
            : platform === "instagram" ? "transform-instagram-image"
            : platform === "tiktok" || platform === "tiktok_business" ? "transform-tiktok-image"
            : "transform-buffered-image");
          expect(payload).toMatchObject({ mediaProcessingBackend: backend });
          expect(result.ok).toBe(true);
          if (!result.ok) throw new Error("Expected success");
          expect(result.output).toMatchObject({ url: outputUrl, signedUrl: outputUrl });
          if (backend === "zenith") expect(payload).toEqual({ ...input, mediaProcessingBackend: backend });
          else if (platform === "instagram") expect(payload).toMatchObject({
            signedUrl: input.url,
            limits: { minAspectRatio: 0.75, maxAspectRatio: 1.91, storiesMinAspectRatio: 9 / 16, reelsMinAspectRatio: 9 / 16, maxFileSize: 8 * 1024 * 1024 },
          });
          else if (platform === "tiktok" || platform === "tiktok_business") expect(payload).toMatchObject({
            signedUrl: input.url, platform, maxFileSize: 20 * 1024 * 1024,
            allowedAspectRatios: [
              { ratio: 9 / 16, width: 1080, height: 1920 }, { ratio: 3 / 4, width: 1080, height: 1440 },
              { ratio: 1, width: 1080, height: 1080 }, { ratio: 16 / 9, width: 1920, height: 1080 },
            ],
          });
          else expect(payload).toMatchObject({ url: input.url, platform });
        });
      }
    }

    test(`${platform}: legacy skip-processing still uses the buffered task`, async () => {
      await dispatch({ url: "https://source.example/image", platform, skipProcessing: true });
      expect(child).toHaveBeenCalledTimes(1);
      expect(child).toHaveBeenCalledWith("transform-buffered-image", {
        url: "https://source.example/image", platform: platform === "twitter" ? "twitter" : "bluesky",
        skipProcessing: true, mediaProcessingBackend: "trigger",
      });
    });
  }

  test("preserves custom limits and first-image options", async () => {
    const instagramLimits = { minAspectRatio: 1, maxAspectRatio: 2, storiesMinAspectRatio: 0.5, reelsMinAspectRatio: 0.5, maxFileSize: 1024 };
    const options = { firstImage: { width: 600, height: 800 }, placement: "feed", is_feed: true };
    await dispatch({ url: "source", platform: "instagram", instagramLimits, options });
    expect(child.mock.calls[0][1]).toMatchObject({ limits: instagramLimits, options });
    const tiktokLimits = { maxFileSize: 2048, allowedAspectRatios: [{ ratio: 1, width: 500, height: 500 }] };
    await dispatch({ url: "source", platform: "tiktok_business", tiktokLimits });
    expect(child.mock.calls[1][1]).toMatchObject(tiktokLimits);
  });

  for (const platform of platforms) {
    test(`${platform}: failed tasks are returned without retry or fallback`, async () => {
      const failure = { ok: false as const, id: "run-id", taskIdentifier: "transform-live-image" as const, error: { message: "transform failed" } };
      child.mockResolvedValueOnce(failure);
      expect(await dispatch({ url: "source", platform })).toBe(failure);
      expect(child).toHaveBeenCalledTimes(1);
    });
  }

  test("dispatch rejection propagates without fallback", async () => {
    child.mockRejectedValueOnce(new Error("dispatch failed"));
    await expect(dispatch({ url: "source", platform: "instagram" })).rejects.toThrow("dispatch failed");
    expect(child).toHaveBeenCalledTimes(1);
  });
}
