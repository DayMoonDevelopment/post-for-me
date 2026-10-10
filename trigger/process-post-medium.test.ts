import { describe, expect, test } from "bun:test";
import {
  detectContentTypeFromBytes,
  getFileExtension,
  getMediaType,
  isSupportedMediaContentType,
} from "./process-post-medium";

describe("getMediaType", () => {
  test("returns 'image' for known image content types", () => {
    expect(getMediaType("image/jpeg", "")).toBe("image");
    expect(getMediaType("image/png", "")).toBe("image");
  });

  test("returns 'video' for known video content types", () => {
    expect(getMediaType("video/mp4", "")).toBe("video");
    expect(getMediaType("video/quicktime", "")).toBe("video");
  });

  test("returns 'document' for application/pdf content type", () => {
    expect(getMediaType("application/pdf", "")).toBe("document");
  });

  test("returns 'document' for a .pdf extension when content type is unknown", () => {
    expect(getMediaType("application/octet-stream", ".pdf")).toBe("document");
  });

  test("still falls back to 'image' extensions when content type is unknown", () => {
    expect(getMediaType("application/octet-stream", ".png")).toBe("image");
  });

  test("defaults to 'image' when nothing matches", () => {
    expect(getMediaType("application/octet-stream", ".xyz")).toBe("image");
  });
});

describe("detectContentTypeFromBytes", () => {
  test("detects PDF from the %PDF magic bytes", () => {
    const bytes = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0x00, 0x00,
    ]);
    expect(detectContentTypeFromBytes(bytes)).toBe("application/pdf");
  });

  test("still detects PNG from its magic bytes", () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(detectContentTypeFromBytes(bytes)).toBe("image/png");
  });

  test("still detects MP4 from its magic bytes", () => {
    const bytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
    ]);
    expect(detectContentTypeFromBytes(bytes)).toBe("video/mp4");
  });

  test("returns null for unrecognized bytes", () => {
    const bytes = new Uint8Array(12).fill(0xff);
    expect(detectContentTypeFromBytes(bytes)).toBe(null);
  });
});

describe("getFileExtension", () => {
  test("maps application/pdf to .pdf", () => {
    expect(getFileExtension("application/pdf")).toBe(".pdf");
  });

  test("maps known image/video types to their extensions", () => {
    expect(getFileExtension("image/jpeg")).toBe(".jpg");
    expect(getFileExtension("video/mp4")).toBe(".mp4");
  });

  test("returns empty string for unknown or missing content type", () => {
    expect(getFileExtension("application/octet-stream")).toBe("");
    expect(getFileExtension(undefined)).toBe("");
  });
});

describe("isSupportedMediaContentType", () => {
  test("accepts image and video content types with parameters, like PDF", () => {
    expect(isSupportedMediaContentType("image/jpeg; charset=binary")).toBe(
      true,
    );
    expect(isSupportedMediaContentType("video/mp4; codecs=avc1")).toBe(true);
  });

  test("accepts application/pdf with parameters, consistent with image/video", () => {
    expect(isSupportedMediaContentType("application/pdf; charset=binary")).toBe(
      true,
    );
    expect(isSupportedMediaContentType("application/pdf")).toBe(true);
  });

  test("rejects unrelated content types", () => {
    expect(isSupportedMediaContentType("text/html")).toBe(false);
    expect(isSupportedMediaContentType("application/json")).toBe(false);
  });
});
