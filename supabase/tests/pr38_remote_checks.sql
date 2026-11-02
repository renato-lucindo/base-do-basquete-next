-- Explicit remote SQL checks after the authorized PR38 migrations.
-- No seed, DML, publication or Auth/admin changes. Always rolls back.
-- SET LOCAL role/claims exercises DB authorization, not an HTTP login session.
begin;
do $$
declare
  admin_id uuid;
  facts jsonb;
  d jsonb := '{"formatVersion":2,"rulesVersion":"FIBA_2024","periods":4,
    "participants":[
      {"rosterEntryId":"f3800000-0000-4000-8000-000000000001","side":"home","jersey":"0","played":true,"starter":false},
      {"rosterEntryId":"f3800000-0000-4000-8000-000000000002","side":"away","jersey":"00","played":true,"starter":false}],
    "staff":{
      "home":{"captainRosterEntryId":null,"coachStaffEntryId":null,"assistantStaffEntryId":null},
      "away":{"captainRosterEntryId":null,"coachStaffEntryId":null,"assistantStaffEntryId":null}},
    "events":[{"id":"f3800000-0000-4000-8000-000000000003","side":"home","period":1,"target":"0","code":"2"}]}'::jsonb;
begin
  select user_id into strict admin_id from public.admin_access where enabled;
  facts := private.compute_sheet_facts(d);
  if facts#>>'{teams,home,points}' is distinct from '2' then
    raise exception 'PR38: draft v2 scoring mismatch';
  end if;
  if private.compute_sheet_facts(d-'formatVersion') is distinct from facts then
    raise exception 'PR38: v1/v2 scoring facts mismatch';
  end if;
  begin
    perform private.final_sheet_facts(d);
    raise exception 'PR38: incomplete final sheet accepted';
  exception when sqlstate 'PT400' then
    if sqlerrm <> 'incomplete_sheet' then raise; end if;
  end;
  begin
    perform private.compute_sheet_facts(jsonb_set(d,'{events,0,code}','"P"'));
    raise exception 'PR38: foul without coach accepted';
  exception when sqlstate 'PT400' then
    if sqlerrm <> 'invalid_sheet_coach' then raise; end if;
  end;

  execute 'set local role anon';
  begin
    perform public.apply_roster_reuse('{}'::jsonb);
    raise exception 'PR38: anonymous writer accepted';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  execute 'set local role authenticated';
  begin
    perform public.apply_roster_reuse('{}'::jsonb);
    raise exception 'PR38: missing user accepted';
  exception when sqlstate 'PT403' then null;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  execute 'set local role authenticated';
  begin
    perform public.apply_roster_reuse('{}'::jsonb);
    raise exception 'PR38: malformed command accepted';
  exception when sqlstate 'PT400' then
    if sqlerrm <> 'invalid_roster_reuse' then raise; end if;
  end;
  begin
    perform public.get_roster_reuse_context(null,null);
    raise exception 'PR38: null context accepted';
  exception when sqlstate 'PT400' then
    if sqlerrm <> 'invalid_reuse_context' then raise; end if;
  end;
  begin
    perform public.list_roster_reuse_sources(null,0);
    raise exception 'PR38: null target accepted';
  exception when sqlstate 'PT400' then
    if sqlerrm <> 'invalid_reuse_query' then raise; end if;
  end;
  execute 'reset role';
end
$$;
rollback;
select 'PASS: remote SQL roles, draft v2, v1 facts and incomplete confirmation' as result;
