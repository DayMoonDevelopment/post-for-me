import {
  createCookie,
  type ActionFunctionArgs,
  type Cookie,
  type LoaderFunctionArgs,
  data,
} from "react-router";
import { TMP_API_KEY_COOKIE_PREFIX } from "./api.constants";
import { unkey } from "../unkey";
import { RATE_LIMITS, UNKEY_API_ID } from "../unkey.constants";
import type { SupabaseContext } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/.server/database.types";
import { resolveSubscriptionEntitlement } from "../resolve-subscription-entitlement.request";
import { planMetadataFromPlanInfo } from "../get-subscription-plan-info";

interface DashboardKeyContext {
  apiKey: string | null;
}

interface DashboardApiKeyResponse {
  apiKey: string | null;
  error?: string;
  cookie?: Cookie;
}

async function getTemporaryApiKey(
  teamId: string,
  projectId: string,
  cookieHeader: string,
  supabase: SupabaseClient<Database>,
): Promise<DashboardApiKeyResponse> {
  const cookieName = `${TMP_API_KEY_COOKIE_PREFIX}_${projectId}`;
  const apiKeyCookie = createCookie(cookieName);

  const apiKeySession = (await apiKeyCookie.parse(cookieHeader)) || {};

  if (apiKeySession && apiKeySession.apiKey) {
    return { apiKey: apiKeySession.apiKey };
  }

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  const team = await supabase
    .from("teams")
    .select("stripe_customer_id")
    .eq("id", teamId)
    .single();

  if (!team.data) {
    return { apiKey: null, error: "no team found" };
  }

  // Same verdict enforcement acts on, so the dashboard stays usable for exactly
  // the teams whose API keys still work. A `status: "active"` check locked
  // trialing teams and teams inside their payment grace window out of their own
  // dashboard while their keys kept serving traffic.
  const entitlement = await resolveSubscriptionEntitlement(
    team.data.stripe_customer_id,
  );

  if (entitlement.verdict === "immediate_revoke") {
    return { apiKey: null, error: "no active subscription" };
  }

  const planMetadata = planMetadataFromPlanInfo(entitlement.planInfo);

  let key: string | null = null;
  try {
    const apiKey = await unkey.keys.createKey({
      apiId: UNKEY_API_ID,
      prefix: "pfm_tmp",
      name: "TMP API Key",
      externalId: projectId,
      meta: {
        project_id: projectId,
        team_id: teamId,
        created_by: currentUser.data.user.id,
        ...planMetadata,
      },
      enabled: true,
      recoverable: false,
      expires: Date.now() + 24 * 60 * 60 * 1000,
      ratelimits: RATE_LIMITS,
    });

    key = apiKey.data.key;
  } catch (error) {
    return { apiKey: null, error: (error as { message?: string })?.message };
  }

  const newSession = createCookie(cookieName, {
    // One hour, matching the reconcile sweep's cadence. This cookie short-
    // circuits the entitlement check above on a hit, so its lifetime *is* the
    // window in which the dashboard can disagree with enforcement. At the
    // previous 23 hours, a team that churned saw a working-looking dashboard
    // fail with a generic API error for most of a day instead of a billing
    // prompt — exactly when we most want to convert them back. Minting a
    // replacement is cheap, and unkey-tmp-key-cleanup reaps the expired ones.
    maxAge: 60 * 60,
    httpOnly: true,
  });

  return {
    apiKey: key,
    cookie: newSession,
  };
} /**
 * Creates a `loader` or `action` function that automatically injects a temporary API key.
 *
 * @example Inline definition of a loader function
 * const loader = withDashboardKey(async function({ apiKey }) {
 *     return {};
 * });
 *
 * @example Using a named action function
 * function myAction({ apiKey }) { ... }
 *
 * export const action = withDashboardKey(myAction);
 *
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function withDashboardKey<
  THandler extends (
    args: (LoaderFunctionArgs | ActionFunctionArgs) &
      DashboardKeyContext &
      SupabaseContext,
  ) => any,
>(
  handler: THandler,
): THandler extends (args: any) => infer R
  ? (args: (LoaderFunctionArgs | ActionFunctionArgs) & SupabaseContext) => R
  : never {
  return async function (
    args: (LoaderFunctionArgs | ActionFunctionArgs) & SupabaseContext,
  ) {
    const { params, supabase } = args;

    const { teamId, projectId } = params;

    if (!teamId) {
      throw new Error("Team code is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const apiKeyResult = await getTemporaryApiKey(
      teamId,
      projectId,
      args.request.headers.get("cookie") || "",
      supabase,
    );

    const res = await handler({ ...args, apiKey: apiKeyResult.apiKey });

    const dataResponse = res as {
      type: string;
      data: any;
      init: { headers: unknown };
    };

    if (apiKeyResult.cookie) {
      const serialized = await apiKeyResult.cookie.serialize({
        apiKey: apiKeyResult.apiKey,
      });

      if (dataResponse?.type == "DataWithResponseInit") {
        return data(dataResponse.data, {
          headers: {
            "Set-Cookie": serialized,
          },
        });
      } else if (res instanceof Response) {
        res.headers.append("Set-Cookie", serialized);
      }
    }

    if (args.request.method !== "GET" && !res) {
      throw new Error("Action must return a response");
    }

    return res;
  } as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
