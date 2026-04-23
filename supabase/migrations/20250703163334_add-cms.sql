------------------------------- 0. SCHEMA & GRANTS ---------------
create schema if not exists cms;

grant usage on schema cms to anon, authenticated, service_role;
grant all on all tables in schema cms to anon, authenticated, service_role;
grant all on all routines in schema cms to anon, authenticated, service_role;
grant all on all sequences in schema cms to anon, authenticated, service_role;
alter default privileges for role postgres in schema cms grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema cms grant all on routines to anon, authenticated, service_role;
alter default privileges for role postgres in schema cms grant all on sequences to anon, authenticated, service_role;

------------------------------- 1. HELPERS -----------------------
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

------------------------------- 2. CORE TABLES -------------------
create table cms.resources (
  id          text primary key default nanoid('res'),
  status      text not null check (status in ('draft','published','archived')),
  slug        citext    not null,                      -- canonical, case-insensitive
  title       text      not null,
  body_blocks jsonb     not null,
  summary     text,
  seo_meta    jsonb     default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(slug)                                         -- one-to-one slug
);

------------------------------- 3. REDIRECTS ---------------------
create table cms.slug_redirects (
  slug          citext primary key check (slug ~ '^[a-z0-9-]+'),
  target_slug   citext not null references cms.resources(slug) on delete cascade,
  http_status   int    not null default 301 check (http_status in (301,302)),
  added_at      timestamptz not null default now()
);

------------------------------- 6. TRIGGERS ----------------------
create trigger trg_resources_updated
  before update on cms.resources
  for each row execute procedure public.set_updated_at();

------------------------------- 7. RLS ---------------------------
alter table cms.resources          enable row level security;
alter table cms.slug_redirects     enable row level security;

/* Public can read only published resources */
create policy "Public read: resources"
  on cms.resources
  for select using (status = 'published');

/* Redirects are safe to expose (they don't leak drafts) */
create policy "Public read: redirects"
  on cms.slug_redirects
  for select using (true);

/* ---------- Done ✔︎ ------------------------------------------- */
