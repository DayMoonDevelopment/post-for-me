export function selectPostMedia<T extends { provider?: string | null; provider_connection_id?: string | null }>(
  media: T[], account: { id: string; provider: string }, platformConfigExists: boolean,
): T[] {
  const accountMedia = media.filter((medium) => medium.provider_connection_id === account.id);
  const platformMedia = media.filter((medium) => medium.provider === account.provider);
  return accountMedia.length ? accountMedia : platformConfigExists && platformMedia.length ? platformMedia
    : media.filter((medium) => !medium.provider && !medium.provider_connection_id);
}
