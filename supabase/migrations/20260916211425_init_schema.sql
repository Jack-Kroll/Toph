-- Toph core schema: multi-tenant farm activity logging.
--
-- Every business row carries organization_id. Row-level security scopes all
-- reads and writes to the signed-in user's organization, so the browser can
-- talk to Postgres directly with the publishable key.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  timezone text not null default 'America/Chicago',
  -- Pins "today" for demo organizations so seeded data matches the design.
  -- Null means the organization uses the real current date.
  demo_as_of date,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'manager', 'viewer')),
  avatar_url text,
  created_at timestamptz not null default now()
);
create index profiles_organization_id_idx on public.profiles (organization_id);

-- Runs as the table owner so RLS policies on profiles can call it without
-- recursing into themselves.
create function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.profiles where id = (select auth.uid())
$$;
revoke execute on function private.current_org_id() from public, anon;
grant execute on function private.current_org_id() to authenticated;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_org_id()
    references public.organizations (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role text not null default 'Field Hand',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_org_id()
    references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  crop text,
  acres numeric(8, 2) check (acres > 0),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_org_id()
    references public.organizations (id) on delete cascade,
  employee_id uuid not null,
  field_id uuid not null,
  activity_type text not null check (activity_type in (
    'Spraying', 'Fertilizing', 'Planting', 'Irrigation', 'Harvesting',
    'Scouting', 'Pruning', 'Soil Work', 'Equipment Maintenance'
  )),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  -- What was applied, the product's most common reason to exist.
  product_name text,
  application_rate numeric(10, 3) check (application_rate >= 0),
  rate_unit text,
  transcript text,
  audio_path text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  response_accuracy numeric(5, 2) check (response_accuracy between 0 and 100),
  reviewed_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at >= started_at),
  -- Composite keys stop a log from pointing at another farm's worker or field.
  foreign key (organization_id, employee_id)
    references public.employees (organization_id, id) on delete restrict,
  foreign key (organization_id, field_id)
    references public.fields (organization_id, id) on delete restrict,
  unique (organization_id, id)
);
create index activity_logs_org_started_idx
  on public.activity_logs (organization_id, started_at desc);
create index activity_logs_employee_idx on public.activity_logs (organization_id, employee_id);
create index activity_logs_field_idx on public.activity_logs (organization_id, field_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_org_id()
    references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index tags_org_name_idx on public.tags (organization_id, lower(name));

create table public.activity_log_tags (
  organization_id uuid not null default private.current_org_id()
    references public.organizations (id) on delete cascade,
  activity_log_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (activity_log_id, tag_id),
  foreign key (organization_id, activity_log_id)
    references public.activity_logs (organization_id, id) on delete cascade,
  foreign key (organization_id, tag_id)
    references public.tags (organization_id, id) on delete cascade
);
create index activity_log_tags_tag_idx on public.activity_log_tags (tag_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger activity_logs_set_updated_at
  before update on public.activity_logs
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.fields enable row level security;
alter table public.activity_logs enable row level security;
alter table public.tags enable row level security;
alter table public.activity_log_tags enable row level security;

revoke all on all tables in schema public from anon;

grant select on public.organizations to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on
  public.employees, public.fields, public.activity_logs, public.tags, public.activity_log_tags
  to authenticated;

create policy "Members read their organization"
  on public.organizations for select to authenticated
  using (id = (select private.current_org_id()));

create policy "Members read profiles in their organization"
  on public.profiles for select to authenticated
  using (organization_id = (select private.current_org_id()));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array['employees', 'fields', 'activity_logs', 'tags', 'activity_log_tags'] loop
    execute format(
      'create policy "Members manage %1$s in their organization" on public.%1$I
         for all to authenticated
         using (organization_id = (select private.current_org_id()))
         with check (organization_id = (select private.current_org_id()))',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard metrics
-- ---------------------------------------------------------------------------

-- Security invoker: the caller's RLS policies apply to every count.
create function public.dashboard_stats()
returns table (
  as_of date,
  todays_recordings integer,
  todays_new integer,
  active_workers integer,
  response_accuracy integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with org as (
    select
      o.id,
      o.timezone,
      coalesce(o.demo_as_of, (now() at time zone o.timezone)::date) as as_of
    from public.organizations o
    where o.id = (select private.current_org_id())
  ),
  logs as (
    select l.*, (l.started_at at time zone org.timezone)::date as local_date, org.as_of
    from public.activity_logs l
    join org on org.id = l.organization_id
  )
  select
    org.as_of,
    (select count(*) from logs where local_date = logs.as_of)::integer,
    (select count(*) from logs where local_date = logs.as_of and reviewed_at is null)::integer,
    (select count(*) from public.employees e where e.organization_id = org.id and e.is_active)::integer,
    (select round(avg(response_accuracy)) from logs
      where date_trunc('month', local_date) = date_trunc('month', logs.as_of))::integer
  from org
$$;
revoke execute on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Demo data and onboarding
-- ---------------------------------------------------------------------------

-- Populates an organization with the farm shown in the design. Used for every
-- new account so each reviewer gets a private, editable copy.
create function private.seed_demo_org(target_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text := 'America/Chicago';
begin
  insert into public.employees (organization_id, full_name, role) values
    (target_org, 'Isaac Wang', 'Spray Technician'),
    (target_org, 'Maya Patel', 'Harvest Crew Lead'),
    (target_org, 'Liam Johnson', 'Equipment Operator'),
    (target_org, 'Sophia Lee', 'Irrigation Specialist'),
    (target_org, 'Noah Garcia', 'Field Hand'),
    (target_org, 'Ava Martinez', 'Agronomist'),
    (target_org, 'Ethan Brooks', 'Equipment Operator'),
    (target_org, 'Olivia Chen', 'Field Hand'),
    (target_org, 'Lucas Rivera', 'Mechanic'),
    (target_org, 'Emma Nguyen', 'Scout'),
    (target_org, 'Mason Clark', 'Field Hand'),
    (target_org, 'Harper Diaz', 'Field Hand');

  insert into public.fields (organization_id, name, crop, acres, latitude, longitude) values
    (target_org, 'Field A', 'Corn', 160, 41.2172, -96.6205),
    (target_org, 'Field B', 'Winter Wheat', 130, 41.2141, -96.6118),
    (target_org, 'Field C', 'Soybeans', 200, 41.2098, -96.6237),
    (target_org, 'Field D', 'Alfalfa', 85, 41.2066, -96.6142);

  insert into public.activity_logs (
    organization_id, employee_id, field_id, activity_type, started_at, ended_at,
    product_name, application_rate, rate_unit, transcript, latitude, longitude,
    response_accuracy, reviewed_at, created_by
  )
  select
    target_org, e.id, f.id, v.activity, v.starts::timestamp at time zone tz,
    v.ends::timestamp at time zone tz, v.product, v.rate, v.unit, v.transcript,
    f.latitude + v.dlat, f.longitude + v.dlng, v.accuracy,
    case when v.reviewed then v.ends::timestamp at time zone tz + interval '2 hours' end,
    null
  from (values
    -- The four unreviewed logs shown in the design.
    ('Isaac Wang', 'Field A', 'Spraying', '2026-04-19 06:00', '2026-04-19 10:40',
      'Glyphosate 41%', 32.0, 'fl oz/ac',
      $t$Offline guided voice log created at 2026-04-08T22:01:07.711Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: I’m leaving first, I’m going to go home. Question (field_block): Where were you working (field, block, or area)? Answer: yes, in one part and then 130 and 200 yes, and 130 for uh 160 and no, this yes no, no, uhm no no I remember, uhm uhm uhm, no, I don’t remember anything.$t$,
      0.0004, 0.0011, 92, false),
    ('Maya Patel', 'Field B', 'Harvesting', '2026-04-20 07:30', '2026-04-20 11:15',
      null, null, null,
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Harvesting, we cut the north half of the wheat. Question (field_block): Where were you working? Answer: Field B, north block, rows one through forty. Question (notes): Anything to flag? Answer: Combine header was clogging near the wet spot by the culvert, we went around it.$t$,
      -0.0006, 0.0003, 88, false),
    ('Liam Johnson', 'Field C', 'Planting', '2026-04-21 08:00', '2026-04-21 12:00',
      'Soybean seed, group 2.4', 140000, 'seeds/ac',
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Planting soybeans. Question (field_block): Where were you working? Answer: Field C, the whole west side. Question (notes): Anything to flag? Answer: Planter row six was skipping for maybe ten minutes before I caught it, I marked it on the monitor.$t$,
      0.0002, -0.0008, 95, false),
    ('Sophia Lee', 'Field D', 'Irrigation', '2026-04-22 06:30', '2026-04-22 09:30',
      null, 1.2, 'in',
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Irrigation, ran the pivot on D. Question (field_block): Where were you working? Answer: Field D, full circle. Question (notes): Anything to flag? Answer: Pressure dropped around tower four, might be a leak, somebody should look at it today.$t$,
      -0.0003, 0.0005, 85, false),
    -- Reviewed logs from the same day, counted in Today's Recordings.
    ('Noah Garcia', 'Field A', 'Scouting', '2026-04-22 07:00', '2026-04-22 08:15',
      null, null, null,
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Scouting the corn for cutworm. Question (field_block): Where were you working? Answer: Field A, south end. Question (notes): Anything to flag? Answer: Found a few cut plants, under threshold for now.$t$,
      -0.0007, -0.0004, 90, true),
    ('Ava Martinez', 'Field B', 'Fertilizing', '2026-04-22 08:00', '2026-04-22 11:30',
      'UAN 32%', 18.0, 'gal/ac',
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Top-dress nitrogen on the wheat. Question (field_block): Where were you working? Answer: Field B, south block. Question (notes): Anything to flag? Answer: Wind picked up after ten, stayed under label limit.$t$,
      0.0005, -0.0006, 93, true),
    ('Ethan Brooks', 'Field C', 'Soil Work', '2026-04-22 09:00', '2026-04-22 13:00',
      null, null, null,
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Soil work, field cultivator ahead of the planter. Question (field_block): Where were you working? Answer: Field C, east side. Question (notes): Anything to flag? Answer: Nothing, ground worked up nice.$t$,
      -0.0004, 0.0009, 87, true),
    ('Lucas Rivera', 'Field D', 'Equipment Maintenance', '2026-04-22 13:00', '2026-04-22 15:30',
      null, null, null,
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Equipment maintenance on the pivot. Question (field_block): Where were you working? Answer: Field D, tower four. Question (notes): Anything to flag? Answer: Replaced a cracked coupler, pressure is back to normal.$t$,
      0.0006, 0.0002, 91, true),
    -- Earlier this month.
    ('Olivia Chen', 'Field A', 'Planting', '2026-04-06 07:00', '2026-04-06 14:00',
      'Corn seed, 108-day', 34000, 'seeds/ac',
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Planting corn. Question (field_block): Where were you working? Answer: Field A, all of it. Question (notes): Anything to flag? Answer: Finished before the rain.$t$,
      0.0001, 0.0002, 89, true),
    ('Emma Nguyen', 'Field B', 'Scouting', '2026-04-09 08:30', '2026-04-09 10:00',
      null, null, null,
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Scouting wheat for rust. Question (field_block): Where were you working? Answer: Field B. Question (notes): Anything to flag? Answer: Some stripe rust on the lower leaves along the tree line.$t$,
      0.0003, 0.0004, 94, true),
    ('Isaac Wang', 'Field B', 'Spraying', '2026-04-13 06:15', '2026-04-13 09:45',
      'Propiconazole 41.8%', 4.0, 'fl oz/ac',
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Spraying fungicide for the rust. Question (field_block): Where were you working? Answer: Field B, whole field. Question (notes): Anything to flag? Answer: Re-entry is twelve hours, posted the signs.$t$,
      -0.0002, 0.0001, 86, true),
    ('Mason Clark', 'Field D', 'Pruning', '2026-04-16 10:00', '2026-04-16 12:30',
      null, null, null,
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Pruning, cleared the windbreak along the pivot track. Question (field_block): Where were you working? Answer: Field D, west edge. Question (notes): Anything to flag? Answer: No.$t$,
      0.0008, -0.0002, 90, true),
    -- Last month.
    ('Harper Diaz', 'Field C', 'Fertilizing', '2026-03-24 07:30', '2026-03-24 12:00',
      'Potash 0-0-60', 150, 'lb/ac',
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Spreading potash. Question (field_block): Where were you working? Answer: Field C. Question (notes): Anything to flag? Answer: Spreader bearing is getting loud.$t$,
      0.0000, 0.0003, 84, true),
    ('Maya Patel', 'Field D', 'Soil Work', '2026-03-18 08:00', '2026-03-18 11:00',
      null, null, null,
      $t$Guided voice log. Question (activity_type): What type of activity was this? Answer: Soil sampling. Question (field_block): Where were you working? Answer: Field D, grid points one to twenty. Question (notes): Anything to flag? Answer: Bags are in the shop fridge.$t$,
      -0.0005, -0.0003, 92, true)
  ) as v(employee, field, activity, starts, ends, product, rate, unit, transcript, dlat, dlng, accuracy, reviewed)
  join public.employees e on e.organization_id = target_org and e.full_name = v.employee
  join public.fields f on f.organization_id = target_org and f.name = v.field;

  insert into public.tags (organization_id, name) values
    (target_org, 'Needs Follow-up'),
    (target_org, 'Re-entry Interval'),
    (target_org, 'Equipment Issue');

  insert into public.activity_log_tags (organization_id, activity_log_id, tag_id)
  select target_org, l.id, t.id
  from public.activity_logs l
  join public.employees e on e.id = l.employee_id
  join public.tags t on t.organization_id = target_org
  where l.organization_id = target_org
    and (
      (t.name = 'Re-entry Interval' and l.activity_type = 'Spraying' and l.reviewed_at is not null)
      or (t.name = 'Equipment Issue' and e.full_name in ('Lucas Rivera', 'Harper Diaz'))
      or (t.name = 'Needs Follow-up' and e.full_name = 'Sophia Lee')
    );

end;
$$;
revoke execute on function private.seed_demo_org(uuid) from public, anon, authenticated;

-- Every new account gets its own organization, admin profile, and demo farm.
create function private.handle_new_user()
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
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'admin'
  );

  perform private.seed_demo_org(new_org);
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Lets an admin restore their organization to the original demo state.
create function public.reset_demo_data()
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
end;
$$;
revoke execute on function public.reset_demo_data() from public, anon;
grant execute on function public.reset_demo_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Recording storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings', 'recordings', false, 10485760,
  array['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/ogg']
)
on conflict (id) do nothing;

-- Objects live under <organization_id>/..., plus a shared demo/ folder.
create policy "Members read their organization's recordings"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] in ((select private.current_org_id())::text, 'demo')
  );

create policy "Members upload their organization's recordings"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select private.current_org_id())::text
  );

create policy "Members delete their organization's recordings"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select private.current_org_id())::text
  );
