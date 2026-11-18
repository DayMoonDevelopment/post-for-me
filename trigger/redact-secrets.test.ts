import { describe, expect, test, spyOn } from "bun:test";
import { redactSecrets } from "./redact-secrets";
import { safeConsole } from "./safe-console";
import { safeLogger } from "./safe-logger";
import { logger } from "@trigger.dev/sdk";

describe("credential redaction", () => {
  test("safe Trigger logger sanitizes the message and properties together", () => {
    const spy = spyOn(logger, "info").mockImplementation(() => undefined);
    try {
      safeLogger.info("Rejected log-secret", {
        account: { access_token: "log-secret" },
      });
      expect(spy).toHaveBeenCalledWith("Rejected [REDACTED]", {
        account: { access_token: "[REDACTED]" },
      });
    } finally {
      spy.mockRestore();
    }
  });
  test("redacts nested account/app credentials without mutating the input", () => {
    const value = {
      account: {
        access_token: "access-secret",
        refresh_token: "refresh-secret",
        access_token_expires_at: "2026-10-08",
      },
      appCredentials: { app_secret: "app-secret", app_id: "app-id" },
      responses: [{ accessToken: "camel-secret", refreshJwt: "jwt-secret" }],
      message: "Platform rejected access-secret",
      status: 400,
    };
    const result = redactSecrets(value);
    for (const secret of [
      "access-secret",
      "refresh-secret",
      "app-secret",
      "camel-secret",
      "jwt-secret",
    ]) {
      expect(JSON.stringify(result)).not.toContain(secret);
    }
    expect(result.account.access_token_expires_at).toBe("2026-10-08");
    expect(result.appCredentials.app_id).toBe("app-id");
    expect(result.status).toBe(400);
    expect(value.account.access_token).toBe("access-secret");
  });

  test("redacts URL query parameters, form bodies, JSON text and auth headers", () => {
    const result = redactSecrets({
      url: "https://graph.facebook.com/me?access_token=url-secret&fields=id",
      body: "refresh_token=form-secret&client_secret=client-secret",
      response: '{"access_token":"json-secret","code":190}',
      headers: new Headers({
        Authorization: "Bearer header-secret",
        "Access-Token": "tiktok-secret",
      }),
      message: "Request with Bearer message-secret failed",
    });
    for (const secret of [
      "url-secret",
      "form-secret",
      "client-secret",
      "json-secret",
      "header-secret",
      "tiktok-secret",
      "message-secret",
    ]) {
      expect(JSON.stringify(result)).not.toContain(secret);
    }
    expect(result.url).toContain("&fields=id");
    expect(result.response).toContain('"code":190');
  });

  test("serializes errors and cycles safely while preserving platform diagnostics", () => {
    const error = Object.assign(new Error("Failed for error-secret"), {
      config: {
        headers: { Authorization: "Bearer auth-secret" },
        params: { access_token: "error-secret" },
      },
      response: {
        status: 401,
        data: { error: { code: 190, message: "Invalid token" } },
      },
      request: { raw: "transport-secret" } as Record<string, unknown>,
    });
    error.request.self = error.request;
    const result = redactSecrets({ error });
    const serialized = JSON.stringify(result);
    for (const secret of ["error-secret", "auth-secret", "transport-secret"])
      expect(serialized).not.toContain(secret);
    expect(result.error.message).toBe("Failed for [REDACTED]");
    expect(result.error.response.status).toBe(401);
    expect(result.error.response.data.error.code).toBe(190);
    expect(error.config.params.access_token).toBe("error-secret");
  });

  test("redacts old and refreshed tokens echoed in result strings", () => {
    const result = redactSecrets(
      {
        success: true,
        details: {
          requests: ["old-secret"],
          responses: [
            { access_token: "new-secret", refresh_token: "new-refresh" },
          ],
          url: "https://example.com/a%2Fb",
        },
        error_message: "new-secret",
      },
      ["old-secret", "a/b"],
    );
    const serialized = JSON.stringify(result);
    for (const secret of ["old-secret", "new-secret", "new-refresh", "a%2Fb"])
      expect(serialized).not.toContain(secret);
    expect(result.success).toBe(true);
  });

  test("safe console sanitizes all arguments together before emission", () => {
    const spy = spyOn(console, "error").mockImplementation(() => undefined);
    try {
      safeConsole.error("Failed for log-secret", {
        access_token: "log-secret",
        status: 400,
      });
      expect(spy).toHaveBeenCalledWith("Failed for [REDACTED]", {
        access_token: "[REDACTED]",
        status: 400,
      });
    } finally {
      spy.mockRestore();
    }
  });
});
