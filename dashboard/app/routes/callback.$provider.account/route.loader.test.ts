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

const supabaseServiceRole = {
  from: vi.fn(() => {
    throw new Error("supabaseServiceRole should not be queried");
  }),
};

describe("callback.$provider.account loader (system project)", () => {
  beforeEach(() => {
    addSocialAccountConnectionsMock.mockReset();
  });

  it("surfaces the Facebook denial reason before looking up oauth state", async () => {
    const request = buildRequest(
      "?error=access_denied&error_reason=user_denied&error_description=User%20denied%20the%20request&state=abc"
    );

    const result = (await loader({
      request,
      params: { provider: "facebook" },
      supabase,
      supabaseServiceRole,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as any;

    expect(result.isSuccess).toBe(false);
    expect(result.provider).toBe("facebook");
    expect(result.error).toContain("User denied the request");
    expect(addSocialAccountConnectionsMock).not.toHaveBeenCalled();
  });
});
