--
-- Track when the hourly subscription-access sweep
-- (trigger/reconcile-subscription-access.ts) last converged a team against
-- live Stripe. NULL means never reconciled.
--
-- The sweep orders by this column, oldest first, and stamps each team as it
-- finishes with it. That makes the ordering a resume cursor: a run cut short by
-- its time budget picks up next hour with the teams it never reached, instead
-- of restarting from the first team every hour and starving the tail forever.
ALTER TABLE public.teams
  ADD COLUMN subscription_reconciled_at timestamp with time zone NULL;

CREATE INDEX idx_teams_subscription_reconciled_at
  ON public.teams (subscription_reconciled_at ASC NULLS FIRST, id ASC)
  WHERE stripe_customer_id IS NOT NULL;
