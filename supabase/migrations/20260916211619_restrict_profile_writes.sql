-- Supabase grants table-wide privileges to API roles by default. Narrow them so
-- users cannot move themselves into another organization or change their role.
revoke insert, update, delete, truncate, references, trigger
  on public.organizations, public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

revoke all on all tables in schema public from anon;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.current_org_id() to authenticated;
