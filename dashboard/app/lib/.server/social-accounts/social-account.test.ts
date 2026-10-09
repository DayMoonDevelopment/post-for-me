import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SocialProviderConnection } from "./social-account.types";

const batchTriggerMock = vi.fn();
vi.mock("@trigger.dev/sdk", () => ({
  tasks: { batchTrigger: (...args: unknown[]) => batchTriggerMock(...args) },
}));

const getFacebookSocialProviderConnectionMock = vi.fn();
vi.mock("./providers/facebook.social-account", () => ({
  getFacebookSocialProviderConnection: (...args: unknown[]) =>
    getFacebookSocialProviderConnectionMock(...args),
}));
vi.mock("./providers/instagram-w-facebook.social-account", () => ({
  getInstagramWFacebookSocialProviderConnection: (...args: unknown[]) =>
    getFacebookSocialProviderConnectionMock(...args),
}));

import { addSocialAccountConnections } from "./social-account";

describe("addSocialAccountConnections", () => {
  beforeEach(() => {
    batchTriggerMock.mockReset();
    getFacebookSocialProviderConnectionMock.mockReset();
  });

  it.each(["facebook", "instagram_w_facebook"])(
    "does not disconnect omitted assets for %s and preserves external-ID protection",
    async (provider) => {
      const connections: SocialProviderConnection[] = ["page-a", "page-b"].map(
        (id) => ({
          access_token: "new-token",
          access_token_expires_at: new Date("2026-01-01"),
          social_provider_user_id: id,
          social_provider_user_name: id,
          social_provider_metadata: { facebook_user_id: "fb-user-1" },
        }),
      );
      getFacebookSocialProviderConnectionMock.mockResolvedValue(connections);

      const validationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [{ id: "conn-page-b", social_provider_user_id: "page-b" }],
          error: null,
        }),
      };
      const insertQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: "conn-page-a", access_token: "new-token" }],
          error: null,
        }),
      };
      const fromMock = vi
        .fn()
        .mockReturnValueOnce(validationQuery)
        .mockReturnValueOnce(insertQuery);

      const result = await addSocialAccountConnections({
        projectId: "project-1",
        provider,
        request: new Request("https://example.com/callback?code=abc"),
        supabaseServiceRole: { from: fromMock } as unknown as Parameters<
          typeof addSocialAccountConnections
        >[0]["supabaseServiceRole"],
        isSystem: false,
        appCredentials: { appId: "app-id", appSecret: "app-secret" },
        externalId: "customer-a",
        redirectUrlOverride: undefined,
      });

      expect(validationQuery.eq).toHaveBeenCalledWith("project_id", "project-1");
      expect(validationQuery.eq).toHaveBeenCalledWith(
        "provider",
        provider === "facebook" ? "facebook" : "instagram",
      );
      expect(validationQuery.not).toHaveBeenCalledWith("access_token", "is", null);
      expect(validationQuery.not).toHaveBeenCalledWith("external_id", "is", null);
      expect(validationQuery.neq).toHaveBeenCalledWith("external_id", "customer-a");
      expect(insertQuery.upsert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            social_provider_user_id: "page-a",
            external_id: "customer-a",
          }),
        ],
        { onConflict: "provider,project_id,social_provider_user_id" },
      );
      expect(result).toEqual({
        successConnections: ["conn-page-a"],
        failedConnections: ["conn-page-b"],
        errors: ["External Id already exists for account conn-page-b"],
      });
      // No stale-asset lookup or token-clearing update after the upsert.
      expect(fromMock).toHaveBeenCalledTimes(2);
      expect(batchTriggerMock).toHaveBeenCalledTimes(1);
      expect(batchTriggerMock).toHaveBeenCalledWith("process-webhooks", [
        expect.objectContaining({
          payload: expect.objectContaining({ eventType: "social.account.created" }),
        }),
      ]);
    },
  );
});
