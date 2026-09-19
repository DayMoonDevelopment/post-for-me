import { beforeEach, describe, expect, test } from "bun:test";
import { LinkedInPostClient } from "./linkedin-post-client";
import type { PostMedia, SocialAccount } from "../post.types";

type FetchCall = { url: string; init?: RequestInit };

let calls: FetchCall[] = [];
let handler: (url: string, init?: RequestInit) => Response = defaultHandler;

beforeEach(() => {
  calls = [];
  handler = defaultHandler;
  (globalThis as any).fetch = (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return Promise.resolve(handler(String(url), init));
  };
});

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
}

function defaultHandler(url: string, init?: RequestInit): Response {
  const method = (init?.method || "GET").toUpperCase();

  if (url.includes("/rest/documents?action=initializeUpload")) {
    return jsonResponse({
      value: {
        uploadUrl: "https://upload.example.com/document",
        document: "urn:li:document:doc-1",
      },
    });
  }

  if (url === "https://upload.example.com/document" && method === "PUT") {
    return new Response(null, { status: 201 });
  }

  if (url.includes("/rest/posts") && method === "POST") {
    return new Response(null, {
      status: 201,
      headers: { "x-restli-id": "urn:li:share:doc-post-1" },
    });
  }

  if (url.includes("/v2/assets?action=registerUpload")) {
    return jsonResponse({
      value: {
        uploadMechanism: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
            uploadUrl: "https://upload.example.com/media",
          },
        },
        asset: "urn:li:digitalmediaAsset:media-1",
      },
    });
  }

  if (url === "https://upload.example.com/media" && method === "POST") {
    return new Response(null, { status: 201 });
  }

  if (url.includes("/v2/ugcPosts") && method === "POST") {
    return jsonResponse(
      { id: "urn:li:share:legacy-post-1" },
      { headers: { "x-restli-id": "urn:li:share:legacy-post-1" } },
    );
  }

  if (/^https:\/\/example\.com\/file\./.test(url)) {
    return new Response("binary-bytes", {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": "13",
      },
    });
  }

  throw new Error(`Unhandled fetch in test: ${method} ${url}`);
}

function makeClient(): LinkedInPostClient {
  return new LinkedInPostClient({} as any, {
    app_id: "app-id",
    app_secret: "app-secret",
  });
}

const personAccount: SocialAccount = {
  provider: "linkedin" as any,
  id: "conn-person",
  social_provider_user_name: "Test User",
  access_token: "access-token",
  refresh_token: null,
  access_token_expires_at: null,
  refresh_token_expires_at: null,
  social_provider_user_id: "12345",
  social_provider_metadata: null,
};

const orgAccount: SocialAccount = {
  ...personAccount,
  id: "conn-org",
  social_provider_user_id: "67890",
  social_provider_metadata: { connection_type: "page" },
};

const imageMedium: PostMedia = {
  id: "m-image",
  url: "https://example.com/file.jpg",
  type: "image",
};

const videoMedium: PostMedia = {
  id: "m-video",
  url: "https://example.com/file.mp4",
  type: "video",
};

const documentMedium: PostMedia = {
  id: "m-document",
  url: "https://example.com/file.pdf",
  type: "document",
};

function callUrls(): string[] {
  return calls.map((c) => c.url);
}

describe("LinkedInPostClient#post — existing image/video flow (unchanged)", () => {
  test("single image post uses the legacy /v2/assets + /v2/ugcPosts flow", async () => {
    const client = makeClient();
    const result = await client.post({
      postId: "post-1",
      account: personAccount,
      caption: "hello",
      media: [imageMedium],
    });

    expect(result.success).toBe(true);
    expect(callUrls().some((u) => u.includes("/v2/assets?action=registerUpload"))).toBe(
      true,
    );
    expect(callUrls().some((u) => u.includes("/v2/ugcPosts"))).toBe(true);
    expect(callUrls().some((u) => u.includes("/rest/documents"))).toBe(false);
    expect(callUrls().some((u) => u.includes("/rest/posts"))).toBe(false);
  });

  test("single video post uses the legacy flow with VIDEO category", async () => {
    const client = makeClient();
    const result = await client.post({
      postId: "post-2",
      account: personAccount,
      caption: "hello video",
      media: [videoMedium],
    });

    expect(result.success).toBe(true);
    const ugcCall = calls.find((c) => c.url.includes("/v2/ugcPosts"));
    const body = JSON.parse(ugcCall!.init!.body as string);
    expect(
      body.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory,
    ).toBe("VIDEO");
  });

  test("organization page account resolves authorUrn to urn:li:organization", async () => {
    const client = makeClient();
    await client.post({
      postId: "post-3",
      account: orgAccount,
      caption: "hello org",
      media: [imageMedium],
    });

    const registerCall = calls.find((c) =>
      c.url.includes("/v2/assets?action=registerUpload"),
    );
    const registerBody = JSON.parse(registerCall!.init!.body as string);
    expect(registerBody.registerUploadRequest.owner).toBe(
      "urn:li:organization:67890",
    );

    const ugcCall = calls.find((c) => c.url.includes("/v2/ugcPosts"));
    const ugcBody = JSON.parse(ugcCall!.init!.body as string);
    expect(ugcBody.author).toBe("urn:li:organization:67890");
  });
});

describe("LinkedInPostClient#post — document (PDF) posts", () => {
  test("a single document medium publishes via the versioned Documents + Posts API", async () => {
    const client = makeClient();
    const result = await client.post({
      postId: "post-doc-1",
      account: personAccount,
      caption: "check out this doc",
      media: [documentMedium],
    });

    expect(result.success).toBe(true);
    expect(result.provider_post_id).toBe("urn:li:share:doc-post-1");
    expect(result.provider_post_url).toBe(
      "https://www.linkedin.com/feed/update/urn:li:share:doc-post-1",
    );

    expect(
      callUrls().some((u) => u.includes("/rest/documents?action=initializeUpload")),
    ).toBe(true);
    expect(callUrls().some((u) => u.includes("/rest/posts"))).toBe(true);
    expect(callUrls().some((u) => u.includes("/v2/assets"))).toBe(false);
    expect(callUrls().some((u) => u.includes("/v2/ugcPosts"))).toBe(false);

    const postsCall = calls.find((c) => c.url.includes("/rest/posts"));
    expect((postsCall!.init!.headers as Record<string, string>)["Linkedin-Version"]).toBeTruthy();
    expect(
      (postsCall!.init!.headers as Record<string, string>)["X-Restli-Protocol-Version"],
    ).toBe("2.0.0");
    const postsBody = JSON.parse(postsCall!.init!.body as string);
    expect(postsBody.content.media.id).toBe("urn:li:document:doc-1");

    const uploadCall = calls.find(
      (c) => c.url === "https://upload.example.com/document",
    );
    expect(
      (uploadCall!.init!.headers as Record<string, string>)["Content-Length"],
    ).toBe("13");
  });

  test("a non-JSON initializeUpload error body is guarded instead of throwing unhandled", async () => {
    handler = (url, init) => {
      if (url.includes("/rest/documents?action=initializeUpload")) {
        return new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "content-type": "text/plain" },
        });
      }
      return defaultHandler(url, init);
    };

    const client = makeClient();
    const result = await client.post({
      postId: "post-doc-5",
      account: personAccount,
      caption: "server hiccup",
      media: [documentMedium],
    });

    expect(result.success).toBe(false);
    expect(result.error_message).toContain(
      "Failed to initialize LinkedIn document upload: 500",
    );
    expect(callUrls().some((u) => u.includes("/rest/posts"))).toBe(false);
  });

  test("a malformed initializeUpload response is guarded instead of throwing unhandled", async () => {
    handler = (url, init) => {
      if (url.includes("/rest/documents?action=initializeUpload")) {
        // 200 OK but missing the expected `value` shape
        return jsonResponse({});
      }
      return defaultHandler(url, init);
    };

    const client = makeClient();
    const result = await client.post({
      postId: "post-doc-2",
      account: personAccount,
      caption: "broken upload",
      media: [documentMedium],
    });

    expect(result.success).toBe(false);
    expect(result.error_message).toContain(
      "Failed to initialize LinkedIn document upload",
    );
    expect(callUrls().some((u) => u.includes("/rest/posts"))).toBe(false);
  });

  test("mixing a document with other media is rejected without calling LinkedIn", async () => {
    const client = makeClient();
    const result = await client.post({
      postId: "post-doc-3",
      account: personAccount,
      caption: "mixed media",
      media: [documentMedium, imageMedium],
    });

    expect(result.success).toBe(false);
    expect(result.error_message).toContain(
      "LinkedIn document posts support exactly one PDF and no other media",
    );
    expect(calls.length).toBe(0);
  });

  test("more than one document is rejected without calling LinkedIn", async () => {
    const client = makeClient();
    const result = await client.post({
      postId: "post-doc-4",
      account: personAccount,
      caption: "two docs",
      media: [documentMedium, { ...documentMedium, id: "m-document-2" }],
    });

    expect(result.success).toBe(false);
    expect(result.error_message).toContain(
      "LinkedIn document posts support exactly one PDF and no other media",
    );
    expect(calls.length).toBe(0);
  });
});
