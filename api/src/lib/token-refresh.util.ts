import { differenceInDays } from 'date-fns';
import type { SocialAccount } from './dto/global.dto';

type RefreshableAccount = Pick<SocialAccount, 'provider'> & {
  social_provider_metadata: { connection_type?: string } | null;
  access_token_expires_at: Date | string | null;
};

export function shouldRefreshToken(
  account: RefreshableAccount,
  now = new Date(),
): boolean {
  const expiresAt = account.access_token_expires_at
    ? new Date(account.access_token_expires_at)
    : null;

  if (
    account.provider === 'x' &&
    account.social_provider_metadata?.connection_type === 'oauth2'
  ) {
    return !expiresAt || expiresAt.getTime() <= now.getTime() + 5 * 60 * 1000;
  }

  return (
    account.provider === 'youtube' ||
    account.provider === 'bluesky' ||
    differenceInDays(expiresAt || now, now) <= 7
  );
}
