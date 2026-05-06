------------------------------- SUBSCRIPTION SCHEDULES ------------
-- Mirrors Stripe subscription schedules. We need these locally so the
-- excess-use report can answer "is this team's upgrade scheduled, and to
-- what plan?" without a live Stripe round-trip per row.
--
-- `phases` lives inside `data jsonb` only — phases are small (typically
-- 2 entries: current and next), and the report walks them in app code.
-- If we ever need to filter/index on phase contents we can promote a
-- separate stripe.subscription_schedule_phases table later.
create table stripe.subscription_schedules (
  id                       text primary key,
  -- See note in stripe.prices: mirror tables intentionally have no FKs
  -- to the rest of the stripe schema. We index for joins instead.
  customer_id              text,
  subscription_id          text,
  status                   text,
  end_behavior             text,
  current_phase_start      timestamptz,
  current_phase_end        timestamptz,
  released_at              timestamptz,
  canceled_at              timestamptz,
  completed_at             timestamptz,
  released_subscription_id text,
  metadata                 jsonb,
  stripe_created           timestamptz,
  livemode                 boolean,
  data                     jsonb not null,
  synced_at                timestamptz not null default now()
);

create index stripe_subscription_schedules_customer_idx
  on stripe.subscription_schedules (customer_id);
create index stripe_subscription_schedules_subscription_idx
  on stripe.subscription_schedules (subscription_id);
create index stripe_subscription_schedules_status_idx
  on stripe.subscription_schedules (status);

alter table stripe.subscription_schedules enable row level security;
