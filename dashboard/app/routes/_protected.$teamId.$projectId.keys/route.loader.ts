import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import { unkey } from "~/lib/.server/unkey";
import { UNKEY_API_ID } from "~/lib/.server/unkey.constants";

export const loader = withSupabase(async ({ supabase, params }) => {
  const { teamId, projectId } = params;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  try {
    const apiKeys = await unkey.apis.listKeys({
      apiId: UNKEY_API_ID,
      externalId: projectId,
      limit: 100,
      revalidateKeysCache: true,
    });

    return data({
      success: true,
      keys:
        apiKeys?.data
          ?.filter((key) => !key.start.includes("pfm_tmp"))
          ?.map((key) => ({
            id: key.keyId,
            name: key.name,
            start: key.start,
            createdAt: key.createdAt,
            enabled: key.enabled || false,
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ) || [],
    });
  } catch (error) {
    return data({
      success: false,
      error: (error as { message?: string })?.message,
      keys: [],
    });
  }
});
