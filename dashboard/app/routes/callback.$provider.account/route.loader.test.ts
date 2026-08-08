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
  return new Request(`https://example.com/callback/facebook/account${query}`);
}

const supabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
};

function createSupabaseServiceRoleMock({
  oauthData,
  project,
}: {
  oauthData: Record<string, unknown>[];
  project: Record<string, unknown> | null;
}) {
  const from = vi.fn((table: string) => {
    if (table === "social_provider_connection_oauth_data") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select: vi.fn(() => chain),
        in: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        then: (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
          reject: (reason: unknown) => unknown
        ) =>
          Promise.resolve({ data: oauthData, error: null }).then(
            resolve,
            reject
          ),
      };
      return chain;
    }

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
  is_system: true,
  social_provider_app_credentials: [],
};

describe("callback.$provider.account loader (system project)", () => {
  beforeEach(() => {
    addSocialAccountConnectionsMock.mockReset();
  });

  it("surfaces the Facebook denial reason once the oauth state resolves the project", async () => {
    const request = buildRequest(
      "?error=access_denied&error_reason=user_denied&error_description=User%20denied%20the%20request&state=abc"
    );

    const result = (await loader({
      request,
      params: { provider: "facebook" },
      supabase,
      supabaseServiceRole: createSupabaseServiceRoleMock({
        oauthData: [
          { key: "project", project_id: "project-1", value: null },
        ],
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

  it("redirects to the project's callback URL with the denial reason when one is configured", async () => {
    const request = buildRequest(
      "?error=access_denied&error_reason=user_denied&error_description=User%20denied%20the%20request&state=abc"
    );

    const result = await loader({
      request,
      params: { provider: "facebook" },
      supabase,
      supabaseServiceRole: createSupabaseServiceRoleMock({
        oauthData: [
          { key: "project", project_id: "project-1", value: null },
        ],
        project: {
          ...baseProject,
          auth_callback_url: "https://customer.example.com/callback",
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(result).toBeInstanceOf(Response);
    const location = (result as Response).headers.get("Location");
    expect(location).toContain("https://customer.example.com/callback");
    expect(location).toContain("isSuccess=false");
    expect(addSocialAccountConnectionsMock).not.toHaveBeenCalled();
  });

  it("still returns 'Auth state not set' when no state is present, without querying the database", async () => {
    const request = buildRequest(
      "?error=access_denied&error_reason=user_denied"
    );

    const supabaseServiceRole = {
      from: vi.fn(() => {
        throw new Error("supabaseServiceRole should not be queried");
      }),
    };

    const result = (await loader({
      request,
      params: { provider: "facebook" },
      supabase,
      supabaseServiceRole,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as any;

    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe("Auth state not set");
    expect(addSocialAccountConnectionsMock).not.toHaveBeenCalled();
  });
});
