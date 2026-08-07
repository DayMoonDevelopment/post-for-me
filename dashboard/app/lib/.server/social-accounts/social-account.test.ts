import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SocialProviderConnection } from "./social-account.types";

const batchTriggerMock = vi.fn();
vi.mock("@trigger.dev/sdk", () => ({
  tasks: {
    batchTrigger: (...args: unknown[]) => batchTriggerMock(...args),
  },
}));

const getFacebookSocialProviderConnectionMock = vi.fn();
vi.mock("./providers/facebook.social-account", () => ({
  getFacebookSocialProviderConnection: (...args: unknown[]) =>
    getFacebookSocialProviderConnectionMock(...args),
}));

const getTikTokSocialProviderConnectionMock = vi.fn();
vi.mock("./providers/tiktok.social-account", () => ({
  getTikTokSocialProviderConnection: (...args: unknown[]) =>
    getTikTokSocialProviderConnectionMock(...args),
}));

import { addSocialAccountConnections } from "./social-account";

function connection(
  overrides: Partial<SocialProviderConnection>
): SocialProviderConnection {
  return {
    access_token: "new-token",
    refresh_token: "new-refresh",
    access_token_expires_at: new Date("2026-01-01"),
    refresh_token_expires_at: undefined,
    social_provider_user_id: "page-a",
    social_provider_user_name: "Page A",
    social_provider_photo_url: undefined,
    social_provider_metadata: undefined,
    ...overrides,
  };
}

function createSupabaseServiceRoleMock({
  staleConnections = [] as Record<string, unknown>[],
  insertedConnections = [] as Record<string, unknown>[],
}: {
  staleConnections?: Record<string, unknown>[];
  insertedConnections?: Record<string, unknown>[];
}) {
  const updateMock = vi.fn();
  const fromMock = vi.fn(() => {
    let mode: "select" | "update" | "upsert" | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: vi.fn(() => {
        if (mode !== "upsert") {
          mode = "select";
        }
        return chain;
      }),
      eq: vi.fn(() => chain),
      not: vi.fn(() => chain),
      update: vi.fn((payload: unknown) => {
        mode = "update";
        updateMock(payload);
        return chain;
      }),
      upsert: vi.fn(() => {
        mode = "upsert";
        return chain;
      }),
      in: vi.fn(() => chain),
      then: (
        resolve: (value: { data: unknown; error: unknown }) => unknown,
        reject: (reason: unknown) => unknown
      ) => {
        const result =
          mode === "select"
            ? { data: staleConnections, error: null }
            : mode === "update"
              ? { data: null, error: null }
              : { data: insertedConnections, error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    };

    return chain;
  });

  return { from: fromMock, updateMock } as unknown as Parameters<
    typeof addSocialAccountConnections
  >[0]["supabaseServiceRole"] & { updateMock: typeof updateMock };
}

describe("addSocialAccountConnections stale asset reconciliation", () => {
  beforeEach(() => {
    batchTriggerMock.mockReset();
    getFacebookSocialProviderConnectionMock.mockReset();
    getTikTokSocialProviderConnectionMock.mockReset();
  });

  it("disconnects a previously-granted Facebook Page missing from the new grant", async () => {
    getFacebookSocialProviderConnectionMock.mockResolvedValue([
      connection({ social_provider_user_id: "page-a" }),
    ]);

    const staleConnection = {
      id: "conn-page-b",
      provider: "facebook",
      social_provider_user_name: "Page B",
      social_provider_user_id: "page-b",
      social_provider_profile_photo_url: null,
      external_id: null,
      access_token_expires_at: null,
      refresh_token_expires_at: null,
      social_provider_metadata: null,
    };

    const supabaseServiceRole = createSupabaseServiceRoleMock({
      staleConnections: [staleConnection],
      insertedConnections: [{ id: "conn-page-a" }],
    });

    const result = await addSocialAccountConnections({
      projectId: "project-1",
      provider: "facebook",
      request: new Request("https://example.com/callback?code=abc"),
      supabaseServiceRole,
      isSystem: false,
      appCredentials: { appId: "app-id", appSecret: "app-secret" },
      externalId: undefined,
      redirectUrlOverride: undefined,
    });

    expect(result.successConnections).toEqual(["conn-page-a"]);
    expect(supabaseServiceRole.updateMock).toHaveBeenCalledWith({
      access_token: null,
      refresh_token: null,
    });

    expect(batchTriggerMock).toHaveBeenCalledWith(
      "process-webhooks",
      expect.arrayContaining([
        expect.objectContaining({
          payload: expect.objectContaining({
            eventType: "social.account.updated",
            eventData: expect.objectContaining({
              id: "conn-page-b",
              status: "disconnected",
              access_token: "",
              refresh_token: "",
            }),
          }),
        }),
      ])
    );
  });

  it("does not reconcile single-asset providers like tiktok", async () => {
    getTikTokSocialProviderConnectionMock.mockResolvedValue([
      connection({ social_provider_user_id: "tiktok-user" }),
    ]);

    const supabaseServiceRole = createSupabaseServiceRoleMock({
      insertedConnections: [{ id: "conn-tiktok" }],
    });

    await addSocialAccountConnections({
      projectId: "project-1",
      provider: "tiktok",
      request: new Request("https://example.com/callback?code=abc"),
      supabaseServiceRole,
      isSystem: false,
      appCredentials: { appId: "app-id", appSecret: "app-secret" },
      externalId: undefined,
      redirectUrlOverride: undefined,
    });

    expect(supabaseServiceRole.updateMock).not.toHaveBeenCalled();
  });
});
