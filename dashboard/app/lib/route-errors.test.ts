import { describe, expect, it } from "vitest";
import { getRouteError, safeErrorDetails } from "./route-errors";

describe("safe route errors", () => {
  it("uses approved messages and reference IDs, not server-supplied text", () => {
    const result = getRouteError({
      status: 503,
      statusText: "",
      internal: false,
      data: {
        code: "ACCOUNTS_LOAD_FAILED",
        referenceId: "d6e338cd-5f34-4ff4-836f-cea21b01ec63",
        message: "secret",
      },
    });
    expect(result.message).toContain("social accounts");
    expect(result.referenceId).toBe("d6e338cd-5f34-4ff4-836f-cea21b01ec63");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("does not expose arbitrary exceptions or status text", () => {
    expect(getRouteError(new Error("secret")).code).toBe("UNEXPECTED_ERROR");
    expect(
      getRouteError({
        status: 500,
        statusText: "secret",
        internal: false,
        data: "secret",
      }).message,
    ).not.toContain("secret");
    expect(
      getRouteError({
        status: 503,
        statusText: "",
        internal: false,
        data: { code: "constructor" },
      }).code,
    ).toBe("UNEXPECTED_ERROR");
  });

  it("strips messages, causes, payloads and URL query strings from diagnostics", () => {
    const error = Object.assign(new Error("secret"), {
      code: "PGRST000",
      details: "secret",
      cause: "secret",
    });
    error.stack =
      "Error: secret\n    at load (https://example.com/app.js?token=secret:1:2)";
    expect(safeErrorDetails(error)).toEqual({
      exception_type: "Error",
      error_code: "PGRST000",
      stack: "    at load (https://example.com/app.js?[redacted])",
    });
  });
});
