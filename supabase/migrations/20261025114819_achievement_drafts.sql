-- A2b: private versioned decisions only. Saving never confirms or publishes.
create function private.achievement_title(v jsonb) returns text language plpgsql immutable security invoker set search_path='' as $$
declare t text;begin
 if jsonb_typeof(v) is distinct from 'string' then return null;end if;
 t:=btrim(v#>>'{}',E' \t\n\r\f'||chr(11)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279));
 if length(t) not between 2 and 80 or t~E'[\x01-\x1f\x7f]' then return null;end if;
 return t;
end$$;
create function private.valid_achievement_source(v jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$begin
 if v='null'::jsonb then return true;end if;
 case v->>'kind'
 when 'group' then return private.context_keys(v,array['kind','phaseId','groupId']) and private.regulation_uuid(v->'phaseId') and private.regulation_uuid(v->'groupId');
 when 'series' then return private.context_keys(v,array['kind','finalSeriesId','bronzeSeriesId']) and private.regulation_uuid(v->'finalSeriesId') and (v->'bronzeSeriesId'='null'::jsonb or private.regulation_uuid(v->'bronzeSeriesId')) and ((v->>'finalSeriesId')::uuid is distinct from (v->>'bronzeSeriesId')::uuid);
 else return false;end case;
exception when invalid_text_representation then return false;
end$$;
create function private.valid_achievement_draft(d jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare g jsonb;h jsonb;positions integer[]:='{}';registrations uuid[]:='{}';honors uuid[]:='{}';ids uuid[];recipients integer:=0;begin
 if not private.context_keys(d,array['disputeId','placements','honors']) or not private.regulation_uuid(d->'disputeId') or jsonb_typeof(d->'placements') is distinct from 'array' or jsonb_typeof(d->'honors') is distinct from 'array' then return false;end if;
 if jsonb_array_length(d->'placements')>1000 or jsonb_array_length(d->'honors')>1000 then return false;end if;
 for g in select value from jsonb_array_elements(d->'placements') loop
  if not private.context_keys(g,array['position','registrationIds']) or not private.regulation_integer(g->'position',1,1000) or not private.regulation_ids(g->'registrationIds',1000) then return false;end if;
  select coalesce(array_agg((value#>>'{}')::uuid),'{}') into ids from jsonb_array_elements(g->'registrationIds');
  if cardinality(ids)=0 or ids&&registrations or (g->>'position')::numeric::integer=any(positions) then return false;end if;
  registrations:=registrations||ids;positions:=array_append(positions,(g->>'position')::numeric::integer);
 end loop;
 if cardinality(registrations)>1000 then return false;end if;
 for h in select value from jsonb_array_elements(d->'honors') loop
  if not private.context_keys(h,array['id','title','personIds']) or not private.regulation_uuid(h->'id') or private.achievement_title(h->'title') is null or not private.regulation_ids(h->'personIds',1000) then return false;end if;
  if jsonb_array_length(h->'personIds')=0 or (h->>'id')::uuid=any(honors) then return false;end if;
  honors:=array_append(honors,(h->>'id')::uuid);recipients:=recipients+jsonb_array_length(h->'personIds');
 end loop;
 return recipients<=10000;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then return false;
end$$;
create function private.valid_achievement_draft_command(c jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$begin
 return private.context_keys(c,array['commandId','expectedVersion','expectedContextFingerprint','source','draft']) and private.regulation_uuid(c->'commandId') and private.regulation_integer(c->'expectedVersion',0,2147483646)
 and jsonb_typeof(c->'expectedContextFingerprint')='string' and (c->>'expectedContextFingerprint')~'^[a-f0-9]{64}$' and private.valid_achievement_source(c->'source') and private.valid_achievement_draft(c->'draft');
end$$;

create table private.achievement_draft_versions(
 dispute_id uuid not null references public.disputes(id) on delete restrict,version integer not null check(version>0),
 draft jsonb not null check(private.valid_achievement_draft(draft)),source jsonb not null check(private.valid_achievement_source(source)),
 context_snapshot jsonb not null check(jsonb_typeof(context_snapshot)='object' and octet_length(context_snapshot::text)<=16777216),
 context_fingerprint text not null check(context_fingerprint~'^[a-f0-9]{64}$'),regulation_version integer,
 saved_by uuid not null references auth.users(id) on delete restrict,saved_at timestamptz not null,
 primary key(dispute_id,version),foreign key(dispute_id,regulation_version) references private.regulation_versions(dispute_id,version) on delete restrict,
 check((draft->>'disputeId')::uuid=dispute_id and (context_snapshot->>'disputeId')::uuid=dispute_id and context_snapshot->>'contextFingerprint'=context_fingerprint)
);
create index achievement_draft_actor on private.achievement_draft_versions(saved_by);
create index achievement_draft_regulation on private.achievement_draft_versions(dispute_id,regulation_version);
create table private.achievement_draft_heads(
 dispute_id uuid primary key references public.disputes(id) on delete restrict,version integer not null,
 foreign key(dispute_id,version) references private.achievement_draft_versions(dispute_id,version) on delete restrict
);
create index achievement_draft_head_version on private.achievement_draft_heads(dispute_id,version);
create table private.achievement_draft_registrations(
 dispute_id uuid not null,version integer not null,registration_id uuid not null,primary key(dispute_id,version,registration_id),
 foreign key(dispute_id,version) references private.achievement_draft_versions(dispute_id,version) on delete restrict,
 foreign key(registration_id,dispute_id) references public.registrations(id,dispute_id) on delete restrict
);
create index achievement_draft_registration_target on private.achievement_draft_registrations(registration_id,dispute_id);
create table private.achievement_draft_people(
 dispute_id uuid not null,version integer not null,person_id uuid not null references private.athletes(person_id) on delete restrict,
 roster_entry_id uuid not null references public.roster_entries(id) on delete restrict,
 primary key(dispute_id,version,person_id),foreign key(dispute_id,version) references private.achievement_draft_versions(dispute_id,version) on delete restrict
);
create index achievement_draft_person_target on private.achievement_draft_people(person_id);
create index achievement_draft_roster_target on private.achievement_draft_people(roster_entry_id);
create table private.achievement_draft_commands(
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 dispute_id uuid not null,version integer not null,payload jsonb not null check(private.valid_achievement_draft_command(payload)),result jsonb not null,
 foreign key(dispute_id,version) references private.achievement_draft_versions(dispute_id,version) on delete restrict
);
create index achievement_draft_command_actor on private.achievement_draft_commands(actor_id);
create index achievement_draft_command_version on private.achievement_draft_commands(dispute_id,version);
alter table private.achievement_draft_versions enable row level security;
alter table private.achievement_draft_heads enable row level security;
alter table private.achievement_draft_registrations enable row level security;
alter table private.achievement_draft_people enable row level security;
alter table private.achievement_draft_commands enable row level security;
revoke all on private.achievement_draft_versions,private.achievement_draft_heads,private.achievement_draft_registrations,private.achievement_draft_people,private.achievement_draft_commands from public,anon,authenticated,service_role;
create policy deny_achievement_versions on private.achievement_draft_versions as restrictive for all to public using(false) with check(false);
create policy deny_achievement_heads on private.achievement_draft_heads as restrictive for all to public using(false) with check(false);
create policy deny_achievement_registrations on private.achievement_draft_registrations as restrictive for all to public using(false) with check(false);
create policy deny_achievement_people on private.achievement_draft_people as restrictive for all to public using(false) with check(false);
create policy deny_achievement_commands on private.achievement_draft_commands as restrictive for all to public using(false) with check(false);
create trigger achievement_versions_immutable before update or delete on private.achievement_draft_versions for each row execute function private.regulation_history_immutable();
create trigger achievement_registrations_immutable before update or delete on private.achievement_draft_registrations for each row execute function private.regulation_history_immutable();
create trigger achievement_people_immutable before update or delete on private.achievement_draft_people for each row execute function private.regulation_history_immutable();
create trigger achievement_commands_immutable before update or delete on private.achievement_draft_commands for each row execute function private.regulation_history_immutable();

create function private.save_achievement_draft(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;root uuid;current_root uuid;old integer;nv integer;now_at timestamptz;
 receipt private.achievement_draft_commands%rowtype;ctx jsonb;d jsonb;s jsonb;result jsonb;pid uuid;rid uuid;anchor uuid;locked uuid[];current_people uuid[];
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not coalesce(private.valid_achievement_draft_command(c),false) then raise sqlstate 'PT400' using message='invalid_achievement_draft';end if;
 cmd:=(c->>'commandId')::uuid;d:=c->'draft';did:=(d->>'disputeId')::uuid;s:=c->'source';
 perform pg_advisory_xact_lock(hashtextextended('achievement-draft-command:'||cmd::text,0));
 select * into receipt from private.achievement_draft_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select se.championship_id into root from public.disputes di join public.seasons se on se.id=di.season_id where di.id=did;
 if root is null then raise sqlstate 'PT404' using message='achievement_context_not_found';end if;
 -- Bound before acquiring identity locks. All identity/athlete rows precede the root.
 if (select count(*)>10000 from(select distinct person_id from public.roster_entries where dispute_id=did limit 10001) q) then raise sqlstate 'PT413' using message='achievement_context_too_large';end if;
 locked:='{}';
 for pid in select p.id from public.persons p join private.athletes a on a.person_id=p.id where exists(select 1 from public.roster_entries r where r.person_id=p.id and r.dispute_id=did) order by p.id for share of p,a loop
  locked:=array_append(locked,pid);
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 current_root:=private.achievement_root(did);
 if current_root<>root then raise sqlstate 'PT409' using message='achievement_context_changed';end if;
 select coalesce(array_agg(distinct person_id order by person_id),'{}') into current_people from public.roster_entries where dispute_id=did;
 if current_people<>locked then raise sqlstate 'PT409' using message='context_conflict';end if;
 select version into old from private.achievement_draft_heads where dispute_id=did for update;
 if coalesce(old,0)<>(c->>'expectedVersion')::numeric::integer then raise sqlstate 'PT409' using message='version_conflict';end if;
 ctx:=private.get_achievement_context(did);
 if ctx->>'contextFingerprint'<>c->>'expectedContextFingerprint' then raise sqlstate 'PT409' using message='context_conflict';end if;
 if s->>'kind'='group' and not exists(select 1 from jsonb_array_elements(ctx#>'{regulation,definition,groupPhases}') p cross join lateral jsonb_array_elements(p.value->'groups') g where (p.value->>'phaseId')::uuid=(s->>'phaseId')::uuid and (g.value->>'id')::uuid=(s->>'groupId')::uuid) then raise sqlstate 'PT400' using message='invalid_achievement_source';end if;
 if s->>'kind'='series' and (not exists(select 1 from jsonb_array_elements(ctx#>'{regulation,definition,series}') n where (n.value->>'id')::uuid=(s->>'finalSeriesId')::uuid) or (s->'bronzeSeriesId'<>'null'::jsonb and not exists(select 1 from jsonb_array_elements(ctx#>'{regulation,definition,series}') n where (n.value->>'id')::uuid=(s->>'bronzeSeriesId')::uuid))) then raise sqlstate 'PT400' using message='invalid_achievement_source';end if;
 for rid in select (r.value#>>'{}')::uuid from jsonb_array_elements(d->'placements') g cross join lateral jsonb_array_elements(g.value->'registrationIds') r loop
  if not exists(select 1 from public.registrations where id=rid and dispute_id=did) then raise sqlstate 'PT400' using message='invalid_achievement_registration';end if;
 end loop;
 for pid in select distinct (r.value#>>'{}')::uuid from jsonb_array_elements(d->'honors') h cross join lateral jsonb_array_elements(h.value->'personIds') r loop
  if not pid=any(locked) then raise sqlstate 'PT400' using message='invalid_achievement_recipient';end if;
 end loop;
 -- Normalize only the draft, retaining the original command for strict replay.
 d:=jsonb_build_object('disputeId',did,'placements',coalesce((select jsonb_agg(jsonb_build_object('position',g.value->'position','registrationIds',(select jsonb_agg((v.value#>>'{}')::uuid order by v.ordinality) from jsonb_array_elements(g.value->'registrationIds') with ordinality v(value,ordinality))) order by g.ordinality) from jsonb_array_elements(d->'placements') with ordinality g(value,ordinality)),'[]'::jsonb),
 'honors',coalesce((select jsonb_agg(jsonb_build_object('id',(h.value->>'id')::uuid,'title',private.achievement_title(h.value->'title'),'personIds',(select jsonb_agg((v.value#>>'{}')::uuid order by v.ordinality) from jsonb_array_elements(h.value->'personIds') with ordinality v(value,ordinality))) order by h.ordinality) from jsonb_array_elements(d->'honors') with ordinality h(value,ordinality)),'[]'::jsonb));
 nv:=coalesce(old,0)+1;now_at:=clock_timestamp();
 insert into private.achievement_draft_versions(dispute_id,version,draft,source,context_snapshot,context_fingerprint,regulation_version,saved_by,saved_at)
 values(did,nv,d,s,ctx,ctx->>'contextFingerprint',nullif((ctx#>>'{regulation,version}')::integer,0),actor,now_at);
 insert into private.achievement_draft_registrations(dispute_id,version,registration_id)
 select did,nv,(r.value#>>'{}')::uuid from jsonb_array_elements(d->'placements') g cross join lateral jsonb_array_elements(g.value->'registrationIds') r;
 for pid in select distinct (r.value#>>'{}')::uuid from jsonb_array_elements(d->'honors') h cross join lateral jsonb_array_elements(h.value->'personIds') r loop
  select id into anchor from public.roster_entries where person_id=pid and dispute_id=did order by started_at,id limit 1;
  insert into private.achievement_draft_people(dispute_id,version,person_id,roster_entry_id) values(did,nv,pid,anchor);
 end loop;
 insert into private.achievement_draft_heads(dispute_id,version) values(did,nv) on conflict(dispute_id) do update set version=excluded.version;
 update public.championships set saved_at=now_at where id=root;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'version',nv,'savedAt',now_at,'contextFingerprint',ctx->'contextFingerprint');
 insert into private.achievement_draft_commands(command_id,actor_id,dispute_id,version,payload,result) values(cmd,actor,did,nv,c,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_achievement_draft';
end$$;
create function private.get_achievement_draft_state(did uuid,off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb;v private.achievement_draft_versions%rowtype;begin
 ctx:=private.get_achievement_context(did);
 if off is null or off not between 0 and 100000 then raise sqlstate 'PT400' using message='invalid_achievement_page';end if;
 select x.* into v from private.achievement_draft_heads h join private.achievement_draft_versions x using(dispute_id,version) where h.dispute_id=did;
 return jsonb_build_object('disputeId',did,'version',coalesce(v.version,0),'draft',v.draft,'source',v.source,'savedAt',v.saved_at,'contextFingerprint',ctx->'contextFingerprint','savedContextFingerprint',v.context_fingerprint,'needsReview',coalesce(v.context_fingerprint<>ctx->>'contextFingerprint',false),
  'history',coalesce((select jsonb_agg(jsonb_build_object('version',x.version,'savedAt',x.saved_at,'actorId',x.saved_by) order by x.version desc) from(select version,saved_at,saved_by from private.achievement_draft_versions where dispute_id=did order by version desc limit 20 offset off) x),'[]'::jsonb),
  'hasMore',(select count(*)>20 from(select 1 from private.achievement_draft_versions where dispute_id=did order by version desc limit 21 offset off) q));
end$$;
create function private.get_achievement_draft_version(did uuid,wanted integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform private.achievement_root(did);
 if wanted is null or wanted<1 then raise sqlstate 'PT400' using message='invalid_achievement_version';end if;
 return (select jsonb_build_object('disputeId',dispute_id,'version',version,'draft',draft,'source',source,'contextSnapshot',context_snapshot,'contextFingerprint',context_fingerprint,'actorId',saved_by,'savedAt',saved_at) from private.achievement_draft_versions where dispute_id=did and version=wanted);
end$$;
create function public.save_achievement_draft(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.save_achievement_draft(p_command)$$;
create function public.get_achievement_draft_state(p_dispute_id uuid,p_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_achievement_draft_state(p_dispute_id,p_offset)$$;
create function public.get_achievement_draft_version(p_dispute_id uuid,p_version integer) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_achievement_draft_version(p_dispute_id,p_version)$$;
revoke all on function private.achievement_title(jsonb),private.valid_achievement_source(jsonb),private.valid_achievement_draft(jsonb),private.valid_achievement_draft_command(jsonb),private.save_achievement_draft(jsonb),private.get_achievement_draft_state(uuid,integer),private.get_achievement_draft_version(uuid,integer),public.save_achievement_draft(jsonb),public.get_achievement_draft_state(uuid,integer),public.get_achievement_draft_version(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.save_achievement_draft(jsonb),private.get_achievement_draft_state(uuid,integer),private.get_achievement_draft_version(uuid,integer),public.save_achievement_draft(jsonb),public.get_achievement_draft_state(uuid,integer),public.get_achievement_draft_version(uuid,integer) to authenticated;
