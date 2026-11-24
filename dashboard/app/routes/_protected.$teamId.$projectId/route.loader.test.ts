import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/.server/supabase", () => ({
  withSupabase: (handler: unknown) => handler,
}));
import { loader } from "./route.loader";

function load(projectResult: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(projectResult),
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

describe("project loader", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("distinguishes a database failure from a missing/inaccessible project", async () => {
    await expect(
      load({ data: null, error: { code: "PGRST000" } }),
    ).rejects.toMatchObject({
      data: { code: "PROJECT_LOAD_FAILED" },
      init: { status: 503 },
    });
    await expect(load({ data: null, error: null })).rejects.toMatchObject({
      data: { code: "PROJECT_NOT_FOUND" },
      init: { status: 404 },
    });
  });

  it("preserves successful project data", async () => {
    const project = {
      id: "project",
      name: "Test",
      team_id: "team",
      is_system: false,
    };
    expect(await load({ data: project, error: null })).toMatchObject({
      data: { project },
    });
  });
});
