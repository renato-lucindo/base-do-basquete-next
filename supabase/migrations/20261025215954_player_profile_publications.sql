-- Explicit metadata publication; editing a private person never republishes a profile.
create function private.profile_text_units(t text) returns integer language sql immutable strict security invoker set search_path='' as $$
 select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0)::integer from regexp_split_to_table(t,'') c
$$;
create function private.profile_confirmation_reason(v jsonb) returns text language plpgsql immutable security invoker set search_path='' as $$
declare r text;begin
 r:=private.achievement_confirmation_reason(v);
 if r is null or private.profile_text_units(r)>2000 then return null;end if;return r;
end$$;
create function private.valid_player_profile_confirmation(c jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare r text;begin
 if not private.context_keys(c,array['commandId','personId','expectedPersonVersion','expectedPublicationVersion','reason','acknowledgeImpact'])
 or not private.regulation_uuid(c->'commandId') or not private.regulation_uuid(c->'personId')
 or not private.regulation_integer(c->'expectedPersonVersion',1,2147483646)
 or not private.regulation_integer(c->'expectedPublicationVersion',0,2147483646)
 or c->'acknowledgeImpact' is distinct from 'true'::jsonb then return false;end if;
 r:=private.profile_confirmation_reason(c->'reason');
 return r is not null and ((c->>'expectedPublicationVersion')::numeric=0 or length(r)>=3);
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;
create function private.profile_person(pid uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname,'publicBirthYear',p.public_birth_year,'heightCm',p.height_cm,'weightKg',p.weight_kg,'position',p.position,'dominantHand',p.dominant_hand,'originCity',p.origin_city,'originState',p.origin_state,'biography',p.biography) from public.persons p where p.id=pid
$$;
create function private.valid_profile_metadata(p jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare k text;maximum integer;t text;begin
 if not private.context_keys(p,array['id','name','nickname','publicBirthYear','heightCm','weightKg','position','dominantHand','originCity','originState','biography']) or not private.regulation_uuid(p->'id') then return false;end if;
 foreach k in array array['name','nickname','position','originCity','originState','biography'] loop
  if k<>'name' and p->k='null'::jsonb then continue;end if;
  if jsonb_typeof(p->k) is distinct from 'string' then return false;end if;
  t:=p->>k;maximum:=case when k='biography' then 4000 when k in ('position','originState') then 80 else 120 end;
  if private.profile_text_units(t)>maximum or (k='name' and length(btrim(t))=0) then return false;end if;
 end loop;
 if p->'publicBirthYear'<>'null'::jsonb and not private.regulation_integer(p->'publicBirthYear',1,9999) then return false;end if;
 foreach k in array array['heightCm','weightKg'] loop
  if p->k='null'::jsonb then continue;end if;
  if not private.pdf_number(p->k,false,false,true) or (p->>k)::numeric<=0 or (p->>k)::numeric>1000 then return false;end if;
 end loop;
 return p->'dominantHand'='null'::jsonb or (jsonb_typeof(p->'dominantHand')='string' and p->>'dominantHand' in ('left','right','both'));
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;
create table private.player_profile_versions (
 person_id uuid not null references private.athletes(person_id) on delete restrict,
 version integer not null check(version>0),person_version integer not null check(person_version>0),
 confirmed_at timestamptz not null,confirmed_by uuid not null references auth.users(id) on delete restrict,reason text not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=65536),
 primary key(person_id,version),
 check(snapshot->>'personId'=person_id::text and snapshot->>'version'=version::text and snapshot->'person'->>'id'=person_id::text),
 check(private.valid_profile_metadata(snapshot->'person'))
);
create index player_profile_versions_actor on private.player_profile_versions(confirmed_by);
create table private.player_profile_commands (
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 person_id uuid not null,version integer not null,payload jsonb not null,result jsonb not null,
 foreign key(person_id,version) references private.player_profile_versions(person_id,version) on delete restrict
);
create index player_profile_commands_version on private.player_profile_commands(person_id,version);
create index player_profile_commands_actor on private.player_profile_commands(actor_id);
create table public.published_player_profiles (
 person_id uuid primary key,version integer not null,snapshot jsonb not null,
 foreign key(person_id,version) references private.player_profile_versions(person_id,version) on delete restrict
);
create index published_player_profiles_version on public.published_player_profiles(person_id,version);
alter table private.player_profile_versions enable row level security;
alter table private.player_profile_commands enable row level security;
alter table public.published_player_profiles enable row level security;
revoke all on private.player_profile_versions,private.player_profile_commands,public.published_player_profiles from public,anon,authenticated,service_role;
create policy never_direct_player_profile_versions on private.player_profile_versions as restrictive for all to public using(false) with check(false);
create policy never_direct_player_profile_commands on private.player_profile_commands as restrictive for all to public using(false) with check(false);
grant select on public.published_player_profiles to anon,authenticated;
create policy read_confirmed_player_profiles on public.published_player_profiles for select to anon,authenticated using(true);
create trigger player_profile_versions_immutable before update or delete on private.player_profile_versions for each row execute function private.regulation_history_immutable();
create trigger player_profile_commands_immutable before update or delete on private.player_profile_commands for each row execute function private.regulation_history_immutable();
create function private.guard_player_profile_projection() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if not exists(select 1 from private.player_profile_versions v where v.person_id=new.person_id and v.version=new.version and v.snapshot=new.snapshot)
 then raise sqlstate 'PT409' using message='profile_projection_conflict';end if;return new;
end$$;
create trigger player_profile_projection_guard before insert or update on public.published_player_profiles for each row execute function private.guard_player_profile_projection();

create function private.get_player_profile_proposal(pid uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare pv integer;metadata jsonb;begin
 perform 1 from public.admin_access where user_id=auth.uid() and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended('person:'||pid::text,0));
 select p.version into pv from public.persons p join private.athletes a on a.person_id=p.id where p.id=pid for share of p,a;
 if not found then raise sqlstate 'PT404' using message='player_profile_not_found';end if;
 metadata:=private.profile_person(pid);
 if not private.valid_profile_metadata(metadata) then raise sqlstate 'PT400' using message='invalid_profile_metadata';end if;
 return jsonb_build_object('personId',pid,'personVersion',pv,'person',metadata);
end$$;
create function private.confirm_player_profile(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;pid uuid;pv integer;old_version integer;nv integer;at_time timestamptz;metadata jsonb;snapshot jsonb;result jsonb;root uuid;
 receipt private.player_profile_commands%rowtype;begin
 perform 1 from public.admin_access where user_id=actor and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not coalesce(private.valid_player_profile_confirmation(c),false) then raise sqlstate 'PT400' using message='invalid_player_profile_confirmation';end if;
 cmd:=(c->>'commandId')::uuid;pid:=(c->>'personId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('player-profile-command:'||cmd::text,0));
 select * into receipt from private.player_profile_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;return receipt.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('person:'||pid::text,0));
 select p.version into pv from public.persons p join private.athletes a on a.person_id=p.id where p.id=pid for share of p,a;
 if not found then raise sqlstate 'PT404' using message='player_profile_not_found';end if;
 select version into old_version from public.published_player_profiles where person_id=pid for update;
 if pv<>(c->>'expectedPersonVersion')::numeric or coalesce(old_version,0)<>(c->>'expectedPublicationVersion')::numeric then raise sqlstate 'PT409' using message='version_conflict';end if;
 if pv>2147483646 or coalesce(old_version,0)>2147483646 then raise sqlstate 'PT409' using message='profile_version_limit';end if;
 metadata:=private.profile_person(pid);
 if not private.valid_profile_metadata(metadata) then raise sqlstate 'PT400' using message='invalid_profile_metadata';end if;
 nv:=coalesce(old_version,0)+1;at_time:=clock_timestamp();
 snapshot:=jsonb_build_object('kind','confirmed-player-profile-v1','personId',pid,'version',nv,'confirmedAt',at_time,'person',metadata);
 insert into private.player_profile_versions(person_id,version,person_version,confirmed_at,confirmed_by,reason,snapshot) values(pid,nv,pv,at_time,actor,private.profile_confirmation_reason(c->'reason'),snapshot);
 insert into public.published_player_profiles(person_id,version,snapshot) values(pid,nv,snapshot) on conflict(person_id) do update set version=excluded.version,snapshot=excluded.snapshot;
 result:=jsonb_build_object('commandId',cmd,'personId',pid,'version',nv,'personVersion',pv,'confirmedAt',at_time);
 insert into private.player_profile_commands(command_id,actor_id,person_id,version,payload,result) values(cmd,actor,pid,nv,c,result);
 -- Identity before competition locks, in deterministic order, matching existing writers.
 for root in select distinct s.championship_id from public.roster_entries r join public.disputes d on d.id=r.dispute_id join public.seasons s on s.id=d.season_id where r.person_id=pid order by s.championship_id loop
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
  update public.championships set saved_at=at_time where id=root;
 end loop;
 return result;
end$$;
create function private.get_player_profile_state(pid uuid,off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare proposal jsonb;pv integer;v private.player_profile_versions%rowtype;history jsonb;more boolean;begin
 proposal:=private.get_player_profile_proposal(pid);pv:=(proposal->>'personVersion')::integer;
 if off is null or off<0 or off>2147483626 then raise sqlstate 'PT400' using message='invalid_profile_offset';end if;
 select x.* into v from private.player_profile_versions x join public.published_player_profiles h on h.person_id=x.person_id and h.version=x.version where x.person_id=pid;
 select coalesce(jsonb_agg(jsonb_build_object('version',page.version,'personVersion',page.person_version,'confirmedAt',page.confirmed_at,'actorId',page.confirmed_by,'reason',page.reason) order by page.version desc),'[]'::jsonb) into history from (select * from private.player_profile_versions where person_id=pid order by version desc limit 20 offset off) page;
 more:=exists(select 1 from private.player_profile_versions where person_id=pid order by version desc limit 1 offset off+20);
 return jsonb_build_object('personId',pid,'personVersion',pv,'version',coalesce(v.version,0),'confirmedPersonVersion',v.person_version,'sourceChanged',coalesce(v.person_version<>pv,false),'published',v.snapshot,'history',history,'hasMore',more);
end$$;
create function private.get_player_profile_version(pid uuid,wanted integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform 1 from public.admin_access where user_id=auth.uid() and enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if wanted is null or wanted<1 then raise sqlstate 'PT400' using message='invalid_profile_version';end if;
 return (select jsonb_build_object('personId',person_id,'version',version,'personVersion',person_version,'confirmedAt',confirmed_at,'actorId',confirmed_by,'reason',reason,'snapshot',snapshot) from private.player_profile_versions where person_id=pid and version=wanted);
end$$;
create function public.get_player_profile_proposal(p_person_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_player_profile_proposal(p_person_id)$$;
create function public.confirm_player_profile(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.confirm_player_profile(p_command)$$;
create function public.get_player_profile_state(p_person_id uuid,p_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_player_profile_state(p_person_id,p_offset)$$;
create function public.get_player_profile_version(p_person_id uuid,p_version integer) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_player_profile_version(p_person_id,p_version)$$;
create function public.get_public_player_profile(p_person_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select snapshot from public.published_player_profiles where person_id=p_person_id$$;
revoke all on function private.profile_text_units(text),private.profile_confirmation_reason(jsonb),private.valid_player_profile_confirmation(jsonb),private.profile_person(uuid),private.valid_profile_metadata(jsonb),private.guard_player_profile_projection(),private.get_player_profile_proposal(uuid),private.confirm_player_profile(jsonb),private.get_player_profile_state(uuid,integer),private.get_player_profile_version(uuid,integer),public.get_player_profile_proposal(uuid),public.confirm_player_profile(jsonb),public.get_player_profile_state(uuid,integer),public.get_player_profile_version(uuid,integer),public.get_public_player_profile(uuid) from public,anon,authenticated,service_role;
grant execute on function private.get_player_profile_proposal(uuid),private.confirm_player_profile(jsonb),private.get_player_profile_state(uuid,integer),private.get_player_profile_version(uuid,integer),public.get_player_profile_proposal(uuid),public.confirm_player_profile(jsonb),public.get_player_profile_state(uuid,integer),public.get_player_profile_version(uuid,integer) to authenticated;
grant execute on function public.get_public_player_profile(uuid) to anon,authenticated;
