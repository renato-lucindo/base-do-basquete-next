-- A3: one coherent private browser view, without raw facts or all eligible IDs.
create function private.get_achievement_workspace(did uuid,draft_off integer,pub_off integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ctx jsonb;draft_state jsonb;publication_state jsonb;value jsonb;begin
 ctx:=private.get_achievement_context(did);
 draft_state:=private.get_achievement_draft_state(did,draft_off);
 publication_state:=private.get_achievement_publication_state(did,pub_off)-'published';
 if ctx->>'contextFingerprint'<>draft_state->>'contextFingerprint' or ctx->>'contextFingerprint'<>publication_state->>'contextFingerprint' then raise sqlstate 'PT409' using message='context_conflict';end if;
 value:=jsonb_build_object('disputeId',did,'scope',ctx->'scope','contextFingerprint',ctx->'contextFingerprint','regulationVersion',ctx#>'{regulation,version}',
  'registrations',ctx->'registrations','draft',draft_state,'publication',publication_state,
  'sourceOptions',jsonb_build_object(
   'groups',coalesce((select jsonb_agg(jsonb_build_object('phaseId',p.value->'phaseId','groupId',g.value->'id','phaseName',p.value->'name','name',g.value->'name') order by p.ordinality,g.ordinality) from jsonb_array_elements(ctx#>'{regulation,definition,groupPhases}') with ordinality p(value,ordinality) cross join lateral jsonb_array_elements(p.value->'groups') with ordinality g(value,ordinality)),'[]'::jsonb),
   'series',coalesce((select jsonb_agg(jsonb_build_object('id',n.value->'id','name',n.value->'name','format',n.value->'format') order by n.ordinality) from jsonb_array_elements(ctx#>'{regulation,definition,series}') with ordinality n(value,ordinality)),'[]'::jsonb)),
  'selectedPeople',coalesce((select jsonb_agg(jsonb_build_object('personId',p.id,'version',p.version,'name',p.name,'nickname',p.nickname,'publicBirthYear',p.public_birth_year) order by p.id) from public.persons p where p.id in(select (r.value#>>'{}')::uuid from jsonb_array_elements(draft_state#>'{draft,honors}') h cross join lateral jsonb_array_elements(h.value->'personIds') r)),'[]'::jsonb));
 if octet_length(value::text)>16777216 then raise sqlstate 'PT413' using message='achievement_context_too_large';end if;
 return value;
end$$;
create function public.get_achievement_workspace(p_dispute_id uuid,p_draft_offset integer default 0,p_publication_offset integer default 0) returns jsonb language sql volatile security invoker set search_path='' as $$select private.get_achievement_workspace(p_dispute_id,p_draft_offset,p_publication_offset)$$;
revoke all on function private.get_achievement_workspace(uuid,integer,integer),public.get_achievement_workspace(uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function private.get_achievement_workspace(uuid,integer,integer),public.get_achievement_workspace(uuid,integer,integer) to authenticated;
