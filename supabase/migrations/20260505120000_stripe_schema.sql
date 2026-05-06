------------------------------- 0. SCHEMA & GRANTS ---------------
create schema if not exists stripe;

grant usage on schema stripe to anon, authenticated, service_role;
grant all on all tables in schema stripe to anon, authenticated, service_role;
grant all on all routines in schema stripe to anon, authenticated, service_role;
grant all on all sequences in schema stripe to anon, authenticated, service_role;
alter default privileges for role postgres in schema stripe grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema stripe grant all on routines to anon, authenticated, service_role;
alter default privileges for role postgres in schema stripe grant all on sequences to anon, authenticated, service_role;

------------------------------- 1. RAW EVENTS LOG ----------------
create table stripe.events (
  id            text primary key,
  type          text not null,
  api_version   text,
  livemode      boolean,
  request_id    text,
  idempotency_key text,
  stripe_created timestamptz,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text,
  data          jsonb not null
);

create index stripe_events_type_idx on stripe.events (type);
create index stripe_events_received_at_idx on stripe.events (received_at desc);
create index stripe_events_processed_at_idx on stripe.events (processed_at);

------------------------------- 2. CUSTOMERS ---------------------
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

------------------------------- 3. PRODUCTS ----------------------
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

------------------------------- 4. PRICES ------------------------
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

------------------------------- 5. SUBSCRIPTIONS ------------------
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

------------------------------- 6. SUBSCRIPTION ITEMS -------------
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

------------------------------- 7. INVOICES ----------------------
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

------------------------------- 8. CHARGES -----------------------
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

------------------------------- 9. METERS ------------------------
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

------------------------------- 10. METER EVENTS -----------------
-- meter events are append-only usage records. Stripe identifies them by
-- (event_name, identifier) where `identifier` is the caller's idempotency
-- key. They typically don't flow through webhooks at high volume — the
-- application path also calls `upsertMeterEvent` directly when it sends
-- usage to Stripe so we capture a local copy.
create table stripe.meter_events (
  event_name      text not null,
  identifier      text not null,
  customer_id     text,
  value           numeric,
  payload         jsonb not null,
  event_timestamp timestamptz not null,
  stripe_created  timestamptz,
  livemode        boolean,
  data            jsonb not null,
  synced_at       timestamptz not null default now(),
  primary key (event_name, identifier)
);

create index stripe_meter_events_customer_idx on stripe.meter_events (customer_id);
create index stripe_meter_events_timestamp_idx on stripe.meter_events (event_timestamp desc);

------------------------------- 11. RLS --------------------------
-- Stripe data is internal/admin-only. Lock down everything; only service_role
-- (which bypasses RLS) and direct DB access can read or write.
alter table stripe.events enable row level security;
alter table stripe.customers enable row level security;
alter table stripe.products enable row level security;
alter table stripe.prices enable row level security;
alter table stripe.subscriptions enable row level security;
alter table stripe.subscription_items enable row level security;
alter table stripe.invoices enable row level security;
alter table stripe.charges enable row level security;
alter table stripe.meters enable row level security;
alter table stripe.meter_events enable row level security;
