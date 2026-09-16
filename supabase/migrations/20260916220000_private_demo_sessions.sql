-- Private demo farms through anonymous sign-in. Each browser that starts the
-- demo becomes its own anonymous user, so the existing onboarding trigger
-- gives it its own farm and nobody shares edits.

-- Anonymous users have no email, so the name fallback needs a final default.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org uuid;
begin
  insert into public.organizations (name, demo_as_of)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_name'), ''), 'Bays Ranch'),
    date '2026-04-22'
  )
  returning id into new_org;

  insert into public.profiles (id, organization_id, full_name, role)
  values (
    new.id,
    new_org,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Demo Admin'
    ),
    'admin'
  );

  perform private.seed_demo_org(new_org);
  return new;
end;
$$;

-- Removes anonymous demo accounts nobody has used in two weeks, along with
-- their farms, so abandoned demos don't accumulate.
create function private.purge_stale_demo_accounts()
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
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '14 days'
    and not exists (
      select 1 from public.activity_logs l
      where l.organization_id = p.organization_id
        and l.updated_at >= now() - interval '14 days'
    );

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
revoke execute on function private.purge_stale_demo_accounts() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule(
  'purge-stale-demo-accounts',
  '17 9 * * *',
  'select private.purge_stale_demo_accounts()'
);
