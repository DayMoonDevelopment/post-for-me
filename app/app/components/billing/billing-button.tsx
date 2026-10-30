import type * as React from "react";

import { useTranslation } from "react-i18next";
import { useFetcher, useLocation } from "react-router";

import { useOptionalSetupContext } from "~/components/setup-context";
import { Button } from "~/ui/button";
import { Spinner } from "~/ui/spinner";

/**
 * The reusable "set up billing" control. Posts to `redirect/teams/:teamId/checkout`
 * via a fetcher so the button shows a spinner while Stripe resolves the URL, then
 * the action 302s to Stripe. `disabled` while pending blocks double-submits (no
 * duplicate Checkout sessions). Degrades to a plain form POST without JS.
 *
 * `teamId` comes from the prop, or the launchpad `SetupContext` when omitted —
 * so the same button works in the guided tour, the checklist, and the onboarding
 * hand-off.
 */
export function BillingButton({
  teamId: teamIdProp,
  volume,
  price,
  size = "default",
  variant = "default",
  children,
}: {
  children?: React.ReactNode;
  /** The chosen tier's Stripe price id (from the plan picker). */
  price?: string | null;
  size?: React.ComponentProps<typeof Button>["size"];
  teamId?: string | null;
  variant?: React.ComponentProps<typeof Button>["variant"];
  /** Expected monthly volume (from onboarding) to pre-pick the tier. */
  volume?: string | number | null;
}) {
  const { t } = useTranslation();
  const ctx = useOptionalSetupContext();
  const teamId = teamIdProp ?? ctx?.teamId ?? null;
  const location = useLocation();
  const fetcher = useFetcher();
  const pending = fetcher.state !== "idle";

  const label = children ?? t("setup.billing.cta");

  // No team resolved yet (e.g. used outside any team context) → inert button.
  if (!teamId) {
    return (
      <Button size={size} variant={variant} disabled>
        {label}
      </Button>
    );
  }

  return (
    <fetcher.Form method="post" action={`/redirect/teams/${teamId}/checkout`}>
      {/* So a failed checkout flashes the error back to THIS page. */}
      <input
        type="hidden"
        name="return_to"
        value={location.pathname + location.search}
      />
      {volume != null ? (
        <input type="hidden" name="volume" value={String(volume)} />
      ) : null}
      {price ? <input type="hidden" name="price" value={price} /> : null}
      <Button type="submit" size={size} variant={variant} disabled={pending}>
        {pending ? <Spinner /> : null}
        {label}
      </Button>
    </fetcher.Form>
  );
}
