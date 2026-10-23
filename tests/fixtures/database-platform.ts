export const platform = `
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub'))::uuid
$$;
-- Platform shape used by Storage authorization contracts, not a blob-service mock.
create schema storage;
create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,metadata jsonb default '{}',owner_id text,unique(bucket_id,name));
alter table storage.objects enable row level security;
-- Observed managed-platform guard; do not bypass it in tests or migrations.
create function storage.protect_delete() returns trigger language plpgsql as $$begin raise sqlstate '42501' using message='Use the Storage API for deletion';end$$;
create trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();
grant usage on schema storage to anon,authenticated,service_role;
grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Match observed defaults in the newly provisioned Supabase project.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;
