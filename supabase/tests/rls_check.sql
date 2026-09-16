-- Rolled-back check of onboarding, RLS isolation, and dashboard stats.
-- Run with: npm run db:test
begin;
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local', '{"full_name":"Tester A"}'),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local', '{"farm_name":"Other Farm"}');
-- Anonymous demo users: one active, one abandoned for a month.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now()),
       ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '30 days');
create temp table results (check_name text, value text) on commit drop;
grant all on results to authenticated;
insert into results select 'anon profile name (expect Demo Admin)', full_name from public.profiles where id = '33333333-3333-3333-3333-333333333333';
insert into results select 'anon logs seeded (expect 14)', count(*)::text from public.activity_logs l join public.profiles p on p.organization_id = l.organization_id where p.id = '33333333-3333-3333-3333-333333333333';
insert into results select 'stale demos purged (expect 1)', private.purge_stale_demo_accounts()::text;
insert into results select 'active demo kept (expect 1)', count(*)::text from public.profiles where id = '33333333-3333-3333-3333-333333333333';
insert into results select 'orphan farms (expect 0)', count(*)::text from public.organizations o where not exists (select 1 from public.profiles p where p.organization_id = o.id);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into results select 'orgs visible (expect 1)', count(*)::text from public.organizations;
insert into results select 'logs visible', count(*)::text from public.activity_logs;
insert into results select 'employees', count(*)::text from public.employees;
insert into results select 'tag links', count(*)::text from public.activity_log_tags;
insert into results select 'stats (expect 2026-04-22,5,1,12,90)', row(s.*)::text from public.dashboard_stats() s;
insert into results select 'april unreviewed', count(*)::text from public.activity_logs where reviewed_at is null;
do $$ begin
  begin
    update public.profiles set organization_id = (select organization_id from public.profiles limit 1) where id = auth.uid();
    insert into results values ('org hop', 'ALLOWED (bad)');
  exception when insufficient_privilege then insert into results values ('org hop', 'blocked (expected)');
  end;
  begin
    perform public.reset_demo_data();
    insert into results values ('reset', 'ok');
  end;
end $$;
insert into results select 'logs after reset', count(*)::text from public.activity_logs;
select * from results;
rollback;
