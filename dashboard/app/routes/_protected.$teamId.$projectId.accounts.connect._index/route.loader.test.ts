import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/.server/supabase", () => ({
  withSupabase: (handler: unknown) => handler,
}));
import { loader } from "./route.loader";

function load(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn().mockResolvedValue(result),
  };
  return loader({
    request: new Request("https://example.com/team/project/accounts/connect"),
    params: { teamId: "team", projectId: "project" },
    supabaseServiceRole: { from: vi.fn(() => query) },
  } as never);
}

describe("connection options loader", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("does not disguise database errors as disabled providers", async () => {
    await expect(
      load({
        data: null,
        error: { code: "PGRST000", message: "app_secret=secret" },
      }),
    ).rejects.toMatchObject({
      data: { code: "CREDENTIALS_LOAD_FAILED" },
      init: { status: 503 },
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "secret",
    );
  });

  it("still supports an empty credentials result", async () => {
    const result = await load({ data: [], error: null });
    expect(
      result.providers.find((provider) => provider.id === "bluesky")?.enabled,
    ).toBe(true);
    expect(
      result.providers.filter((provider) => provider.enabled),
    ).toHaveLength(1);
  });

  it("returns provider availability without exposing credentials", async () => {
    const result = await load({
      data: [
        {
          provider: "instagram_w_facebook",
          app_id: "id",
          app_secret: "secret",
        },
      ],
      error: null,
    });
    expect(
      result.providers.find((provider) => provider.id === "instagram")?.enabled,
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
