-- Shared real-PostgreSQL contract. All fixture writes and access changes roll back.
begin;
create function pg_temp.ctx_assert(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %', label; end if; end;
$$;
create function pg_temp.ctx_error(statement text, state text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if sqlstate=state then return; end if; raise;
  end;
  raise exception 'Expected SQLSTATE %', state;
end;
$$;
create function pg_temp.ctx_id(n integer) returns uuid language sql immutable as $$
  select ('20000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.ctx_command(n integer default 0) returns jsonb language sql immutable as $$
  select jsonb_build_object('commandId',pg_temp.ctx_id(n+1),'expectedVersion',0,
    'competition',jsonb_build_object('id',pg_temp.ctx_id(n+2),'name','Liga de teste',
      'seasons',jsonb_build_array(jsonb_build_object('id',pg_temp.ctx_id(n+3),'year',2026,
        'disputes',jsonb_build_array(
          jsonb_build_object('id',pg_temp.ctx_id(n+4),'gender','feminino','category','Adulto','division',null),
          jsonb_build_object('id',pg_temp.ctx_id(n+5),'gender','masculino','category','Adulto','division','B'))))))
$$;
grant execute on function pg_temp.ctx_assert(boolean,text),pg_temp.ctx_error(text,text),
  pg_temp.ctx_id(integer),pg_temp.ctx_command(integer) to anon,authenticated;

delete from public.admin_access;
insert into auth.users(id) values
  ('20000000-0000-4000-8000-000000000090'),('20000000-0000-4000-8000-000000000091');
insert into public.admin_access(user_id) values ('20000000-0000-4000-8000-000000000090');

set local role anon;
select pg_temp.ctx_error('select * from public.championships','42501');
select pg_temp.ctx_error('select public.save_competition(pg_temp.ctx_command())','42501');
set local role authenticated;
set local request.jwt.claim.sub='20000000-0000-4000-8000-000000000091';
select pg_temp.ctx_assert((public.list_competitions()->'items')='[]'::jsonb,'non-admin listing empty');
select pg_temp.ctx_error('select public.save_competition(pg_temp.ctx_command())','PT403');
set local request.jwt.claim.sub='20000000-0000-4000-8000-000000000090';
select pg_temp.ctx_error($q$insert into public.championships(id,name) values(pg_temp.ctx_id(2),'Bypass')$q$,'42501');
select pg_temp.ctx_assert((public.save_competition(pg_temp.ctx_command())->>'version')::int=1,'first save');
select pg_temp.ctx_assert((public.save_competition(pg_temp.ctx_command())->>'version')::int=1,'idempotent replay');
select pg_temp.ctx_assert((select count(*)=1 from public.championships),'no duplicate on replay');
select pg_temp.ctx_assert((public.get_competition(pg_temp.ctx_id(2))->'seasons'->0->'disputes') @>
  '[{"gender":"feminino","category":"Adulto","division":null}]','context returned');
select pg_temp.ctx_error($q$select public.save_competition(jsonb_set(pg_temp.ctx_command(),'{competition,name}','"Different"'))$q$,'PT409');
select pg_temp.ctx_error($q$select public.save_competition(jsonb_set(pg_temp.ctx_command(),'{commandId}',to_jsonb(pg_temp.ctx_id(6))))$q$,'PT409');
select pg_temp.ctx_error($q$select public.save_competition(jsonb_set(jsonb_set(pg_temp.ctx_command(10),'{competition,seasons,0,disputes,1,gender}','"feminino"'),'{competition,seasons,0,disputes,1,division}','null'))$q$,'PT400');
select pg_temp.ctx_assert(public.get_competition(pg_temp.ctx_id(12)) is null,'invalid aggregate rolled back');
-- Saved child identities cannot be omitted or reassigned to a different parent.
select public.save_competition(pg_temp.ctx_command(20));
select pg_temp.ctx_error($q$select public.save_competition(jsonb_set(jsonb_set(jsonb_set(pg_temp.ctx_command(20),'{commandId}',to_jsonb(pg_temp.ctx_id(29))),'{expectedVersion}','1'),'{competition,seasons,0,id}',to_jsonb(pg_temp.ctx_id(3))))$q$,'PT400');
select pg_temp.ctx_error($q$select public.save_competition(jsonb_set(jsonb_set(jsonb_set(pg_temp.ctx_command(),'{commandId}',to_jsonb(pg_temp.ctx_id(7))),'{expectedVersion}','1'),'{competition,seasons,0,disputes}','[]'))$q$,'PT400');
-- Reads must not modify saved order or versions.
create temp table ctx_before as select saved_at,version from public.championships where id=pg_temp.ctx_id(2);
select public.get_competition(pg_temp.ctx_id(2));
select public.list_competitions('feminino',0);
select pg_temp.ctx_assert((select c.saved_at=b.saved_at and c.version=b.version from public.championships c cross join ctx_before b where c.id=pg_temp.ctx_id(2)),'visiting does not reorder Recentes');
select pg_temp.ctx_assert((public.list_competitions('not-present',0)->'items')='[]'::jsonb,'search filters results');
-- Update succeeds once, then the stale copy is refused.
select pg_temp.ctx_assert((public.save_competition(jsonb_set(jsonb_set(jsonb_set(pg_temp.ctx_command(),'{commandId}',to_jsonb(pg_temp.ctx_id(8))),'{expectedVersion}','1'),'{competition,name}','"Liga revisada"'))->>'version')::int=2,'version increments');
select pg_temp.ctx_error($q$select public.save_competition(jsonb_set(jsonb_set(pg_temp.ctx_command(),'{commandId}',to_jsonb(pg_temp.ctx_id(9))),'{expectedVersion}','1'))$q$,'PT409');
reset role;
update public.admin_access set enabled=false;
set local role authenticated;
select pg_temp.ctx_assert(public.get_competition(pg_temp.ctx_id(2)) is null,'revocation hides same-identity reads');
select pg_temp.ctx_error('select public.save_competition(pg_temp.ctx_command(40))','PT403');
select pg_temp.ctx_error('select * from private.competition_commands','42501');
reset role;
select pg_temp.ctx_assert((select count(*)=2 from public.championships),'no partially saved extra aggregates');
rollback;
