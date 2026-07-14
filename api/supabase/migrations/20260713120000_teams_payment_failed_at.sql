--
-- Track when a team's Stripe subscription first left a healthy state
-- (active/trialing) so a configurable grace period can be applied before
-- API access is revoked. NULL means healthy / no unresolved payment issue.
ALTER TABLE public.teams
  ADD COLUMN payment_failed_at timestamp with time zone NULL;

CREATE INDEX idx_teams_payment_failed_at ON public.teams(payment_failed_at)
  WHERE payment_failed_at IS NOT NULL;
