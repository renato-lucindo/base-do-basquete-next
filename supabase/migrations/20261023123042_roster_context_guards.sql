-- These invoker triggers enforce compatibility even for other narrow writers.
create function private.guard_athlete_roster_context() returns trigger language plpgsql volatile security invoker set search_path='' as $$
declare root uuid;
begin
 if new.sex is not distinct from old.sex then return new;end if;
 for root in select distinct s.championship_id from public.roster_entries r join public.disputes d on d.id=r.dispute_id
 join public.seasons s on s.id=d.season_id where r.person_id=new.person_id and r.ended_at is null order by s.championship_id loop
  perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 end loop;
 if exists(select 1 from public.roster_entries r join public.disputes d on d.id=r.dispute_id
 where r.person_id=new.person_id and r.ended_at is null and new.sex<>case when d.gender='feminino' then 'female' else 'male' end)
 then raise sqlstate 'PT400' using message='active_roster_sex_conflict';end if;
 return new;
end
$$;
create trigger athlete_roster_context before update of sex on private.athletes for each row execute function private.guard_athlete_roster_context();
create function private.guard_dispute_roster_context() returns trigger language plpgsql volatile security invoker set search_path='' as $$
declare root uuid;
begin
 if new.gender is not distinct from old.gender then return new;end if;
 select championship_id into root from public.seasons where id=new.season_id;
 perform pg_advisory_xact_lock(hashtextextended('competition:'||root::text,0));
 if exists(select 1 from public.roster_entries r join private.athletes a on a.person_id=r.person_id
 where r.dispute_id=new.id and r.ended_at is null and a.sex<>case when new.gender='feminino' then 'female' else 'male' end)
 then raise sqlstate 'PT400' using message='active_roster_gender_conflict';end if;
 return new;
end
$$;
create trigger dispute_roster_context before update of gender on public.disputes for each row execute function private.guard_dispute_roster_context();
revoke all on function private.guard_athlete_roster_context(),private.guard_dispute_roster_context() from public,anon,authenticated,service_role;
