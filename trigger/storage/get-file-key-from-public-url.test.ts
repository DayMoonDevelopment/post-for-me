import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getFileKeyFromPublicUrl } from "./get-file-key-from-public-url";

describe("getFileKeyFromPublicUrl", () => {
  const originalR2PublicUrl = process.env.R2_PUBLIC_URL;

  beforeEach(() => {
    delete process.env.R2_PUBLIC_URL;
  });

  afterEach(() => {
    if (originalR2PublicUrl === undefined) {
      delete process.env.R2_PUBLIC_URL;
    } else {
      process.env.R2_PUBLIC_URL = originalR2PublicUrl;
    }
  });

  test("extracts the key from a Supabase public-object URL", () => {
    const url =
      "https://data.postforme.dev/storage/v1/object/public/post-media/projects/abc/video.mp4";

    expect(getFileKeyFromPublicUrl(url, "post-media")).toBe(
      "projects/abc/video.mp4",
    );
  });

  test("extracts the key from an R2 public URL", () => {
    process.env.R2_PUBLIC_URL = "https://media.example.com";
    const url = "https://media.example.com/post-media/projects/abc/video.mp4";

    expect(getFileKeyFromPublicUrl(url, "post-media")).toBe(
      "projects/abc/video.mp4",
    );
  });

  test("returns null for an R2 URL scoped to a different bucket", () => {
    process.env.R2_PUBLIC_URL = "https://media.example.com";
    const url = "https://media.example.com/other-bucket/projects/abc/video.mp4";

    expect(getFileKeyFromPublicUrl(url, "post-media")).toBeNull();
  });

  test("returns null when R2_PUBLIC_URL is unset and the URL isn't Supabase-shaped", () => {
    const url = "https://media.example.com/post-media/projects/abc/video.mp4";

    expect(getFileKeyFromPublicUrl(url, "post-media")).toBeNull();
  });

  test("returns null for an unrelated URL", () => {
    expect(
      getFileKeyFromPublicUrl("https://example.com/not-a-match", "post-media"),
    ).toBeNull();
  });
});
