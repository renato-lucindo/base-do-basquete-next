-- Conservative full-name suggestions adapted from the supplied compatibility package.
-- No identity writes, schema transplant, extension dependency or browser-authoritative matching.
create function private.import_name_distance(a text,b text) returns integer language plpgsql immutable strict security invoker set search_path='' as $$
declare row integer[];i integer;j integer;diagonal integer;upper integer;
begin
 if length(a)>120 or length(b)>120 then return 121;end if;
 row:=array(select generate_series(0,length(b)));
 for i in 1..length(a) loop
  diagonal:=row[1];row[1]:=i;
  for j in 1..length(b) loop
   upper:=row[j+1];
   row[j+1]:=least(row[j+1]+1,row[j]+1,diagonal+case when substr(a,i,1)=substr(b,j,1) then 0 else 1 end);
   diagonal:=upper;
  end loop;
 end loop;
 return row[length(b)+1];
end$$;
create function private.import_name_similarity(p_left text,p_right text) returns double precision language plpgsql immutable strict security invoker set search_path='' as $$
declare a text;b text;at text[];bt text[];i integer;d integer;s double precision;n integer;
begin
 if length(p_left)>120 or length(p_right)>120 then return 0;end if;
 a:=private.person_name_key(p_left);b:=private.person_name_key(p_right);
 if a='' or b='' then return 0;end if;
 if a=b then return 1;end if;
 at:=array(select t from unnest(string_to_array(a,' ')) t where t<>'' and t not in('da','das','de','do','dos','e'));
 bt:=array(select t from unnest(string_to_array(b,' ')) t where t<>'' and t not in('da','das','de','do','dos','e'));
 if cardinality(at)<2 or cardinality(at)<>cardinality(bt) then return 0;end if;
 for i in 1..cardinality(at) loop
  if length(at[i])<2 or length(bt[i])<2 then return 0;end if;
  n:=greatest(length(at[i]),length(bt[i]));
  if abs(length(at[i])-length(bt[i]))>greatest(1,floor(n*0.22)::integer) then return 0;end if;
  d:=private.import_name_distance(at[i],bt[i]);s:=1-d::double precision/n;
  if d>1 and not(length(at[i])>=8 and length(bt[i])>=8 and s>=0.78) then return 0;end if;
 end loop;
 a:=array_to_string(at,' ');b:=array_to_string(bt,' ');n:=greatest(length(a),length(b));
 s:=1-private.import_name_distance(a,b)::double precision/n;
 return case when s>=0.78 then s else 0 end;
end$$;
revoke all on function private.import_name_distance(text,text),private.import_name_similarity(text,text) from public,anon,authenticated,service_role;
grant execute on function private.import_name_distance(text,text),private.import_name_similarity(text,text) to authenticated;

create or replace function public.match_import_players(p_dispute_id uuid,p_registration_id uuid,p_players jsonb) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare probe jsonb;candidate record;items jsonb:='[]';candidates jsonb;key text;nick text;score integer;exact_names integer;found_reg boolean;more boolean;status text;counted integer;
begin
 if not exists(select 1 from public.admin_access a where a.user_id=auth.uid() and a.enabled) then raise sqlstate 'PT403' using message='forbidden';end if;
 if not exists(select 1 from public.disputes where id=p_dispute_id) or (p_registration_id is not null and not exists(select 1 from public.registrations where id=p_registration_id and dispute_id=p_dispute_id)) or jsonb_typeof(p_players) is distinct from 'array' or jsonb_array_length(p_players) not between 1 and 50 or octet_length(p_players::text)>65536 then raise sqlstate 'PT400' using message='invalid_match';end if;
 for probe in select value from jsonb_array_elements(p_players) loop
  if not private.context_keys(probe,array['rowId','name','nickname','birthDate','birthYear','federationRegistration']) or (probe->>'rowId')::uuid is null or jsonb_typeof(probe->'name') is distinct from 'string' or length(btrim(probe->>'name')) not between 1 and 120 or jsonb_typeof(probe->'nickname') not in('string','null') or length(probe->>'nickname')>120 or jsonb_typeof(probe->'federationRegistration') not in('string','null') or (probe->'federationRegistration'<>'null'::jsonb and (probe->>'federationRegistration')!~'^[0-9]{6}$') or jsonb_typeof(probe->'birthDate') not in('string','null') or jsonb_typeof(probe->'birthYear') not in('number','null') then raise sqlstate 'PT400' using message='invalid_match';end if;
  if probe->'birthDate'<>'null'::jsonb then if (probe->>'birthDate')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT400' using message='invalid_match';end if;perform (probe->>'birthDate')::date;end if;
  if probe->'birthYear'<>'null'::jsonb and ((probe->>'birthYear')!~'^[0-9]+$' or (probe->>'birthYear')::integer not between 1 and 9999) then raise sqlstate 'PT400' using message='invalid_match';end if;
  key:=private.person_name_key(probe->>'name');nick:=private.person_name_key(probe->>'nickname');candidates:='[]';exact_names:=0;found_reg:=false;counted:=0;more:=false;
  for candidate in
   select p.id,case when a.federation_registration=probe->>'federationRegistration' then 0 when p.name_key=key then 1 else 2 end as rank
   from public.persons p left join private.athletes a on a.person_id=p.id
   where a.federation_registration=probe->>'federationRegistration' or (key<>'' and p.name_key=key) or
    private.import_name_similarity(p.name,probe->>'name')>=0.78
   order by rank, private.import_name_similarity(p.name,probe->>'name') desc,
    case when probe->>'birthDate' is not null and a.birth_date=(probe->>'birthDate')::date then 0
     when probe->>'birthYear' is not null and coalesce(a.birth_year,extract(year from a.birth_date)::integer)=(probe->>'birthYear')::integer then 1
     when length(nick)>=2 and private.person_name_key(p.nickname)=nick then 2 else 3 end,p.id limit 6
  loop
   counted:=counted+1;if counted>5 then more:=true;exit;end if;
   if candidate.rank=0 then found_reg:=true;end if;if candidate.rank=1 then exact_names:=exact_names+1;end if;
   candidates:=candidates||jsonb_build_array(public.get_import_person(candidate.id,p_dispute_id,p_registration_id));
  end loop;
  status:=case when found_reg then 'registration' when exact_names>1 then 'ambiguous' when exact_names=1 then 'name' when counted>0 then 'suggestion' else 'new' end;
  items:=items||jsonb_build_array(jsonb_build_object('rowId',probe->'rowId','status',status,'candidates',candidates,'hasMore',more));
 end loop;
 return jsonb_build_object('items',items);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then raise sqlstate 'PT400' using message='invalid_match';
end$$;
