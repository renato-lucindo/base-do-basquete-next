-- Future migrations must grant each application capability explicitly.
revoke create on schema public from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
-- PostgreSQL's global PUBLIC function default cannot be revoked per schema.
-- This affects only functions subsequently created by this migration owner.
alter default privileges for role postgres
  revoke execute on functions from public;
