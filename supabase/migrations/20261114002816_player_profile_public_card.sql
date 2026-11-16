-- Private history keeps the original snapshot. Public storage contains only the card.
create function private.public_player_card(p_snapshot jsonb)
returns jsonb language sql immutable strict set search_path='' as $$
 select jsonb_set(p_snapshot,'{person}',(p_snapshot->'person')-array['dominantHand','biography'])
$$;
revoke all on function private.public_player_card(jsonb) from public,anon,authenticated,service_role;

create or replace function private.guard_player_profile_projection()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(
  select 1 from private.player_profile_versions v
  where v.person_id=new.person_id and v.version=new.version
    and private.public_player_card(v.snapshot)=new.snapshot
 ) then raise sqlstate 'PT409' using message='profile_projection_conflict';end if;
 return new;
end$$;

update public.published_player_profiles
set snapshot=private.public_player_card(snapshot)
where snapshot->'person' ?| array['dominantHand','biography'];

alter table public.published_player_profiles add constraint player_profile_public_card_only
 check (not (snapshot->'person' ?| array['dominantHand','biography','birthDate','federationRegistration']));

-- Preserve the original career wire shape for previously deployed Workers.
-- The compatibility keys only carry nulls.
create or replace function public.get_public_player_profile(p_person_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_set(snapshot,'{person}',(snapshot->'person')||'{"dominantHand":null,"biography":null}'::jsonb)
 from public.published_player_profiles where person_id=p_person_id
$$;

create function private.player_card_has_details(p_person jsonb)
returns boolean language sql immutable strict set search_path='' as $$
 select num_nonnulls(p_person->>'publicBirthYear',p_person->>'heightCm',
  p_person->>'weightKg',p_person->>'position',p_person->>'originCity',p_person->>'originState')>0
$$;
create function private.has_public_player_evidence(pid uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(
  select from public.published_player_games g
  where g.person_id=pid and private.game_is_public(g.game_id)
 ) or exists(
  select from public.published_achievements a
  where not private.dispute_has_game_drafts(a.dispute_id)
   and a.snapshot @> jsonb_build_object('honors',jsonb_build_array(
    jsonb_build_object('athletes',jsonb_build_array(jsonb_build_object('personId',pid)))))
 )
$$;
revoke all on function private.player_card_has_details(jsonb),private.has_public_player_evidence(uuid) from public,anon,authenticated,service_role;

create function private.list_initial_player_cards(p_after uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare answer jsonb;
begin
 if not exists(select from public.admin_access where user_id=auth.uid() and enabled)
 then raise sqlstate 'PT403' using message='forbidden';end if;
 with eligible as materialized (
  select p.id,p.version,private.profile_person(p.id) as person
  from public.persons p join private.athletes a on a.person_id=p.id
  where (p_after is null or p.id>p_after)
   and not exists(select from public.published_player_profiles h where h.person_id=p.id)
   and private.has_public_player_evidence(p.id)
 ), page as (
  select id,version,person-array['dominantHand','biography'] as person
  from eligible where private.player_card_has_details(person)
  order by id limit 51
 ), items as (select * from page order by id limit 50)
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(jsonb_build_object(
   'personId',id,'personVersion',version,'person',person) order by id) from items),'[]'::jsonb),
  'next',case when (select count(*) from page)=51 then (select id from items order by id desc limit 1) end
 ) into answer;
 return answer;
end$$;
create function public.list_initial_player_cards(p_after uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.list_initial_player_cards(p_after)
$$;
revoke all on function private.list_initial_player_cards(uuid),public.list_initial_player_cards(uuid) from public,anon,authenticated,service_role;
grant execute on function private.list_initial_player_cards(uuid),public.list_initial_player_cards(uuid) to authenticated;

create or replace function private.confirm_player_profile(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;pid uuid;pv integer;old_version integer;nv integer;at_time timestamptz;birth_date date;metadata jsonb;snapshot jsonb;result jsonb;root uuid;
 receipt private.player_profile_commands%rowtype;begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not coalesce(private.valid_player_profile_confirmation(c-'initialBatch'),false) then raise sqlstate 'PT400' using message='invalid_player_profile_confirmation';end if;
 if c ? 'initialBatch' and (c->'initialBatch' is distinct from 'true'::jsonb or (c->>'expectedPublicationVersion')::integer<>0)
 then raise sqlstate 'PT400' using message='invalid_player_profile_confirmation';end if;
 cmd:=(c->>'commandId')::uuid;pid:=(c->>'personId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('player-profile-command:'||cmd::text,0));
 select * into receipt from private.player_profile_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('person:'||pid::text,0));
 select p.version,a.birth_date into pv,birth_date from public.persons p join private.athletes a on a.person_id=p.id where p.id=pid for share of p,a;
 if not found then raise sqlstate 'PT404' using message='player_profile_not_found';end if;
 select version into old_version from public.published_player_profiles where person_id=pid for update;
 if pv<>(c->>'expectedPersonVersion')::numeric or coalesce(old_version,0)<>(c->>'expectedPublicationVersion')::numeric then raise sqlstate 'PT409' using message='version_conflict';end if;
 if pv>2147483646 or coalesce(old_version,0)>2147483646 then raise sqlstate 'PT409' using message='profile_version_limit';end if;
 metadata:=private.profile_person(pid);
 if c ? 'initialBatch' and (not private.has_public_player_evidence(pid) or not private.player_card_has_details(metadata))
 then raise sqlstate 'PT409' using message='profile_not_eligible';end if;
 metadata:=metadata||'{"dominantHand":null,"biography":null}'::jsonb;
 if not private.valid_profile_metadata(metadata) then raise sqlstate 'PT400' using message='invalid_profile_metadata';end if;
 nv:=coalesce(old_version,0)+1;at_time:=clock_timestamp();
 snapshot:=jsonb_build_object('kind','confirmed-player-profile-v1','personId',pid,'version',nv,'confirmedAt',at_time,'person',metadata);
 insert into private.player_profile_versions(person_id,version,person_version,confirmed_at,confirmed_by,reason,snapshot,birth_date) values(pid,nv,pv,at_time,actor,private.profile_confirmation_reason(c->'reason'),snapshot,birth_date);
 insert into public.published_player_profiles(person_id,version,snapshot) values(pid,nv,private.public_player_card(snapshot)) on conflict(person_id) do update set version=excluded.version,snapshot=excluded.snapshot;
 result:=jsonb_build_object('commandId',cmd,'personId',pid,'version',nv,'personVersion',pv,'confirmedAt',at_time);
 insert into private.player_profile_commands(command_id,actor_id,person_id,version,payload,result) values(cmd,actor,pid,nv,c,result);
 -- Identity before competition locks, in deterministic order, matching existing writers.
 for root in select distinct s.championship_id from public.roster_entries r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.person_id=pid order by s.championship_id loop
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  update public.championships set saved_at=at_time where id=root;
 end loop;
 return result;
end$$;
