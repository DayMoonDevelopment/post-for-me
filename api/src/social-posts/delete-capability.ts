import { DELETE_SUPPORTED_PROVIDERS } from './social-posts.constants';

/**
 * Extra OAuth scope a provider requires specifically to delete a published post
 * (beyond what publishing needs). Providers not listed here need no extra scope.
 */
const REQUIRED_DELETE_SCOPE: Record<string, string> = {
  instagram: 'instagram_manage_contents',
  threads: 'threads_delete',
};

export type DeleteSupport =
  | { supported: true }
  | { supported: false; reason: string };

/**
 * Determines whether a published post on a given connection can be deleted from
 * the platform, and if not, a human-readable reason (used for API errors and the
 * dashboard reconnect prompt). `grantedScopes` comes from
 * `social_provider_metadata.granted_scopes`, captured at connect time.
 */
export function evaluateDeleteSupport({
  provider,
  connectionType,
  grantedScopes,
}: {
  provider: string | null | undefined;
  connectionType?: string | null;
  grantedScopes?: string[] | null;
}): DeleteSupport {
  if (
    !provider ||
    !(DELETE_SUPPORTED_PROVIDERS as string[]).includes(provider)
  ) {
    return {
      supported: false,
      reason: `${provider ?? 'this platform'} does not support deleting published posts`,
    };
  }

  // Instagram deletion is only available for accounts connected with "Login with
  // Facebook"; the Instagram Login API cannot delete media at all.
  if (provider === 'instagram' && connectionType === 'instagram') {
    return {
      supported: false,
      reason:
        'instagram (reconnect with "Login with Facebook" to enable deletion)',
    };
  }

  const requiredScope = REQUIRED_DELETE_SCOPE[provider];
  if (requiredScope && !(grantedScopes ?? []).includes(requiredScope)) {
    return {
      supported: false,
      reason: `${provider} (reconnect the account to grant deletion permission)`,
    };
  }

  return { supported: true };
}

export function connectionSupportsDelete(args: {
  provider: string | null | undefined;
  connectionType?: string | null;
  grantedScopes?: string[] | null;
}): boolean {
  return evaluateDeleteSupport(args).supported;
}
