-- A2c: explicit confirmation of an existing reviewed draft, separate from saving it.
create function private.achievement_confirmation_reason(v jsonb) returns text language plpgsql immutable security invoker set search_path='' as $$
declare t text;begin
 if jsonb_typeof(v) is distinct from 'string' then return null;end if;
 t:=btrim(v#>>'{}',E' \t\n\r\f'||chr(11)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279));
 if t='' then return '';end if;return private.occurrence_reason(v);
end$$;
create function private.valid_achievement_confirmation(c jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare r text;begin
 if not private.context_keys(c,array['commandId','disputeId','expectedDraftVersion','expectedPublicationVersion','expectedContextFingerprint','reason','acknowledgeImpact'])
 or not private.regulation_uuid(c->'commandId') or not private.regulation_uuid(c->'disputeId') or not private.regulation_integer(c->'expectedDraftVersion',1,2147483647) or not private.regulation_integer(c->'expectedPublicationVersion',0,2147483646)
 or jsonb_typeof(c->'expectedContextFingerprint') is distinct from 'string' or (c->>'expectedContextFingerprint')!~'^[a-f0-9]{64}$' or c->'acknowledgeImpact' is distinct from 'true'::jsonb then return false;end if;
 r:=private.achievement_confirmation_reason(c->'reason');
 return r is not null and ((c->>'expectedPublicationVersion')::numeric=0 or length(r)>=3);
end$$;
create table private.achievement_publication_versions(
 dispute_id uuid not null references public.disputes(id) on delete restrict,version integer not null check(version>0),draft_version integer not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=16777216),
 context_fingerprint text not null check(context_fingerprint~'^[a-f0-9]{64}$'),reason text not null check(length(reason)<=2000),
 confirmed_by uuid not null references auth.users(id) on delete restrict,confirmed_at timestamptz not null,
 primary key(dispute_id,version),foreign key(dispute_id,draft_version) references private.achievement_draft_versions(dispute_id,version) on delete restrict,
 check((snapshot->>'disputeId')::uuid=dispute_id and (snapshot->>'version')::integer=version)
);
create index achievement_publication_draft on private.achievement_publication_versions(dispute_id,draft_version);
create index achievement_publication_actor on private.achievement_publication_versions(confirmed_by);
create table public.published_achievements(
 dispute_id uuid primary key references public.disputes(id) on delete restrict,version integer not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=16777216),confirmed_at timestamptz not null,
 foreign key(dispute_id,version) references private.achievement_publication_versions(dispute_id,version) on delete restrict,
 check((snapshot->>'disputeId')::uuid=dispute_id and (snapshot->>'version')::integer=version)
);
create index published_achievement_version on public.published_achievements(dispute_id,version);
create table private.achievement_publication_commands(
 command_id uuid primary key,actor_id uuid not null references auth.users(id) on delete restrict,
 dispute_id uuid not null,version integer not null,payload jsonb not null check(private.valid_achievement_confirmation(payload)),result jsonb not null,
 foreign key(dispute_id,version) references private.achievement_publication_versions(dispute_id,version) on delete restrict
);
create index achievement_publication_command_actor on private.achievement_publication_commands(actor_id);
create index achievement_publication_command_version on private.achievement_publication_commands(dispute_id,version);
alter table private.achievement_publication_versions enable row level security;
alter table private.achievement_publication_commands enable row level security;
alter table public.published_achievements enable row level security;
revoke all on private.achievement_publication_versions,private.achievement_publication_commands,public.published_achievements from public,anon,authenticated,service_role;
create policy deny_achievement_publication_versions on private.achievement_publication_versions as restrictive for all to public using(false) with check(false);
create policy deny_achievement_publication_commands on private.achievement_publication_commands as restrictive for all to public using(false) with check(false);
grant select on public.published_achievements to anon,authenticated;
create policy read_confirmed_achievements on public.published_achievements for select to anon,authenticated using(true);
create trigger achievement_publication_versions_immutable before update or delete on private.achievement_publication_versions for each row execute function private.regulation_history_immutable();
create trigger achievement_publication_commands_immutable before update or delete on private.achievement_publication_commands for each row execute function private.regulation_history_immutable();

create function private.confirm_achievements(c jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();cmd uuid;did uuid;root uuid;current_root uuid;pid uuid;locked uuid[];current_people uuid[];pv integer;dv integer;nv integer;now_at timestamptz;
 receipt private.achievement_publication_commands%rowtype;d private.achievement_draft_versions%rowtype;ctx jsonb;payload jsonb;result jsonb;msg text;
begin
 perform 1 from public.admin_access a where a.user_id=actor and a.enabled for share;
 if not found then raise sqlstate 'PT403' using message='forbidden';end if;
 if not coalesce(private.valid_achievement_confirmation(c),false) then raise sqlstate 'PT400' using message='invalid_achievement_confirmation';end if;
 cmd:=(c->>'commandId')::uuid;did:=(c->>'disputeId')::uuid;msg:=private.achievement_confirmation_reason(c->'reason');
 perform pg_advisory_xact_lock(hashtextextended('achievement-publication-command:'||cmd::text,0));
 select * into receipt from private.achievement_publication_commands where command_id=cmd;
 if found then
  if receipt.actor_id<>actor then raise sqlstate 'PT403' using message='forbidden';end if;
  if receipt.payload<>c then raise sqlstate 'PT409' using message='idempotency_conflict';end if;
  return receipt.result;
 end if;
 select s.championship_id into root from public.disputes di join public.seasons s on s.id=di.season_id where di.id=did;
 if root is null then raise sqlstate 'PT404' using message='achievement_context_not_found';end if;
 locked:='{}';
 for pid in select p.id from public.persons p join private.athletes a on a.person_id=p.id where exists(select 1 from public.roster_entries r where r.person_id=p.id and r.dispute_id=did) order by p.id limit 10001 for share of p,a loop locked:=array_append(locked,pid);end loop;
 if cardinality(locked)>10000 then raise sqlstate 'PT413' using message='achievement_context_too_large';end if;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 current_root:=private.achievement_root(did);
 if current_root<>root then raise sqlstate 'PT409' using message='achievement_context_changed';end if;
 select coalesce(array_agg(distinct person_id order by person_id),'{}') into current_people from public.roster_entries where dispute_id=did;
 if current_people<>locked then raise sqlstate 'PT409' using message='context_conflict';end if;
 select version into dv from private.achievement_draft_heads where dispute_id=did for update;
 select version into pv from public.published_achievements where dispute_id=did for update;
 if dv is null or dv<>(c->>'expectedDraftVersion')::numeric::integer or coalesce(pv,0)<>(c->>'expectedPublicationVersion')::numeric::integer then raise sqlstate 'PT409' using message='version_conflict';end if;
 select * into d from private.achievement_draft_versions where dispute_id=did and version=dv;
 ctx:=private.get_achievement_context(did);
 if ctx->>'contextFingerprint'<>c->>'expectedContextFingerprint' or ctx->>'contextFingerprint'<>d.context_fingerprint then raise sqlstate 'PT409' using message='achievement_review_required';end if;
 if pv is null and jsonb_array_length(d.draft->'placements')=0 and jsonb_array_length(d.draft->'honors')=0 then raise sqlstate 'PT400' using message='empty_achievement_confirmation';end if;
 -- The source, recipients and names are server-owned. No public document is accepted.
 nv:=coalesce(pv,0)+1;now_at:=clock_timestamp();
 payload:=jsonb_build_object('disputeId',did,'version',nv,'confirmedAt',now_at,'context',ctx->'scope',
  'placements',coalesce((select jsonb_agg(jsonb_build_object('position',g.value->'position','registrations',
   (select jsonb_agg(jsonb_build_object('registrationId',r.id,'teamId',r.team_id,'name',r.name) order by n.ordinality) from jsonb_array_elements(g.value->'registrationIds') with ordinality n(value,ordinality) join public.registrations r on r.id=(n.value#>>'{}')::uuid and r.dispute_id=did)) order by g.ordinality) from jsonb_array_elements(d.draft->'placements') with ordinality g(value,ordinality)),'[]'::jsonb),
  'honors',coalesce((select jsonb_agg(jsonb_build_object('id',h.value->'id','title',h.value->'title','athletes',
   (select jsonb_agg(jsonb_build_object('personId',p.id,'name',p.name,'nickname',p.nickname,'publicBirthYear',p.public_birth_year) order by n.ordinality) from jsonb_array_elements(h.value->'personIds') with ordinality n(value,ordinality) join public.persons p on p.id=(n.value#>>'{}')::uuid)) order by h.ordinality) from jsonb_array_elements(d.draft->'honors') with ordinality h(value,ordinality)),'[]'::jsonb));
 insert into private.achievement_publication_versions(dispute_id,version,draft_version,snapshot,context_fingerprint,reason,confirmed_by,confirmed_at) values(did,nv,dv,payload,d.context_fingerprint,msg,actor,now_at);
 insert into public.published_achievements(dispute_id,version,snapshot,confirmed_at) values(did,nv,payload,now_at) on conflict(dispute_id) do update set version=excluded.version,snapshot=excluded.snapshot,confirmed_at=excluded.confirmed_at;
 update public.championships set saved_at=now_at where id=root;
 result:=jsonb_build_object('commandId',cmd,'disputeId',did,'version',nv,'draftVersion',dv,'confirmedAt',now_at);
 insert into private.achievement_publication_commands(command_id,actor_id,dispute_id,version,payload,result) values(cmd,actor,did,nv,c,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value or not_null_violation or check_violation or unique_violation or foreign_key_violation then raise sqlstate 'PT400' using message='invalid_achievement_confirmation';
end$$;
create function private.get_achievement_publication_state(did uuid,off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb;v private.achievement_publication_versions%rowtype;dv integer;begin
 ctx:=private.get_achievement_context(did);
 if off is null or off not between 0 and 100000 then raise sqlstate 'PT400' using message='invalid_achievement_page';end if;
 select version into dv from private.achievement_draft_heads where dispute_id=did;
 select x.* into v from public.published_achievements h join private.achievement_publication_versions x using(dispute_id,version) where h.dispute_id=did;
 return jsonb_build_object('disputeId',did,'version',coalesce(v.version,0),'draftVersion',coalesce(dv,0),'confirmedDraftVersion',v.draft_version,'contextFingerprint',ctx->'contextFingerprint','confirmedContextFingerprint',v.context_fingerprint,
  'sourceChanged',coalesce(v.context_fingerprint<>ctx->>'contextFingerprint',false),'draftChanged',coalesce(dv<>v.draft_version,false),'published',v.snapshot,
  'history',coalesce((select jsonb_agg(jsonb_build_object('version',x.version,'draftVersion',x.draft_version,'confirmedAt',x.confirmed_at,'actorId',x.confirmed_by,'reason',x.reason) order by x.version desc) from(select * from private.achievement_publication_versions where dispute_id=did order by version desc limit 20 offset off) x),'[]'::jsonb),
  'hasMore',(select count(*)>20 from(select 1 from private.achievement_publication_versions where dispute_id=did order by version desc limit 21 offset off) q));
end$$;
create function private.get_achievement_publication_version(did uuid,wanted integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform private.achievement_root(did);
 if wanted is null or wanted<1 then raise sqlstate 'PT400' using message='invalid_achievement_version';end if;
 return (select jsonb_build_object('disputeId',dispute_id,'version',version,'draftVersion',draft_version,'confirmedAt',confirmed_at,'actorId',confirmed_by,'reason',reason,'contextFingerprint',context_fingerprint,'snapshot',snapshot) from private.achievement_publication_versions where dispute_id=did and version=wanted);
end$$;
create function public.confirm_achievements(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select private.confirm_achievements(p_command)$$;
create function public.get_achievement_publication_state(p_dispute_id uuid,p_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_achievement_publication_state(p_dispute_id,p_offset)$$;
create function public.get_achievement_publication_version(p_dispute_id uuid,p_version integer) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_achievement_publication_version(p_dispute_id,p_version)$$;
create function public.get_public_achievements(p_dispute_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select snapshot from public.published_achievements where dispute_id=p_dispute_id$$;
revoke all on function private.achievement_confirmation_reason(jsonb),private.valid_achievement_confirmation(jsonb),private.confirm_achievements(jsonb),private.get_achievement_publication_state(uuid,integer),private.get_achievement_publication_version(uuid,integer),public.confirm_achievements(jsonb),public.get_achievement_publication_state(uuid,integer),public.get_achievement_publication_version(uuid,integer),public.get_public_achievements(uuid) from public,anon,authenticated,service_role;
grant execute on function private.confirm_achievements(jsonb),private.get_achievement_publication_state(uuid,integer),private.get_achievement_publication_version(uuid,integer),public.confirm_achievements(jsonb),public.get_achievement_publication_state(uuid,integer),public.get_achievement_publication_version(uuid,integer) to authenticated;
grant execute on function public.get_public_achievements(uuid) to anon,authenticated;
