// Vendored copy of api/src/social-posts/delete-capability.ts (dumb-monorepo: no
// cross-sibling imports). Keep the two in sync. Used to stamp `delete_supported`
// on webhook `social_accounts` so the webhook payload matches the API response.

const DELETE_SUPPORTED_PROVIDERS = [
  "x",
  "instagram",
  "facebook",
  "linkedin",
  "bluesky",
  "threads",
  "pinterest",
  "youtube",
];

const REQUIRED_DELETE_SCOPE: Record<string, string> = {
  instagram: "instagram_manage_contents",
  threads: "threads_delete",
};

export function connectionSupportsDelete({
  provider,
  connectionType,
  grantedScopes,
}: {
  provider: string | null | undefined;
  connectionType?: string | null;
  grantedScopes?: string[] | null;
}): boolean {
  if (!provider || !DELETE_SUPPORTED_PROVIDERS.includes(provider)) {
    return false;
  }

  if (provider === "instagram" && connectionType === "instagram") {
    return false;
  }

  const requiredScope = REQUIRED_DELETE_SCOPE[provider];
  if (requiredScope && !(grantedScopes ?? []).includes(requiredScope)) {
    return false;
  }

  return true;
}
