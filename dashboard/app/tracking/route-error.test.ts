import { afterEach, describe, expect, it, vi } from "vitest";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { capture } }));
import { reportRouteError } from "./route-error";

describe("browser route error reporting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    capture.mockReset();
  });

  it("sends a safe diagnostic with both groups and a support reference", async () => {
    vi.stubGlobal("window", {
      location: { origin: "https://app.postforme.dev" },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await reportRouteError({
      error: new Error("secret"),
      code: "UNEXPECTED_ERROR",
      referenceId: "ref",
      pathname: "/team/project/accounts",
      teamId: "team",
      projectId: "project",
    });
    expect(capture).toHaveBeenCalledWith(
      "dashboard_route_error_shown",
      expect.objectContaining({
        reference_id: "ref",
        $groups: { team: "team", project: "project" },
        $current_url: "https://app.postforme.dev/team/project/accounts",
      }),
    );
    expect(JSON.stringify(capture.mock.calls)).not.toContain("secret");
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it.each([
    "SESSION_EXPIRED",
    "PROJECT_NOT_FOUND",
    "ACCOUNTS_LOAD_FAILED",
  ] as const)(
    "does not repeat classified %s errors in the browser console",
    async (code) => {
      vi.stubGlobal("window", {
        location: { origin: "https://app.postforme.dev" },
      });
      vi.spyOn(console, "error").mockImplementation(() => {});
      await reportRouteError({
        error: {},
        code,
        referenceId: "ref",
        pathname: "/team/project/accounts",
      });
      expect(console.error).not.toHaveBeenCalled();
      expect(capture).toHaveBeenCalledTimes(1);
    },
  );

  it("does not break the fallback when analytics fails", async () => {
    vi.stubGlobal("window", {
      location: { origin: "https://app.postforme.dev" },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    capture.mockImplementation(() => {
      throw new Error("blocked");
    });
    await expect(
      reportRouteError({
        error: new Error("failed"),
        code: "UNEXPECTED_ERROR",
        referenceId: "ref",
        pathname: "/team/project/accounts",
      }),
    ).resolves.toBeUndefined();
  });
});
