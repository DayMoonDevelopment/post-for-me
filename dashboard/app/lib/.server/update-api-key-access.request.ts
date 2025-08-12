import { unkey } from "~/lib/.server/unkey";
import { UNKEY_API_ID } from "~/lib/.server/unkey.constants";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@post-for-me/db";

type UpdateAPIKeyAccessParams = {
  stripeCustomerId?: string;
  teamId?: string;
  enabled: boolean;
} & ({ stripeCustomerId: string } | { teamId: string });

export async function updateAPIKeyAccess(
  params: UpdateAPIKeyAccessParams,
  supabaseServiceRole: SupabaseClient<Database>
) {
  console.log(
    `${params.enabled ? "Enabling" : "Disabling"} API keys for ${
      params.stripeCustomerId
        ? `customer ${params.stripeCustomerId}`
        : `team ${params.teamId}`
    }`
  );

  let hasSystemCredentialsAddon = false;

  // Find the team either directly or via customer ID
  let team;
  if (params.stripeCustomerId) {
    const _team = await supabaseServiceRole
      .from("teams")
      .select("id, team_addons(addon, expires_at)")
      .eq("stripe_customer_id", params.stripeCustomerId)
      .single();

    if (_team.error || !_team.data) {
      console.error(
        `Failed to find team for customer ${params.stripeCustomerId}:`,
        _team.error
      );
      return;
    }
    team = _team.data;

    const systemAddon = _team.data.team_addons?.filter(
      (t) => t.addon === "managed_system_credentials"
    )?.[0];

    hasSystemCredentialsAddon = !systemAddon
      ? false
      : new Date() < new Date(systemAddon.expires_at);
  } else {
    team = { id: params.teamId };
  }

  if (!team.id) {
    console.error(`Failed to find team for ${params.stripeCustomerId}`);
    return;
  }

  // Get all projects for the team
  const projects = await supabaseServiceRole
    .from("projects")
    .select("id, is_system")
    .eq("team_id", team.id);

  if (projects.error) {
    console.error(
      `Failed to find projects for team ${team.id}:`,
      projects.error
    );
    return;
  }

  if (!projects.data || projects.data.length === 0) {
    console.log(
      `No projects found for team ${team.id}, skipping API key updates`
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

        if (apiKeys.error) {
          console.error(`Failed to list keys for project ${project.id}`, {
            projectId: project.id,
            cursor,
          });
          break;
        }

        if (!apiKeys.result || !apiKeys.result.keys.length) {
          console.error(
            `No additional API keys found for project ${project.id}`
          );
          break;
        }

        // Process keys in batches of 10
        const batchSize = 10;
        const allKeys = apiKeys.result.keys;
        const totalKeys = allKeys.length;

        for (let i = 0; i < totalKeys; i += batchSize) {
          const currentBatch = allKeys.slice(i, i + batchSize);
          const batchLength = currentBatch.length;

          const updatePromises = currentBatch.map((key) =>
            unkey.keys.update({
              keyId: key.id,
              enabled: params.enabled,
            })
          );

          await Promise.all(updatePromises);
          console.log(
            `Updated batch of ${batchLength} keys for project ${project.id}`
          );
        }

        cursor = apiKeys.result.cursor;
        hasMore = cursor !== null && cursor !== undefined;
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

        if (apiKeys.error) {
          console.error(`Failed to list keys for project ${project.id}`, {
            projectId: project.id,
            cursor,
          });
          break;
        }

        if (!apiKeys.result || !apiKeys.result.keys.length) {
          console.error(
            `No additional API keys found for project ${project.id}`
          );
          break;
        }

        // Process keys in batches of 10
        const batchSize = 10;
        const allKeys = apiKeys.result.keys;
        const totalKeys = allKeys.length;

        for (let i = 0; i < totalKeys; i += batchSize) {
          const currentBatch = allKeys.slice(i, i + batchSize);
          const batchLength = currentBatch.length;

          const updatePromises = currentBatch.map((key) =>
            unkey.keys.update({
              keyId: key.id,
              enabled: params.enabled && hasSystemCredentialsAddon,
            })
          );

          await Promise.all(updatePromises);
          console.log(
            `Updated batch of ${batchLength} keys for project ${project.id}`
          );
        }

        cursor = apiKeys.result.cursor;
        hasMore = cursor !== null && cursor !== undefined;
      }
    } catch (error) {
      console.error(`Error processing project ${project.id}:`, error);
    }
  }
}
