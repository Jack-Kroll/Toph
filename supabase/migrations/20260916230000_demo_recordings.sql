-- Link seeded demo logs to real recordings. The files live in the private
-- "recordings" bucket under demo/ (source: supabase/demo-audio), named
-- <employee-slug>-<local date>.m4a, and every signed-in user may read them.

create function private.attach_demo_audio(target_org uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.activity_logs l
  set audio_path = 'demo/' || f.slug || '.m4a'
  from public.employees e, public.organizations o, (values
    ('ava-martinez-2026-04-22'), ('emma-nguyen-2026-04-09'),
    ('ethan-brooks-2026-04-22'), ('harper-diaz-2026-03-24'),
    ('isaac-wang-2026-04-13'), ('isaac-wang-2026-04-19'),
    ('liam-johnson-2026-04-21'), ('lucas-rivera-2026-04-22'),
    ('mason-clark-2026-04-16'), ('maya-patel-2026-03-18'),
    ('maya-patel-2026-04-20'), ('noah-garcia-2026-04-22'),
    ('olivia-chen-2026-04-06'), ('sophia-lee-2026-04-22')
  ) as f(slug)
  where l.organization_id = target_org
    and o.id = l.organization_id
    and e.id = l.employee_id
    and l.audio_path is null
    and f.slug = lower(replace(e.full_name, ' ', '-')) || '-'
      || to_char(l.started_at at time zone o.timezone, 'YYYY-MM-DD')
$$;
revoke execute on function private.attach_demo_audio(uuid) from public, anon, authenticated;

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
  perform private.attach_demo_audio(new_org);
  return new;
end;
$$;

create or replace function public.reset_demo_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org uuid := private.current_org_id();
begin
  if org is null or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Only organization admins can reset demo data' using errcode = '42501';
  end if;

  if not exists (select 1 from public.organizations where id = org and demo_as_of is not null) then
    raise exception 'Only demo organizations can be reset' using errcode = '42501';
  end if;

  delete from public.activity_logs where organization_id = org;
  delete from public.tags where organization_id = org;
  delete from public.employees where organization_id = org;
  delete from public.fields where organization_id = org;
  perform private.seed_demo_org(org);
  perform private.attach_demo_audio(org);
end;
$$;

-- Backfill farms created before this migration.
select private.attach_demo_audio(id)
from public.organizations
where demo_as_of is not null;
