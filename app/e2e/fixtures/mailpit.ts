const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

interface MailpitSearchResult {
  messages: { Created: string; ID: string }[];
}

interface MailpitMessage {
  HTML: string;
  Text: string;
}

/**
 * Polls the local Supabase mail-testing server (started by `supabase start`
 * from `api/`; still configured under the `[inbucket]` key in
 * api/supabase/config.toml even though the CLI now bundles Mailpit, not
 * Inbucket, as the actual server) for the most recent email sent to `email`,
 * and extracts a 6-digit OTP from it.
 *
 * Mailpit is a single global inbox (unlike Inbucket's per-recipient
 * mailboxes), so messages are found via its search API instead of a
 * mailbox-name route. See https://mailpit.axllent.org/docs/api-v1/.
 */
export async function fetchLatestOtp(
  email: string,
  {
    // Local SMTP delivery can be slow on a cold container — generous by
    // design.
    timeoutMs = 45_000,
    pollIntervalMs = 500,
  }: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastMessageCount = 0;

  while (Date.now() < deadline) {
    const searchRes = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    if (searchRes.ok) {
      const result = (await searchRes.json()) as MailpitSearchResult;
      lastMessageCount = result.messages.length;
      if (result.messages.length > 0) {
        const latest = result.messages.reduce((newest, message) =>
          new Date(message.Created) > new Date(newest.Created)
            ? message
            : newest,
        );
        const messageRes = await fetch(
          `${MAILPIT_URL}/api/v1/message/${latest.ID}`,
        );
        if (messageRes.ok) {
          const full = (await messageRes.json()) as MailpitMessage;
          const match = (full.Text || full.HTML).match(/\b\d{6}\b/);
          if (match) return match[0];
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `no OTP email arrived for ${email} within ${timeoutMs}ms (search found ` +
      `${lastMessageCount} message(s) — check Mailpit at ${MAILPIT_URL})`,
  );
}

/** Deletes only this address's messages, so a re-run doesn't read a stale
 * code — and so it doesn't touch anyone else's mail in Mailpit's shared,
 * global inbox. */
export async function clearMailbox(email: string): Promise<void> {
  const searchRes = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  ).catch(() => null);
  if (!searchRes?.ok) return;

  const result = (await searchRes.json()) as MailpitSearchResult;
  if (result.messages.length === 0) return;

  await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: result.messages.map((message) => message.ID) }),
  }).catch(() => {
    // Best-effort — a failed cleanup here isn't worth failing the test over.
  });
}
