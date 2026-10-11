import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/.server/supabase", () => ({
  withSupabase: (handler: unknown) => handler,
}));

const addSocialAccountConnectionsMock = vi.fn();
vi.mock("~/lib/.server/social-accounts/social-account", () => ({
  addSocialAccountConnections: (...args: unknown[]) =>
    addSocialAccountConnectionsMock(...args),
}));

import { loader } from "./route.loader";

function buildRequest(query: string) {
  return new Request(
    `https://example.com/callback/project-1/facebook/account${query}`
  );
}

const supabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
};

function createSupabaseServiceRoleMock({
  project,
}: {
  project: Record<string, unknown> | null;
}) {
  const from = vi.fn((table: string) => {
    if (table === "projects") {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: project, error: null }),
      };
      return chain;
    }

    throw new Error(`Unexpected table queried: ${table}`);
  });

  return { from };
}

const baseProject = {
  auth_callback_url: null,
  team_id: "team-1",
  is_system: false,
  social_provider_app_credentials: [],
};

describe("callback.$projectId.$provider.account loader", () => {
  beforeEach(() => {
    addSocialAccountConnectionsMock.mockReset();
  });

  it("surfaces the Facebook denial reason without exchanging a code", async () => {
    const request = buildRequest(
      "?error=access_denied&error_reason=user_denied&error_description=User%20denied%20the%20request&state=abc"
    );

    const result = (await loader({
      request,
      params: { projectId: "project-1", provider: "facebook" },
      supabase,
      supabaseServiceRole: createSupabaseServiceRoleMock({
        project: baseProject,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as any;

    expect(result.isSuccess).toBe(false);
    expect(result.provider).toBe("facebook");
    expect(result.projectId).toBe("project-1");
    expect(result.teamId).toBe("team-1");
    expect(result.error).toContain("User denied the request");
    expect(addSocialAccountConnectionsMock).not.toHaveBeenCalled();
  });

  it("falls back to error_reason when no description is present", async () => {
    const request = buildRequest(
      "?error=access_denied&error_reason=user_denied&state=abc"
    );

    const result = (await loader({
      request,
      params: { projectId: "project-1", provider: "facebook" },
      supabase,
      supabaseServiceRole: createSupabaseServiceRoleMock({
        project: baseProject,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as any;

    expect(result.isSuccess).toBe(false);
    expect(result.error).toContain("user_denied");
    expect(addSocialAccountConnectionsMock).not.toHaveBeenCalled();
  });

  it("redirects to the project's callback URL with the denial reason when one is configured", async () => {
    const request = buildRequest(
      "?error=access_denied&error_reason=user_denied&error_description=User%20denied%20the%20request&state=abc"
    );

    const result = await loader({
      request,
      params: { projectId: "project-1", provider: "facebook" },
      supabase,
      supabaseServiceRole: createSupabaseServiceRoleMock({
        project: {
          ...baseProject,
          auth_callback_url: "https://customer.example.com/callback",
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // react-router's redirect() returns a Response
    expect(result).toBeInstanceOf(Response);
    const location = (result as Response).headers.get("Location");
    expect(location).toContain("https://customer.example.com/callback");
    expect(location).toContain("isSuccess=false");
    expect(location).toContain("User+denied+the+request");
    expect(addSocialAccountConnectionsMock).not.toHaveBeenCalled();
  });
});
