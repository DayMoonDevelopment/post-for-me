import { describe, expect, test } from "bun:test";
import { mimeTypeToExtension } from "./media-extension";

describe("mimeTypeToExtension", () => {
  test("maps known image types", () => {
    expect(mimeTypeToExtension("image/jpeg")).toBe(".jpg");
    expect(mimeTypeToExtension("image/png")).toBe(".png");
    expect(mimeTypeToExtension("image/gif")).toBe(".gif");
    expect(mimeTypeToExtension("image/webp")).toBe(".webp");
    expect(mimeTypeToExtension("image/svg+xml")).toBe(".svg");
    expect(mimeTypeToExtension("image/avif")).toBe(".avif");
  });

  test("maps known video types, including quicktime to .mov", () => {
    expect(mimeTypeToExtension("video/mp4")).toBe(".mp4");
    expect(mimeTypeToExtension("video/webm")).toBe(".webm");
    expect(mimeTypeToExtension("video/mov")).toBe(".mov");
    expect(mimeTypeToExtension("video/quicktime")).toBe(".mov");
    expect(mimeTypeToExtension("video/avi")).toBe(".avi");
  });

  test("maps application/pdf", () => {
    expect(mimeTypeToExtension("application/pdf")).toBe(".pdf");
  });

  test("strips parameters and normalizes case", () => {
    expect(mimeTypeToExtension("Image/JPEG; charset=binary")).toBe(".jpg");
    expect(mimeTypeToExtension("VIDEO/MP4")).toBe(".mp4");
  });

  test("derives an extension for unmapped image/video subtypes instead of dropping it", () => {
    expect(mimeTypeToExtension("image/heic")).toBe(".heic");
    expect(mimeTypeToExtension("video/x-matroska")).toBe(".matroska");
  });

  test("returns empty string for generic or unrecognized content types", () => {
    expect(mimeTypeToExtension("application/octet-stream")).toBe("");
    expect(mimeTypeToExtension("text/html")).toBe("");
  });

  test("returns empty string for missing content type", () => {
    expect(mimeTypeToExtension(undefined)).toBe("");
    expect(mimeTypeToExtension(null)).toBe("");
    expect(mimeTypeToExtension("")).toBe("");
  });
});
