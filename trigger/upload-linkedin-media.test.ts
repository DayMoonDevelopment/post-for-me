import { expect, test } from "bun:test";

const harness = String.raw`
import { expect, mock } from "bun:test";
const scenario = process.env.SCENARIO;
const type = process.env.MEDIA_TYPE;
const document = type === "document";
const transport = (value) => JSON.parse(JSON.stringify(value));
const sdk = { task: (definition) => definition, tasks: {} };
mock.module("@trigger.dev/sdk", () => sdk);
const { uploadLinkedInMedia: child } = await import("./upload-linkedin-media.ts");
expect(child.id).toBe("upload-linkedin-media");
expect(child.machine).toBe("medium-1x");
expect(child.retry).toEqual({ maxAttempts: 2, outOfMemory: { machine: "large-1x" } });
const payload = { medium: { url: "https://source.example/file", type }, authorUrn: "urn:li:person:123", accessToken: "token", apiVersion: "209901" };
const calls = [];
let inChild = false;
let sourceBody;
let cancelled = false;
let releaseInit;
const sourceStarted = new Promise((resolve) => { releaseInit = resolve; });
const initData = document
  ? { value: { uploadUrl: "https://upload.example/file", document: "urn:li:document:1" } }
  : { value: { uploadMechanism: { "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: "https://upload.example/file" } }, asset: "urn:li:digitalmediaAsset:1" } };
globalThis.fetch = mock(async (url, init) => {
  calls.push(url);
  if (url.includes("/ugcPosts") || url.endsWith("/rest/posts")) {
    expect(inChild).toBe(false);
    expect(init.headers["Linkedin-Version"]).toBe(document ? "209901" : undefined);
    return Response.json({ id: "urn:li:share:post" }, { headers: { "x-restli-id": "urn:li:share:post" } });
  }
  expect(inChild).toBe(true);
  if (url === payload.medium.url) {
    releaseInit();
    if (scenario === "download-network") throw new Error("download network failure");
    sourceBody = new ReadableStream({ cancel() { cancelled = true; } });
    const headers = scenario === "unknown-size" ? {} : { "content-length": scenario === "oversize" ? String(100 * 1024 * 1024 + 1) : "123" };
    if (scenario === "mime") headers["content-type"] = "application/custom";
    return new Response(sourceBody, { status: scenario === "download-http" ? 403 : 200, statusText: scenario === "download-http" ? "Forbidden" : "OK", headers });
  }
  expect(init.headers.Authorization).toBe("Bearer token");
  if (url === "https://upload.example/file") {
    expect(init.method).toBe(document ? "PUT" : "POST");
    expect(init.body).toBe(sourceBody);
    expect(init.body).toBeInstanceOf(ReadableStream);
    expect(init.duplex).toBe("half");
    expect(init.headers).toEqual({ Authorization: "Bearer token", "Content-Type": scenario === "mime" ? "application/custom" : document ? "application/pdf" : type === "video" ? "video/mp4" : "image/jpeg", ...(scenario === "unknown-size" ? {} : { "Content-Length": "123" }) });
    if (scenario === "upload-network") throw new Error("upload network failure");
    return new Response(null, { status: scenario === "upload-http" ? 500 : 201, statusText: "Upload status" });
  }
  expect(init.method).toBe("POST");
  if (document) {
    expect(url).toBe("https://api.linkedin.com/rest/documents?action=initializeUpload");
    expect(init.headers).toEqual({ Authorization: "Bearer token", "Content-Type": "application/json", "Linkedin-Version": "209901", "X-Restli-Protocol-Version": "2.0.0" });
    expect(JSON.parse(init.body)).toEqual({ initializeUploadRequest: { owner: payload.authorUrn } });
    // Initialization cannot resolve until the concurrent download starts.
    await sourceStarted;
  } else {
    expect(url).toBe("https://api.linkedin.com/v2/assets?action=registerUpload");
    expect(init.headers).toEqual({ Authorization: "Bearer token", "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ registerUploadRequest: { recipes: ["urn:li:digitalmediaRecipe:feedshare-" + (type === "video" ? "video" : "image")], owner: payload.authorUrn, serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }] } });
  }
  if (scenario === "init-network") throw new Error("init network failure");
  if (scenario === "init-text") return new Response("not JSON", { status: 500 });
  return Response.json(scenario === "init-http" ? { message: "ACCESS_DENIED" } : initData, { status: scenario === "init-http" ? 403 : 200 });
});
const execute = async (attempt) => {
  inChild = true;
  try { return transport(await child.run(transport(payload), { ctx: { attempt: { number: attempt } } })); }
  finally { inChild = false; }
};
const fails = !["success", "unknown-size", "mime", "integration", "framework"].includes(scenario);
if (fails) {
  await expect(execute(1)).rejects.toThrow();
  const output = await execute(2);
  expect(output.success).toBe(false);
  expect(output.error.name).toBeTruthy();
  expect(output.error.message).toBe(output.message);
  expect(output.error.stack).toContain(output.message);
  expect(output.requests.length).toBe(1);
  expect(output.requests[0].timestamp).toBeTruthy();
  expect(output.responses.length).toBe(scenario === "init-network" || scenario === "download-network" && document ? 0 : 1);
  if (document && ["init-http", "init-text", "download-http", "oversize"].includes(scenario)) expect(cancelled).toBe(true);
  if (scenario.startsWith("init")) expect(output.message).toContain(scenario === "init-network" ? "init network failure" : document ? "Failed to initialize LinkedIn document upload" : "Failed to register LinkedIn media upload");
  if (scenario.startsWith("download")) expect(output.message).toContain(scenario === "download-network" ? "download network failure" : "Failed to download");
  if (scenario.startsWith("upload")) expect(output.message).toContain(scenario === "upload-network" ? "upload network failure" : "Failed to upload");
  if (scenario === "oversize") expect(output.message).toContain("100MB");
} else if (scenario === "integration" || scenario === "framework") {
  process.env.LINKEDIN_API_VERSION = payload.apiVersion;
  sdk.tasks.triggerAndWait = async (id, value) => {
    expect(id).toBe(child.id);
    expect(transport(value)).toEqual(payload);
    if (scenario === "framework") return { ok: false, error: { name: "Error", message: "Worker out of memory" } };
    return { ok: true, output: await execute(2) };
  };
  const { LinkedInPostClient } = await import("./posting/platforms/linkedin-post-client.ts");
  console.error = () => {};
  const result = transport(await new LinkedInPostClient({ app_id: "app", app_secret: "secret" }).post({ postId: "post", account: { id: "account", access_token: "token", social_provider_user_id: "123" }, caption: "caption", media: [{ ...payload.medium, id: "not passed to child" }] }));
  expect(result.success).toBe(scenario !== "framework");
  if (scenario === "framework") {
    expect(result.error_message).toContain("Worker out of memory");
    expect(result.details.error.cause.message).toBe("Worker out of memory");
    expect(calls).toEqual([]);
  } else {
    expect(result.details.requests.some((r) => document ? r.initializeUploadRequest : r.registerRequest)).toBe(true);
    expect(result.details.responses.length).toBe(3);
  }
} else {
  const output = await execute(1);
  expect(output).toEqual({ success: true, urn: document ? initData.value.document : initData.value.asset, requests: [expect.objectContaining({ timestamp: expect.any(String) })], responses: [expect.objectContaining(document ? { initializeDocumentUploadResponse: initData } : { registerResponse: initData }), expect.objectContaining(document ? { uploadDocumentResponse: 201 } : { uploadResponse: 201 })] });
  expect(calls.length).toBe(3);
}
`;

for (const type of ["document", "image", "video"]) {
  for (const scenario of ["success", "unknown-size", "mime", "init-http", "init-network", "download-http", "download-network", "upload-http", "upload-network", "integration", "framework", ...(type === "document" ? ["init-text", "oversize"] : [])]) {
    test(`LinkedIn upload child: ${type} ${scenario}`, async () => {
      const child = Bun.spawn([process.execPath, "--eval", harness], {
        cwd: __dirname,
        env: { ...process.env, SCENARIO: scenario, MEDIA_TYPE: type },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });
  }
}
