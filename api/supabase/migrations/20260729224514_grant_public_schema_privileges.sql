-- The `public` schema has never had explicit table-level privilege grants
-- for anon/authenticated/service_role (unlike `cms`, see
-- 20250703163334_add-cms.sql). Objects created by the `postgres` role only
-- get TRUNCATE/REFERENCES/TRIGGER by default here, not SELECT/INSERT/
-- UPDATE/DELETE, so every `public` table ends up "permission denied" via
-- PostgREST until this is granted. RLS policies still gate row-level
-- access as normal — these grants only restore the table-level baseline
-- so RLS gets a chance to run at all.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on routines to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
