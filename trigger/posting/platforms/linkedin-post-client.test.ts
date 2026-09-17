import { afterEach, describe, expect, mock, test } from "bun:test";
import { LinkedInPostClient } from "./linkedin-post-client";
import type { PostMedia, SocialAccount } from "../post.types";

// Regression coverage for PFM-1161 / PFM-1192: Company Page LinkedIn posts
// with media crashed with an unhandled "Cannot read properties of undefined
// (reading 'uploadMechanism')" instead of a descriptive error, and used the
// deprecated `urn:li:company:` owner prefix instead of `urn:li:organization:`.

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockResponse(opts: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: any;
  text?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const headers = opts.headers ?? {};
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    statusText: opts.statusText ?? "",
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
    json: async () => opts.json,
    text: async () =>
      opts.text ?? (opts.json !== undefined ? JSON.stringify(opts.json) : ""),
    body: opts.body ?? {},
  } as unknown as Response;
}

function pageAccount(): SocialAccount {
  return {
    provider: "linkedin",
    id: "spc_test123",
    social_provider_user_name: "Test Company Page",
    access_token: "test-access-token",
    refresh_token: null,
    access_token_expires_at: null,
    refresh_token_expires_at: null,
    social_provider_user_id: "123456",
    social_provider_metadata: { connection_type: "page" },
  };
}

function imageMedia(): PostMedia[] {
  return [{ id: "spm_1", url: "https://example.com/image.jpg", type: "image" }];
}

describe("LinkedInPostClient", () => {
  test("returns a descriptive error instead of crashing when registerUpload is rejected", async () => {
    globalThis.fetch = mock(async (url: RequestInfo | URL) => {
      const href = url.toString();
      if (href.includes("assets?action=registerUpload")) {
        return mockResponse({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: { status: 403, message: "ACCESS_DENIED" },
        });
      }
      throw new Error(`Unexpected fetch call: ${href}`);
    }) as unknown as typeof fetch;

    const client = new LinkedInPostClient({} as any, {
      app_id: "app-id",
      app_secret: "app-secret",
    });

    const result = await client.post({
      postId: "post_1",
      account: pageAccount(),
      caption: "hello world",
      media: imageMedia(),
    });

    expect(result.success).toBe(false);
    expect(result.error_message).toContain(
      "Failed to register LinkedIn media upload",
    );
    expect(result.error_message).not.toContain(
      "Cannot read properties of undefined",
    );
  });

  test("registers media ownership under urn:li:organization: (not the deprecated urn:li:company:) for Company Page accounts", async () => {
    let capturedOwner: string | undefined;

    globalThis.fetch = mock(async (url: RequestInfo | URL, init?: any) => {
      const href = url.toString();

      if (href.includes("assets?action=registerUpload")) {
        const body = JSON.parse(init.body);
        capturedOwner = body.registerUploadRequest.owner;
        return mockResponse({
          json: {
            value: {
              asset: "urn:li:digitalmediaAsset:abc123",
              uploadMechanism: {
                "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest":
                  {
                    uploadUrl: "https://upload.linkedin.com/put",
                  },
              },
            },
          },
        });
      }

      if (href === "https://example.com/image.jpg") {
        return mockResponse({ headers: { "content-type": "image/jpeg" } });
      }

      if (href === "https://upload.linkedin.com/put") {
        return mockResponse({ status: 201 });
      }

      if (href.includes("ugcPosts")) {
        return mockResponse({ json: { id: "urn:li:share:999" } });
      }

      throw new Error(`Unexpected fetch call: ${href}`);
    }) as unknown as typeof fetch;

    const client = new LinkedInPostClient({} as any, {
      app_id: "app-id",
      app_secret: "app-secret",
    });

    const result = await client.post({
      postId: "post_1",
      account: pageAccount(),
      caption: "hello world",
      media: imageMedia(),
    });

    expect(capturedOwner).toBe("urn:li:organization:123456");
    expect(result.success).toBe(true);
  });
});
