-- Judge demo activity by the last session refresh. Anonymous users rarely
-- "sign in" again; the app keeps them signed in by refreshing the session.
create or replace function private.purge_stale_demo_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_orgs uuid[];
  removed integer;
begin
  select coalesce(array_agg(distinct p.organization_id), '{}')
  into stale_orgs
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.is_anonymous
    and greatest(
      u.created_at,
      u.last_sign_in_at,
      (select max(coalesce(s.refreshed_at, s.updated_at))
         from auth.sessions s where s.user_id = u.id)
    ) < now() - interval '14 days';

  -- Logs first: they restrict deletes of the employees and fields they use.
  delete from public.activity_logs where organization_id = any (stale_orgs);
  delete from auth.users u
  using public.profiles p
  where p.id = u.id and u.is_anonymous and p.organization_id = any (stale_orgs);
  get diagnostics removed = row_count;
  delete from public.organizations where id = any (stale_orgs);
  return removed;
end;
$$;
