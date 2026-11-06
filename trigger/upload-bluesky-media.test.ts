import { expect, test } from "bun:test";

// Exercise real SDK authentication, BlobRef serialization and JSDOM in an isolated process.
const harness = String.raw`
import { expect, mock, spyOn } from "bun:test";
import { AtpAgent, BlobRef, jsonToLex } from "@atproto/api";
const scenario = process.env.SCENARIO;
const sdk = { task: (definition) => definition, logger: {}, wait: {}, tasks: {} };
mock.module("@trigger.dev/sdk", () => sdk);
mock.module("@trigger.dev/sdk/v3", () => sdk);
const calls = [];
const blobJson = { $type: "blob", ref: { $link: "bafkreigh2akiscaildcw4535x3ql5ojybhbnckcb27pww36r7oe4qzwqsu" }, mimeType: "image/png", size: 8 };
const auth = { service: "https://custom-pds.example", session: { did: "did:plc:test", handle: "test.example", accessJwt: "current-access", refreshJwt: "current-refresh", active: true } };
globalThis.fetch = mock(async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  calls.push(request.url);
  if (request.url === "https://media.example/prepared") {
    if (scenario === "image-download-error") throw new Error("download failed");
    return new Response("prepared", { headers: { "content-type": "application/octet-stream" } });
  }
  expect(request.headers.get("authorization")).toBe("Bearer current-access");
  if (scenario.startsWith("integration") && request.url.endsWith("/com.atproto.repo.createRecord")) {
    const payload = await request.json();
    expect(payload.record.text).toBe(scenario === "integration-image" ? "caption" : "https://page.example/nested/page");
    const embed = payload.record.embed;
    if (scenario === "integration-image") {
      expect(embed.images).toEqual([{ alt: "alt", image: blobJson, aspectRatio: { width: 4000, height: 3000 } }]);
    } else {
      expect(embed.external.thumb).toEqual(blobJson);
    }
    return Response.json({ uri: "at://did:plc:test/app.bsky.feed.post/record", cid: blobJson.ref.$link });
  }
  expect(request.url).toBe("https://custom-pds.example/xrpc/com.atproto.repo.uploadBlob");
  expect(request.headers.get("content-type")).toBe(scenario === "no-mime" ? "image/jpeg" : "image/png");
  expect(await request.text()).toBe("prepared");
  if (scenario === "image-upload-error" || scenario === "link-upload-error") throw new Error("upload failed");
  return Response.json({ blob: blobJson });
});
const nodeFetch = await import("node-fetch");
const pageCalls = [];
spyOn(nodeFetch, "default").mockImplementation(async (url, options) => {
  pageCalls.push(url);
  expect(options).toBeUndefined();
  if (pageCalls.length === 1) {
    expect(url).toBe("https://page.example/nested/page");
    if (scenario === "page-error") throw new Error("page failed");
    const image = scenario === "no-image" || scenario === "fallback" || scenario === "empty" ? "" : '<meta property="og:image" content="' + (scenario === "absolute" ? 'https://image.example/thumb' : scenario === "root" ? '/thumb' : 'thumb') + '">';
    return { text: async () => scenario === "empty" ? "" : scenario === "fallback" ? '<title>Fallback title</title><meta name="description" content="Fallback desc">' : '<title>Ignored</title><meta name="description" content="Ignored"><meta property="og:title" content="OG title"><meta property="og:description" content="OG desc">' + image };
  }
  expect(url).toBe(scenario === "absolute" ? "https://image.example/thumb" : "https://page.example/thumb");
  if (scenario === "thumbnail-error") throw new Error("thumbnail failed");
  return new Response("prepared", { headers: scenario === "no-mime" ? {} : { "content-type": "image/png" } });
});
const resume = spyOn(AtpAgent.prototype, "resumeSession");
const login = spyOn(AtpAgent.prototype, "login");
const { uploadBlueskyImage, uploadBlueskyLinkPreview } = await import("./upload-bluesky-media.ts");
for (const child of [uploadBlueskyImage, uploadBlueskyLinkPreview]) {
  expect(child.machine).toBe("medium-1x");
  expect(child.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
}
console.error = () => {};
if (scenario.startsWith("integration")) {
  // Simulate Trigger's JSON transport in both directions, then use the real SDK to create the record.
  const transport = (value) => JSON.parse(JSON.stringify(value));
  sdk.tasks.triggerAndWait = async (id, payload) => {
      payload = transport(payload);
      if (id === "transform-buffered-image") return { ok: true, output: { url: "https://media.example/prepared", mimeType: "image/png", width: 4000, height: 3000 } };
      const child = id === "upload-bluesky-image" ? uploadBlueskyImage : uploadBlueskyLinkPreview;
      return { ok: true, output: transport(await child.run(payload)) };
  };
  resume.mockImplementation(async function(session) {
    this.sessionManager.session = session;
    this.sessionManager.pdsUrl = new URL(auth.service);
    return { data: session };
  });
  const { BlueskyPostClient } = await import("./posting/platforms/bluesky-post-client.ts");
  const client = new BlueskyPostClient({ app_id: "app", app_secret: "secret" });
  await client.refreshAccessToken({ access_token: auth.session.accessJwt, refresh_token: auth.session.refreshJwt, social_provider_user_name: auth.session.handle, social_provider_user_id: auth.session.did, access_token_expires_at: new Date().toISOString() });
  resume.mockClear();
  const result = await client.post({ postId: "post", account: { id: "account" }, caption: scenario === "integration-image" ? "caption" : "https://page.example/nested/page", media: scenario === "integration-image" ? [{ type: "image", url: "https://source.example/image", alt_text: "alt" }] : [] });
  expect(result.success, JSON.stringify(result)).toBe(true);
  expect(calls.at(-1)).toBe("https://custom-pds.example/xrpc/com.atproto.repo.createRecord");
} else if (scenario.startsWith("image")) {
  const execute = () => uploadBlueskyImage.run({ ...auth, url: "https://media.example/prepared", encoding: "image/png" });
  if (scenario.endsWith("error")) {
    await expect(execute()).rejects.toThrow(scenario === "image-download-error" ? "download failed" : "upload failed");
  } else {
    const result = await execute();
    expect(result).toBeInstanceOf(BlobRef);
    expect(JSON.parse(JSON.stringify(result))).toEqual(blobJson);
    const restored = jsonToLex(JSON.parse(JSON.stringify(result)));
    expect(restored).toBeInstanceOf(BlobRef);
    expect(restored.ref.toString()).toBe(blobJson.ref.$link);
    expect(calls).toEqual(["https://media.example/prepared", "https://custom-pds.example/xrpc/com.atproto.repo.uploadBlob"]);
  }
  expect(pageCalls).toEqual([]);
} else {
  const result = await uploadBlueskyLinkPreview.run({ ...auth, url: "https://page.example/nested/page" });
  if (["page-error", "thumbnail-error", "link-upload-error"].includes(scenario)) {
    expect(result).toBeNull();
  } else {
    const hasImage = !["no-image", "fallback", "empty"].includes(scenario);
    expect(JSON.parse(JSON.stringify(result))).toEqual({ $type: "app.bsky.embed.external", external: {
      uri: "https://page.example/nested/page",
      title: scenario === "empty" ? "" : scenario === "fallback" ? "Fallback title" : "OG title",
      description: scenario === "empty" ? "" : scenario === "fallback" ? "Fallback desc" : "OG desc",
      ...(hasImage ? { thumb: blobJson } : {}),
    } });
    expect(calls.length).toBe(hasImage ? 1 : 0);
    if (hasImage) expect(jsonToLex(JSON.parse(JSON.stringify(result))).external.thumb).toBeInstanceOf(BlobRef);
  }
}
expect(resume).not.toHaveBeenCalled();
expect(login).not.toHaveBeenCalled();
`;

for (const scenario of ["image", "image-download-error", "image-upload-error", "relative", "root", "absolute", "no-mime", "no-image", "fallback", "empty", "page-error", "thumbnail-error", "link-upload-error", "integration-image", "integration-link"]) {
  test(`Bluesky media child: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname,
      env: { ...process.env, SCENARIO: scenario },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
}
