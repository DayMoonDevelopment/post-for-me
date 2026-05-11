------------------------------- 0. SCHEMA ------------------------
-- The stripe schema is accessed exclusively via the direct database
-- connection (Kysely). No grants are issued to anon/authenticated/service_role
-- because none of the Supabase roles should ever read or write here.
create schema if not exists stripe;

-- The stripe schema is a current-state mirror of Stripe's API; we don't
-- persist webhook events. Stripe Dashboard already has an event log, and
-- the upserts below are inherently idempotent on replay. If the mirror
-- gets out of sync, the canonical recovery is `bun run stripe:sync`.

------------------------------- 1. CUSTOMERS ---------------------
create table stripe.customers (
  id           text primary key,
  email        text,
  name         text,
  description  text,
  currency     text,
  delinquent   boolean,
  metadata     jsonb,
  stripe_created timestamptz,
  livemode     boolean,
  data         jsonb not null,
  synced_at    timestamptz not null default now(),
  deleted_at   timestamptz
);

create index stripe_customers_email_idx on stripe.customers (email);

------------------------------- 2. PRODUCTS ----------------------
create table stripe.products (
  id           text primary key,
  active       boolean,
  name         text,
  description  text,
  metadata     jsonb,
  stripe_created timestamptz,
  livemode     boolean,
  data         jsonb not null,
  synced_at    timestamptz not null default now(),
  deleted_at   timestamptz
);

create index stripe_products_active_idx on stripe.products (active);

------------------------------- 3. PRICES ------------------------
create table stripe.prices (
  id            text primary key,
  -- product_id, customer_id, etc. are intentionally NOT foreign keys.
  -- These are mirror tables for an external system (Stripe). FKs would
  -- couple insertion order across tables and reject perfectly valid Stripe
  -- state that simply hasn't been backfilled yet (e.g. archived prices
  -- referenced by active subscriptions). We index for joins but don't
  -- enforce referential integrity locally.
  product_id    text,
  active        boolean,
  currency      text,
  unit_amount   bigint,
  type          text,
  recurring_interval text,
  recurring_interval_count int,
  nickname      text,
  metadata      jsonb,
  stripe_created timestamptz,
  livemode      boolean,
  data          jsonb not null,
  synced_at     timestamptz not null default now(),
  deleted_at    timestamptz
);

create index stripe_prices_product_idx on stripe.prices (product_id);
create index stripe_prices_active_idx on stripe.prices (active);

------------------------------- 4. SUBSCRIPTIONS ------------------
create table stripe.subscriptions (
  id              text primary key,
  customer_id     text,
  status          text,
  cancel_at_period_end boolean,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at       timestamptz,
  canceled_at     timestamptz,
  ended_at        timestamptz,
  trial_start     timestamptz,
  trial_end       timestamptz,
  collection_method text,
  currency        text,
  metadata        jsonb,
  stripe_created  timestamptz,
  livemode        boolean,
  data            jsonb not null,
  synced_at       timestamptz not null default now(),
  deleted_at      timestamptz
);

create index stripe_subscriptions_customer_idx on stripe.subscriptions (customer_id);
create index stripe_subscriptions_status_idx on stripe.subscriptions (status);

------------------------------- 5. SUBSCRIPTION ITEMS -------------
create table stripe.subscription_items (
  id              text primary key,
  subscription_id text not null,
  price_id        text,
  quantity        bigint,
  metadata        jsonb,
  stripe_created  timestamptz,
  data            jsonb not null,
  synced_at       timestamptz not null default now()
);

create index stripe_subscription_items_subscription_idx on stripe.subscription_items (subscription_id);
create index stripe_subscription_items_price_idx on stripe.subscription_items (price_id);

------------------------------- 6. INVOICES ----------------------
create table stripe.invoices (
  id                text primary key,
  customer_id       text,
  subscription_id   text,
  status            text,
  number            text,
  currency          text,
  amount_due        bigint,
  amount_paid       bigint,
  amount_remaining  bigint,
  total             bigint,
  subtotal          bigint,
  hosted_invoice_url text,
  invoice_pdf       text,
  due_date          timestamptz,
  paid_at           timestamptz,
  period_start      timestamptz,
  period_end        timestamptz,
  collection_method text,
  metadata          jsonb,
  stripe_created    timestamptz,
  livemode          boolean,
  data              jsonb not null,
  synced_at         timestamptz not null default now(),
  deleted_at        timestamptz
);

create index stripe_invoices_customer_idx on stripe.invoices (customer_id);
create index stripe_invoices_subscription_idx on stripe.invoices (subscription_id);
create index stripe_invoices_status_idx on stripe.invoices (status);

------------------------------- 7. CHARGES -----------------------
create table stripe.charges (
  id              text primary key,
  customer_id     text,
  invoice_id      text,
  payment_intent_id text,
  status          text,
  amount          bigint,
  amount_captured bigint,
  amount_refunded bigint,
  currency        text,
  paid            boolean,
  refunded        boolean,
  captured        boolean,
  receipt_url     text,
  failure_code    text,
  failure_message text,
  metadata        jsonb,
  stripe_created  timestamptz,
  livemode        boolean,
  data            jsonb not null,
  synced_at       timestamptz not null default now(),
  deleted_at      timestamptz
);

create index stripe_charges_customer_idx on stripe.charges (customer_id);
create index stripe_charges_invoice_idx on stripe.charges (invoice_id);
create index stripe_charges_status_idx on stripe.charges (status);

------------------------------- 8. METERS ------------------------
create table stripe.meters (
  id              text primary key,
  display_name    text,
  event_name      text not null,
  status          text,
  event_time_window text,
  customer_mapping jsonb,
  default_aggregation jsonb,
  value_settings  jsonb,
  stripe_created  timestamptz,
  stripe_updated  timestamptz,
  livemode        boolean,
  data            jsonb not null,
  synced_at       timestamptz not null default now(),
  deleted_at      timestamptz
);

create index stripe_meters_event_name_idx on stripe.meters (event_name);
create index stripe_meters_status_idx on stripe.meters (status);

------------------------------- 9. SUBSCRIPTION SCHEDULES ------
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

------------------------------- 10. RLS --------------------------
-- Stripe data is accessed exclusively via the direct database connection,
-- never through PostgREST. We enable RLS on every table without granting
-- any policies so that anon/authenticated/service_role have no access.
alter table stripe.customers enable row level security;
alter table stripe.products enable row level security;
alter table stripe.prices enable row level security;
alter table stripe.subscriptions enable row level security;
alter table stripe.subscription_items enable row level security;
alter table stripe.invoices enable row level security;
alter table stripe.charges enable row level security;
alter table stripe.meters enable row level security;
alter table stripe.subscription_schedules enable row level security;
