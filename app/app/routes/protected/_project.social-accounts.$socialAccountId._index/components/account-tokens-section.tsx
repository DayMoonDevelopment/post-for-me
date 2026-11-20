import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { SocialAccountTokenMeta } from "~/lib/types/social-account";

import { CopyIcon, EyeIcon, EyeOffIcon } from "~/icons";
import { Button } from "~/ui/button";
import { ButtonGroup } from "~/ui/button-group";
import { useCopyToClipboard } from "~/ui/copyable";
import { Separator } from "~/ui/separator";
import { toast } from "~/ui/sonner";
import { Spinner } from "~/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

import { formatDateTime } from "../utils";
import { DetailCard } from "./detail-card";

type TokenField = "accessToken" | "refreshToken";

const MASK = "•".repeat(16);

/**
 * Fetch the account's token values from the dedicated, auth-guarded resource
 * route and return the requested one. The token strings exist ONLY for the life
 * of this call — the caller either stores the returned value in local state (to
 * render it) or copies-and-discards it; they are never in the page's loader data
 * or document. A bare `fetch` (no options) is a GET; the route returns raw JSON
 * with `Cache-Control: no-store`.
 */
async function fetchToken(
  socialAccountId: string,
  field: TokenField,
): Promise<string | null> {
  const response = await fetch(
    `/api/social-accounts/${socialAccountId}/tokens`,
  );
  if (!response.ok) throw new Error("Failed to fetch token");
  const data = (await response.json()) as {
    accessToken: string | null;
    refreshToken: string | null;
  };
  return data[field];
}

/**
 * One token, laid out as two labelled rows:
 *
 *   <name>   <masked/shown value>   [show] [copy]   ← a ButtonGroup
 *   Expires  <date>
 *
 * The value is never present client-side until an explicit reveal; the expiry
 * date always shows (from the loader's non-secret meta — no fetch). Reveal/copy
 * only appear when the token exists.
 *
 * - Reveal → fetch → local state → render. Hide → clear state (value gone).
 * - Copy when revealed → in-memory value, NO network. Copy when hidden → fetch
 *   into a local const → clipboard → discard (stays masked, no trace).
 */
function TokenRow({
  socialAccountId,
  field,
  label,
  showLabel,
  hideLabel,
  copyLabel,
  copiedMessage,
  present,
  expiresAt,
}: {
  copiedMessage: string;
  copyLabel: string;
  expiresAt: string | null;
  field: TokenField;
  hideLabel: string;
  label: string;
  present: boolean;
  showLabel: string;
  socialAccountId: string;
}) {
  const { i18n, t } = useTranslation();
  const { copy } = useCopyToClipboard();
  // The revealed value lives ONLY here, and only while shown. `null` = hidden.
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleReveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setBusy(true);
    try {
      const value = await fetchToken(socialAccountId, field);
      setRevealed(value ?? "");
    } catch {
      toast.error(t("socialAccounts.errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    // Revealed → copy the in-memory value, NO network round-trip.
    if (revealed !== null) {
      await copy(revealed);
      toast.success(copiedMessage);
      return;
    }
    // Hidden → fetch into a local const, copy it, and let it fall out of scope.
    setBusy(true);
    try {
      const value = await fetchToken(socialAccountId, field);
      if (value) {
        await copy(value);
        toast.success(copiedMessage);
      }
    } catch {
      toast.error(t("socialAccounts.errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  const expires = formatDateTime(expiresAt, i18n.language);
  const revealGlyph = busy ? (
    <Spinner />
  ) : revealed !== null ? (
    <EyeOffIcon />
  ) : (
    <EyeIcon />
  );

  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
      {/* Value row: <name> <value> [show][copy] */}
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-sm text-foreground">
        {present ? (
          revealed !== null ? (
            revealed
          ) : (
            MASK
          )
        ) : (
          <span className="font-sans text-muted-foreground">
            {t("socialAccounts.detail.noToken")}
          </span>
        )}
      </dd>
      {present ? (
        <ButtonGroup className="justify-self-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label={revealed !== null ? hideLabel : showLabel}
                  disabled={busy}
                  onClick={toggleReveal}
                >
                  {revealGlyph}
                </Button>
              }
            />
            <TooltipContent>
              {revealed !== null ? hideLabel : showLabel}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label={copyLabel}
                  disabled={busy}
                  onClick={handleCopy}
                >
                  <CopyIcon />
                </Button>
              }
            />
            <TooltipContent>{copyLabel}</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      ) : (
        <span aria-hidden />
      )}

      {/* Expiry row: always visible, no fetch. */}
      <dt className="text-xs font-medium text-muted-foreground">
        {t("socialAccounts.detail.expiresLabel")}
      </dt>
      <dd className="col-span-2 text-sm text-foreground">
        {expires ?? t("socialAccounts.detail.noExpiry")}
      </dd>
    </div>
  );
}

/**
 * The tokens card: access + refresh tokens, each masked with an opt-in
 * reveal/copy (ButtonGroup) and an always-visible expiry from the loader's
 * non-secret meta. The token VALUES are fetched on demand (never in the loader).
 */
export function AccountTokensSection({
  socialAccountId,
  tokenMeta,
}: {
  socialAccountId: string;
  tokenMeta: SocialAccountTokenMeta;
}) {
  const { t } = useTranslation();

  return (
    <DetailCard
      title={t("socialAccounts.detail.tokensTitle")}
      description={t("socialAccounts.detail.tokensDescription")}
    >
      <dl className="flex flex-col gap-4">
        <TokenRow
          socialAccountId={socialAccountId}
          field="accessToken"
          label={t("socialAccounts.detail.accessToken")}
          showLabel={t("common.show")}
          hideLabel={t("common.hide")}
          copyLabel={t("socialAccounts.detail.copyAccessToken")}
          copiedMessage={t("socialAccounts.detail.copiedAccessToken")}
          present={tokenMeta.hasAccessToken}
          expiresAt={tokenMeta.accessTokenExpiresAt}
        />
        <Separator />
        <TokenRow
          socialAccountId={socialAccountId}
          field="refreshToken"
          label={t("socialAccounts.detail.refreshToken")}
          showLabel={t("common.show")}
          hideLabel={t("common.hide")}
          copyLabel={t("socialAccounts.detail.copyRefreshToken")}
          copiedMessage={t("socialAccounts.detail.copiedRefreshToken")}
          present={tokenMeta.hasRefreshToken}
          expiresAt={tokenMeta.refreshTokenExpiresAt}
        />
      </dl>
    </DetailCard>
  );
}
