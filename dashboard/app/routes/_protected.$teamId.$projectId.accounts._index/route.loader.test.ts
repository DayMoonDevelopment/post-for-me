import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/.server/supabase", () => ({
  withSupabase: (handler: unknown) => handler,
}));
import { loader } from "./route.loader";

function load(result: { data: unknown; error: unknown; count: number | null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn().mockResolvedValue(result),
  };
  return loader({
    request: new Request("https://example.com/team/project/accounts"),
    params: { teamId: "team", projectId: "project" },
    supabase: {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user" } }, error: null }),
      },
      from: vi.fn(() => query),
    },
  } as never);
}

describe("accounts loader", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("does not present query failures as an empty accounts list", async () => {
    await expect(
      load({
        data: null,
        error: { code: "PGRST000", message: "secret" },
        count: null,
      }),
    ).rejects.toMatchObject({
      data: { code: "ACCOUNTS_LOAD_FAILED" },
      init: { status: 503 },
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "secret",
    );
  });

  it("preserves genuinely empty results", async () => {
    expect(await load({ data: [], error: null, count: 0 })).toMatchObject({
      data: {
        success: true,
        connections: [],
        totalCount: 0,
        totalPages: 0,
      },
    });
  });
});
