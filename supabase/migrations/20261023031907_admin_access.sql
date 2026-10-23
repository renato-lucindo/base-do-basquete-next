-- Single operator, tied to a verified Supabase Auth identity. No self-enrolment.
create table public.admin_access (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users (id) on delete restrict,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_access enable row level security;
revoke all on public.admin_access from public, anon, authenticated, service_role;
grant select (user_id, enabled) on public.admin_access to authenticated;

create policy admin_reads_own_enabled_access
on public.admin_access for select to authenticated
using (enabled and user_id = (select auth.uid()));

comment on table public.admin_access is
  'Application authorization, separate from Auth. Bootstrap/revocation through trusted operational SQL only.';
