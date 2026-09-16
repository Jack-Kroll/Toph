-- Only demo sessions (anonymous users) get the Bays Ranch sample farm.
-- Email sign-ups start with an empty farm that uses real dates and the
-- time zone their browser reported.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org uuid;
  requested_zone text := new.raw_user_meta_data ->> 'timezone';
begin
  if new.is_anonymous then
    insert into public.organizations (name, demo_as_of)
    values ('Bays Ranch', date '2026-04-22')
    returning id into new_org;
  else
    insert into public.organizations (name, timezone)
    values (
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_name'), ''), 'My Farm'),
      case
        when exists (select 1 from pg_catalog.pg_timezone_names where name = requested_zone)
          then requested_zone
        else 'America/Chicago'
      end
    )
    returning id into new_org;
  end if;

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

  if new.is_anonymous then
    perform private.seed_demo_org(new_org);
    perform private.attach_demo_audio(new_org);
  end if;
  return new;
end;
$$;
