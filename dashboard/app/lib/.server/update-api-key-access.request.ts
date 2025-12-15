import { unkey } from "~/lib/.server/unkey";
import { UNKEY_API_ID } from "~/lib/.server/unkey.constants";
import { stripe } from "~/lib/.server/stripe";
import { getSubscriptionPlanInfo } from "./get-subscription-plan-info";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@post-for-me/db";
import { customerHasSubscriptionSystemCredsAddon } from "./customer-has-subscription-system-creds-addon.request";

type UpdateAPIKeyAccessParams = {
  stripeCustomerId?: string;
  teamId?: string;
  enabled: boolean;
} & ({ stripeCustomerId: string } | { teamId: string });

export async function updateAPIKeyAccess(
  params: UpdateAPIKeyAccessParams,
  supabaseServiceRole: SupabaseClient<Database>,
) {
  console.log(
    `${params.enabled ? "Enabling" : "Disabling"} API keys for ${
      params.stripeCustomerId
        ? `customer ${params.stripeCustomerId}`
        : `team ${params.teamId}`
    }`,
  );

  let hasSystemCredentialsAddon = false;
  let stripeCustomerId: string | null = null;

  // Find the team either directly or via customer ID
  let team;
  if (params.stripeCustomerId) {
    const _team = await supabaseServiceRole
      .from("teams")
      .select("id, stripe_customer_id")
      .eq("stripe_customer_id", params.stripeCustomerId)
      .single();

    if (_team.error || !_team.data) {
      console.error(
        `Failed to find team for customer ${params.stripeCustomerId}:`,
        _team.error,
      );
      return;
    }
    team = _team.data;
    stripeCustomerId = _team.data.stripe_customer_id;

    hasSystemCredentialsAddon = await customerHasSubscriptionSystemCredsAddon(
      params.stripeCustomerId,
    );
  } else {
    const _team = await supabaseServiceRole
      .from("teams")
      .select("id, stripe_customer_id")
      .eq("id", params.teamId!)
      .single();

    if (_team.error || !_team.data) {
      console.error(`Failed to find team ${params.teamId}:`, _team.error);
      return;
    }
    team = _team.data;
    stripeCustomerId = _team.data.stripe_customer_id;
  }

  if (!team.id) {
    console.error(`Failed to find team`);
    return;
  }

  // Get plan info to add to metadata
  const planMetadata: Record<string, string> = {};
  if (stripeCustomerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const planInfo = getSubscriptionPlanInfo(subscriptions.data[0]);
        if (planInfo.productId) {
          planMetadata.plan_product_id = planInfo.productId;
        }
        if (planInfo.planName) {
          planMetadata.plan_name = planInfo.planName;
        }
        if (planInfo.postLimit) {
          planMetadata.plan_post_limit = planInfo.postLimit.toString();
        }
        planMetadata.plan_type = planInfo.isNewPricing
          ? "new_pricing"
          : planInfo.isLegacy
            ? "legacy"
            : "unknown";
      }
    } catch (error) {
      console.error("Error fetching plan info for API key metadata:", error);
      // Continue without plan metadata
    }
  }

  // Get all projects for the team
  const projects = await supabaseServiceRole
    .from("projects")
    .select("id, is_system")
    .eq("team_id", team.id);

  if (projects.error) {
    console.error(
      `Failed to find projects for team ${team.id}:`,
      projects.error,
    );
    return;
  }

  if (!projects.data || projects.data.length === 0) {
    console.log(
      `No projects found for team ${team.id}, skipping API key updates`,
    );
    return;
  }

  const systemProjects = projects.data.filter((sp) => sp.is_system);
  const clientProjects = projects.data.filter((sp) => !sp.is_system);

  // Process each project's API keys
  for (const project of clientProjects) {
    try {
      let cursor = undefined;
      let hasMore = true;

      while (hasMore) {
        // List all API keys for this project using project_id as external_id
        const apiKeys = await unkey.apis.listKeys({
          apiId: UNKEY_API_ID,
          externalId: project.id,
          limit: 100,
          cursor,
          revalidateKeysCache: true,
        });

        if (!apiKeys.data || !apiKeys.data.length) {
          console.error(
            `No additional API keys found for project ${project.id}`,
          );
          break;
        }

        // Process keys in batches of 10
        const batchSize = 10;
        const allKeys = apiKeys.data;
        const totalKeys = allKeys.length;

        for (let i = 0; i < totalKeys; i += batchSize) {
          const currentBatch = allKeys.slice(i, i + batchSize);
          const batchLength = currentBatch.length;

          const updatePromises = currentBatch.map((key) => {
            // Merge existing metadata with new plan metadata
            const updatedMeta = {
              ...key.meta,
              ...planMetadata,
            };

            return unkey.keys.updateKey({
              keyId: key.keyId,
              enabled: params.enabled,
              meta: updatedMeta,
            });
          });

          await Promise.all(updatePromises);
          console.log(
            `Updated batch of ${batchLength} keys for project ${project.id}`,
          );
        }

        cursor = apiKeys.pagination?.cursor;
        hasMore = apiKeys.pagination?.hasMore || false;
      }
    } catch (error) {
      console.error(`Error processing project ${project.id}:`, error);
    }
  }

  for (const project of systemProjects) {
    try {
      let cursor = undefined;
      let hasMore = true;

      while (hasMore) {
        // List all API keys for this project using project_id as external_id
        const apiKeys = await unkey.apis.listKeys({
          apiId: UNKEY_API_ID,
          externalId: project.id,
          limit: 100,
          cursor,
          revalidateKeysCache: true,
        });

        if (!apiKeys.data || !apiKeys.data.length) {
          console.error(
            `No additional API keys found for project ${project.id}`,
          );
          break;
        }

        // Process keys in batches of 10
        const batchSize = 10;
        const allKeys = apiKeys.data;
        const totalKeys = allKeys.length;

        for (let i = 0; i < totalKeys; i += batchSize) {
          const currentBatch = allKeys.slice(i, i + batchSize);
          const batchLength = currentBatch.length;

          const updatePromises = currentBatch.map((key) => {
            // Merge existing metadata with new plan metadata
            const updatedMeta = {
              ...key.meta,
              ...planMetadata,
            };

            return unkey.keys.updateKey({
              keyId: key.keyId,
              enabled: params.enabled && hasSystemCredentialsAddon,
              meta: updatedMeta,
            });
          });

          await Promise.all(updatePromises);
          console.log(
            `Updated batch of ${batchLength} keys for project ${project.id}`,
          );
        }

        cursor = apiKeys.pagination?.cursor;
        hasMore = apiKeys.pagination?.hasMore || false;
      }
    } catch (error) {
      console.error(`Error processing project ${project.id}:`, error);
    }
  }
}
