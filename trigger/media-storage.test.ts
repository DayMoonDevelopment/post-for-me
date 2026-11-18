import { expect, test } from "bun:test";

// Other suites globally mock storage dependencies; keep both SDK imports and mocks isolated.
const harness = String.raw`
import { expect, mock } from "bun:test";
import { createReadStream } from "node:fs";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scenario = process.env.STORAGE_SCENARIO;
const requests = [];
let activeParts = 0;
let maxActiveParts = 0;
let releaseFirstParts;
const firstPartsReady = new Promise((resolve) => { releaseFirstParts = resolve; });
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    const body = Buffer.from(await request.arrayBuffer());
    requests.push({ method: request.method, url, headers: request.headers, body });
    const xml = (body, status = 200) => new Response(body, {
      status, headers: { "Content-Type": "application/xml" },
    });
    if (request.method === "POST" && url.searchParams.has("uploads")) {
      return xml('<InitiateMultipartUploadResult><Bucket>media</Bucket><Key>videos/movie.mp4</Key><UploadId>test-upload</UploadId></InitiateMultipartUploadResult>');
    }
    if (request.method === "PUT" && url.searchParams.has("partNumber")) {
      activeParts++;
      maxActiveParts = Math.max(maxActiveParts, activeParts);
      // Hold the first part until both upload workers reach the server, regardless of scheduling delay.
      if (activeParts === 2) releaseFirstParts();
      await firstPartsReady;
      activeParts--;
      if (scenario === "multipart-failure" && url.searchParams.get("partNumber") === "1") {
        return xml('<Error><Code>InvalidRequest</Code><Message>part rejected</Message></Error>', 400);
      }
      return new Response(null, { headers: { ETag: '"part-' + url.searchParams.get("partNumber") + '"' } });
    }
    if (request.method === "POST" && url.searchParams.has("uploadId")) {
      return xml('<CompleteMultipartUploadResult><Location>http://localhost/media/videos/movie.mp4</Location><Bucket>media</Bucket><Key>videos/movie.mp4</Key><ETag>"complete"</ETag></CompleteMultipartUploadResult>');
    }
    if (request.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(null, { headers: { ETag: '"buffer"' } });
  },
});
const environment = {
  R2_ENDPOINT: server.url.origin,
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
  R2_BUCKET_NAME: "media",
  R2_PUBLIC_BASE_URL: "https://cdn.example.com/assets/base///",
};
Object.assign(process.env, environment);
let directory;

try {
  if (scenario === "stream-cleanup") {
    directory = await mkdtemp(join(tmpdir(), "media-storage-test-"));
    const filePath = join(directory, "video.mp4");
    const body = Buffer.alloc(1024, 7);
    await writeFile(filePath, body);
    let stream;
    const openStream = createReadStream;
    mock.module("node:fs", () => ({
      createReadStream(path) {
        stream = openStream(path);
        return stream;
      },
    }));
    const failure = new Error("upload failed before reading");
    let uploads = 0;
    mock.module("@aws-sdk/lib-storage", () => ({
      Upload: class {
        constructor(options) {
          uploads++;
          expect(options.queueSize).toBe(2);
          expect(options.partSize).toBe(8 * 1024 * 1024);
          expect(options.leavePartsOnError).toBe(false);
          expect(options.params).toEqual({
            Bucket: "media", Key: "video.mp4", Body: stream,
            ContentLength: body.length, ContentType: "video/mp4",
            CacheControl: "private, max-age=60",
          });
        }
        async done() { throw failure; }
      },
    }));
    const { uploadMedia } = await import("./media-storage.ts");
    await expect(uploadMedia({ filePath, key: "video.mp4", contentType: "video/mp4", cacheControl: "private, max-age=60" })).rejects.toBe(failure);
    expect(uploads).toBe(1);
    expect(stream.destroyed).toBe(true);
    // Wait for the descriptor to close, not just the synchronous destroyed flag.
    if (!stream.closed) await new Promise((resolve, reject) => {
      stream.once("close", resolve);
      stream.once("error", reject);
    });
    expect(stream.closed).toBe(true);
    expect(requests).toHaveLength(0);
  } else {
    const { uploadMedia } = await import("./media-storage.ts");
    if (scenario === "buffer") {
      const body = Buffer.from([0, 1, 127, 128, 255]);
      const key = "team folder/100% +?#/caf\u00e9.png";
      expect(await uploadMedia({ body, key, contentType: "image/png" })).toBe(
        "https://cdn.example.com/assets/base/team%20folder/100%25%20%2B%3F%23/caf%C3%A9.png",
      );
      expect(requests).toHaveLength(1);
      const request = requests[0];
      expect(request.method).toBe("PUT");
      expect(decodeURIComponent(request.url.pathname)).toBe("/media/" + key);
      expect(request.body).toEqual(body);
      expect(request.headers.get("content-type")).toBe("image/png");
      expect(request.headers.get("content-length")).toBe(String(body.length));
      expect(request.headers.get("cache-control")).toBe("public, max-age=3600");
      expect(request.headers.get("authorization")).toContain("Credential=test-access-key/");

      for (const base of ["https://cdn.example.com", "https://cdn.example.com/", "http://cdn.example.com/nested/path/"]) {
        process.env.R2_PUBLIC_BASE_URL = base;
        expect(await uploadMedia({ body: Buffer.alloc(0), key: "empty.txt", contentType: "text/plain", cacheControl: "no-store" })).toBe(base.replace(/\/+$/, "") + "/empty.txt");
        const last = requests.at(-1);
        expect(last.method).toBe("PUT");
        expect(last.body.length).toBe(0);
        expect(last.headers.get("content-length")).toBe("0");
        expect(last.headers.get("cache-control")).toBe("no-store");
      }
      expect(requests).toHaveLength(4);
    } else if (scenario === "validation") {
      const options = { body: Buffer.from("no upload"), key: "valid.png", contentType: "image/png" };
      for (const name of Object.keys(environment)) {
        for (const missing of [undefined, "", "   "]) {
          Object.assign(process.env, environment);
          if (missing === undefined) delete process.env[name];
          else process.env[name] = missing;
          await expect(uploadMedia(options)).rejects.toThrow("Missing required media storage variable: " + name);
        }
      }
      Object.assign(process.env, environment);
      for (const [name, value] of [
        ["R2_ENDPOINT", "not a url"],
        ["R2_ENDPOINT", "ftp://storage.example.com"],
        ["R2_PUBLIC_BASE_URL", "not a url"],
        ["R2_PUBLIC_BASE_URL", "ftp://cdn.example.com"],
        ["R2_PUBLIC_BASE_URL", "https://user:password@cdn.example.com"],
        ["R2_PUBLIC_BASE_URL", "https://user@cdn.example.com"],
        ["R2_PUBLIC_BASE_URL", "https://cdn.example.com/base?token=secret"],
        ["R2_PUBLIC_BASE_URL", "https://cdn.example.com/base#fragment"],
      ]) {
        Object.assign(process.env, environment, { [name]: value });
        await expect(uploadMedia(options)).rejects.toThrow();
      }
      Object.assign(process.env, environment);
      for (const key of ["", "/leading", "trailing/", "double//slash", ".", "..", "a/./b", "a/../b"]) {
        await expect(uploadMedia({ ...options, key })).rejects.toThrow("Invalid media object key");
      }
      expect(requests).toHaveLength(0);
    } else {
      directory = await mkdtemp(join(tmpdir(), "media-storage-test-"));
      const filePath = join(directory, "movie.mp4");
      const partSize = 8 * 1024 * 1024;
      const body = Buffer.alloc(2 * partSize + 123, 42);
      body[partSize] = 17;
      body[2 * partSize] = 99;
      await writeFile(filePath, body);
      const upload = uploadMedia({ filePath, key: "videos/movie.mp4", contentType: "video/mp4" });
      if (scenario === "multipart-failure") await expect(upload).rejects.toThrow("part rejected");
      else expect(await upload).toBe("https://cdn.example.com/assets/base/videos/movie.mp4");

      const initiation = requests[0];
      expect(initiation.method).toBe("POST");
      expect(initiation.url.searchParams.has("uploads")).toBe(true);
      expect(initiation.headers.get("content-type")).toBe("video/mp4");
      expect(initiation.headers.get("cache-control")).toBe("public, max-age=3600");
      for (const request of requests) expect(request.url.pathname).toBe("/media/videos/movie.mp4");
      const parts = requests.filter((request) => request.method === "PUT");
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(maxActiveParts).toBe(2);
      expect(activeParts).toBe(0);
      for (const part of parts) {
        const number = Number(part.url.searchParams.get("partNumber"));
        expect(part.url.searchParams.get("uploadId")).toBe("test-upload");
        expect(part.body).toEqual(body.subarray((number - 1) * partSize, number * partSize));
        expect(part.headers.get("content-length")).toBe(String(part.body.length));
      }
      const aborts = requests.filter((request) => request.method === "DELETE");
      const completions = requests.filter((request) => request.method === "POST" && request.url.searchParams.has("uploadId"));
      if (scenario === "multipart-failure") {
        expect(aborts).toHaveLength(1);
        expect(aborts[0].url.searchParams.get("uploadId")).toBe("test-upload");
        expect(completions).toHaveLength(0);
        expect(requests.at(-1)).toBe(aborts[0]);
      } else {
        expect(parts).toHaveLength(3);
        expect(aborts).toHaveLength(0);
        expect(completions).toHaveLength(1);
        const completion = completions[0].body.toString();
        for (const number of [1, 2, 3]) {
          expect(completion).toContain("<PartNumber>" + number + "</PartNumber>");
          expect(completion).toContain("part-" + number);
        }
      }
    }
  }
} finally {
  server.stop(true);
  if (directory) await rm(directory, { recursive: true, force: true });
}
`;

for (const scenario of [
  "buffer",
  "validation",
  "multipart-success",
  "multipart-failure",
  "stream-cleanup",
]) {
  test(`media storage: ${scenario}`, async () => {
    const child = Bun.spawn([process.execPath, "--eval", harness], {
      cwd: __dirname,
      env: { ...process.env, STORAGE_SCENARIO: scenario },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  }, 20_000);
}
