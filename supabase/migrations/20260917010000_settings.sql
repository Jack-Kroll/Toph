-- Settings: profile photos, editable farm details, and self-service account
-- deletion.

-- ---------------------------------------------------------------------------
-- Profile photos
-- ---------------------------------------------------------------------------

-- Store a Storage path rather than a URL, so a profile can only point at a
-- file in its own avatars folder, never at an arbitrary external image.
alter table public.profiles rename column avatar_url to avatar_path;
alter table public.profiles
  add constraint profiles_avatar_path_own_folder
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9._-]+$'));

-- Public bucket: photos are low-sensitivity and load from cacheable URLs.
-- Only the owner can add, replace, list, or delete files in their folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Users list their own avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload their own avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own avatars"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Farm details
-- ---------------------------------------------------------------------------

grant update (name, timezone) on public.organizations to authenticated;

create policy "Admins update their organization"
  on public.organizations for update to authenticated
  using (
    id = (select private.current_org_id())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (id = (select private.current_org_id()));

-- Check constraints can't query the catalog, so validate zones in a trigger.
create function private.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown time zone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger organizations_validate_timezone
  before insert or update of timezone on public.organizations
  for each row execute function private.validate_timezone();

-- ---------------------------------------------------------------------------
-- Account deletion
-- ---------------------------------------------------------------------------

-- Deletes the caller's account. A farm with no other members is deleted with
-- it. The client removes the user's Storage files first, because Storage
-- files must be deleted through the Storage API, not SQL.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  org uuid := private.current_org_id();
  sole_member boolean;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  sole_member := not exists (
    select 1 from public.profiles where organization_id = org and id <> uid
  );

  if sole_member then
    -- Logs first: they restrict deletes of the employees and fields they use.
    delete from public.activity_logs where organization_id = org;
  end if;
  delete from auth.users where id = uid;
  if sole_member then
    delete from public.organizations where id = org;
  end if;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
