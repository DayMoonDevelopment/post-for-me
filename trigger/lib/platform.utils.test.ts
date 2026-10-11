import { describe, expect, test } from "bun:test";
import { normalizePlatform } from "./platform.utils";

describe("normalizePlatform", () => {
  test("normalizes mixed casing", () => {
    expect(normalizePlatform("FaCeBoOk")).toBe("facebook");
  });

  test("trims surrounding whitespace", () => {
    expect(normalizePlatform(" \tInStAgRaM\n")).toBe("instagram");
  });

  test("returns an empty string for empty or whitespace-only input", () => {
    expect(normalizePlatform("")).toBe("");
    expect(normalizePlatform(" \t\n")).toBe("");
  });
});
