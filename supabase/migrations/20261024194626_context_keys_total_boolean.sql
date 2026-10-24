-- Closed-object validation is total: absent required keys must be false, never SQL NULL.
-- Preserve the function signature, ownership and explicit privileges of the C1 helper.
create or replace function private.context_keys(value jsonb,keys text[]) returns boolean
language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(value)='object' and keys is not null then
  coalesce((select array_agg(k order by k) from jsonb_object_keys(value) k),'{}'::text[])
  = coalesce((select array_agg(k order by k) from unnest(keys) k),'{}'::text[])
 else false end
$$;
