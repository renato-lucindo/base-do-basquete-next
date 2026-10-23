-- Shared contract: disposable PostgreSQL and the new Supabase project.
-- Test identities and permission changes are rolled back, never real accounts.
begin;

create function pg_temp.assert_true(value boolean, label text)
returns void language plpgsql as $$
begin
  if value is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;

create function pg_temp.expect_error(statement text, expected_state text, label text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'FAIL: % (expected SQLSTATE %)', label, expected_state;
end;
$$;

grant execute on function pg_temp.assert_true(boolean, text),
  pg_temp.expect_error(text, text, text) to anon, authenticated, service_role;

insert into auth.users (id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');
insert into public.admin_access (user_id)
values ('10000000-0000-4000-8000-000000000001');

select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid='public.admin_access'::regclass),
  'RLS enabled');
select pg_temp.expect_error(
  $q$insert into public.admin_access (user_id) values ('10000000-0000-4000-8000-000000000002')$q$,
  '23505', 'single administrative account');
select pg_temp.expect_error(
  $q$update public.admin_access set user_id='10000000-0000-4000-8000-000000000099'$q$,
  '23503', 'Auth identity FK');

set local role anon;
select pg_temp.expect_error('select user_id from public.admin_access', '42501', 'anonymous read denied');
select pg_temp.expect_error(
  $q$insert into public.admin_access (user_id) values ('10000000-0000-4000-8000-000000000002')$q$,
  '42501', 'anonymous write denied');
reset role;

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
-- User-controlled metadata must not grant administrative access.
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","user_metadata":{"admin":true,"role":"admin"}}';
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.admin_access), 'other authenticated user denied');
select pg_temp.expect_error(
  $q$insert into public.admin_access (user_id) values ('10000000-0000-4000-8000-000000000002')$q$,
  '42501', 'self promotion denied');
reset role;

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001"}';
set local role authenticated;
select pg_temp.assert_true((select count(*)=1 from public.admin_access), 'authorized admin visible');
select pg_temp.assert_true((select enabled from public.admin_access), 'admin enabled');
select pg_temp.expect_error('select created_at from public.admin_access', '42501', 'internal columns denied');
select pg_temp.expect_error('update public.admin_access set enabled=false', '42501', 'admin self mutation denied');
select pg_temp.expect_error('delete from public.admin_access', '42501', 'admin delete denied');
select pg_temp.expect_error('truncate public.admin_access', '42501', 'truncate denied');
reset role;

update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.admin_access), 'revocation effective with same JWT');
reset role;

set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{}';
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.admin_access), 'missing identity denied');
reset role;

set local role service_role;
select pg_temp.expect_error('select user_id from public.admin_access', '42501', 'generic service credential has no grant');
reset role;

-- Probe future objects under the same migration owner. All are rolled back.
create table public.grant_probe (id integer);
create sequence public.grant_sequence_probe;
create function public.grant_function_probe() returns integer language sql as 'select 1';
select pg_temp.assert_true(not has_table_privilege('anon', 'public.grant_probe', 'select'), 'future table anon denied');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.grant_probe', 'insert'), 'future table authenticated denied');
select pg_temp.assert_true(not has_sequence_privilege('authenticated', 'public.grant_sequence_probe', 'usage'), 'future sequence denied');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.grant_function_probe()', 'execute'), 'future function anon denied');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.grant_function_probe()', 'execute'), 'future function authenticated denied');
select pg_temp.assert_true(not has_schema_privilege('authenticated', 'public', 'create'), 'schema creation denied');

select 'PASS: admin_access RLS/grants/revocation/defaults' as result;
rollback;
