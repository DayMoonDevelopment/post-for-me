import { describe, expect, it, vi } from "vitest";
import { redactSecrets } from "./redact-secrets";
import { safeConsole } from "./safe-console";

describe("OAuth credential-safe diagnostics", () => {
  it("redacts token response credentials without changing credentials used to connect", () => {
    const tokens = {
      access_token: "access-secret",
      refresh_token: "refresh-secret",
      id_token: "id-secret",
      expires_in: 3600,
    };
    const result = redactSecrets(tokens);
    for (const secret of ["access-secret", "refresh-secret", "id-secret"])
      expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.expires_in).toBe(3600);
    expect(tokens.access_token).toBe("access-secret");
  });

  it("sanitizes SDK errors, URL parameters and response text", () => {
    const result = redactSecrets({
      error: Object.assign(new Error("Failed for error-secret"), {
        config: {
          headers: { Authorization: "Bearer header-secret" },
          params: { access_token: "error-secret" },
        },
      }),
      url: "https://example.com/?access_token=query-secret&fields=id",
      body: '{"accessToken":"body-secret","status":400}',
    });
    for (const secret of [
      "error-secret",
      "header-secret",
      "query-secret",
      "body-secret",
    ])
      expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.error.message).toBe("Failed for [REDACTED]");
    expect(result.url).toContain("&fields=id");
  });

  it("redacts credentials across all console arguments", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      safeConsole.error("Rejected log-secret", { accessToken: "log-secret" });
      expect(spy).toHaveBeenCalledWith("Rejected [REDACTED]", {
        accessToken: "[REDACTED]",
      });
    } finally {
      spy.mockRestore();
    }
  });
});
