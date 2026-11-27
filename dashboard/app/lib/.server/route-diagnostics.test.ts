import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseContext } from "./supabase";
import {
  getRequestReference,
  observeRouteLoad,
  reportServerError,
  requireRouteUser,
} from "./route-diagnostics";

const args = (signal?: AbortSignal) => ({
  request: new Request(
    "https://app.postforme.dev/team-1/project-1/accounts?token=secret",
    { signal },
  ),
  params: { teamId: "team-1", projectId: "project-1" },
});

describe("route diagnostics", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("keeps successful loads silent and shares a reference within a request", async () => {
    const input = args();
    const result = await observeRouteLoad(input, "accounts", (diagnostics) =>
      diagnostics.step(
        "accounts_query",
        "ACCOUNTS_LOAD_FAILED",
        async () => "ok",
      ),
    );
    expect(result).toBe("ok");
    expect(getRequestReference(input.request)).toBe(
      getRequestReference(input.request),
    );
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("turns a thrown dependency error into a safe classified error", async () => {
    const input = args();
    await expect(
      observeRouteLoad(input, "accounts", (diagnostics) =>
        diagnostics.step("accounts_query", "ACCOUNTS_LOAD_FAILED", async () => {
          throw Object.assign(new Error("access_token=secret"), {
            code: "PGRST000",
          });
        }),
      ),
    ).rejects.toMatchObject({
      data: {
        code: "ACCOUNTS_LOAD_FAILED",
        referenceId: getRequestReference(input.request),
      },
      init: {
        status: 503,
        headers: { "X-Dashboard-Error-Id": getRequestReference(input.request) },
      },
    });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "secret",
    );
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toMatchObject(
      {
        stage: "accounts_query",
        error_code: "PGRST000",
        code: "ACCOUNTS_LOAD_FAILED",
      },
    );
  });

  it("preserves redirects without logging application errors", async () => {
    const response = new Response(null, {
      status: 302,
      headers: { Location: "/logout" },
    });
    await expect(
      observeRouteLoad(args(), "project", async () => {
        throw response;
      }),
    ).rejects.toBe(response);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("keeps cancellations silent even when a dependency returns an error", async () => {
    const controller = new AbortController();
    const input = args(controller.signal);
    await expect(
      observeRouteLoad(input, "accounts", async (diagnostics) => {
        controller.abort();
        diagnostics.fail("ACCOUNTS_LOAD_FAILED", new Error("cancelled"));
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(console.error).not.toHaveBeenCalled();
    reportServerError(new Error("cancelled"), input.request);
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    [{ data: { user: null }, error: null }, "SESSION_EXPIRED", 401],
    [
      { data: { user: null }, error: { name: "AuthSessionMissingError" } },
      "SESSION_EXPIRED",
      401,
    ],
    [
      {
        data: { user: null },
        error: { name: "AuthRetryableFetchError", status: 503 },
      },
      "AUTH_UNAVAILABLE",
      503,
    ],
  ])(
    "classifies authentication failures without calling every failure an expired session",
    async (result, code, status) => {
      const supabase = {
        auth: { getUser: vi.fn().mockResolvedValue(result) },
      } as unknown as SupabaseContext["supabase"];
      await expect(
        observeRouteLoad(args(), "project", (diagnostics) =>
          requireRouteUser(diagnostics, supabase),
        ),
      ).rejects.toMatchObject({ data: { code }, init: { status } });
      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(status >= 500 ? 1 : 0);
    },
  );

  it("keeps missing projects silent", async () => {
    await expect(
      observeRouteLoad(args(), "project", async (diagnostics) => {
        diagnostics.fail("PROJECT_NOT_FOUND");
      }),
    ).rejects.toMatchObject({
      data: { code: "PROJECT_NOT_FOUND" },
      init: { status: 404 },
    });
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("reports uncaught server errors without messages or query strings", () => {
    const input = args();
    reportServerError(new Error("password=secret"), input.request);
    const record = JSON.parse(vi.mocked(console.error).mock.calls[0][0]);
    expect(record).toMatchObject({
      event: "dashboard_server_error",
      reference_id: getRequestReference(input.request),
    });
    expect(JSON.stringify(record)).not.toContain("secret");
  });
});
