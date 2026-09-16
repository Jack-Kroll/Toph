-- Rolled-back check of onboarding, RLS isolation, stats, and demo cleanup.
-- Run with: npm run db:test
begin;

-- Two email accounts (empty farms) and two anonymous demo sessions, one of
-- them abandoned for a month.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local', '{"full_name":"Tester A","farm_name":"Prairie Farm","timezone":"America/Denver"}'),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local', '{"timezone":"Not/AZone"}');
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now()),
       ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '30 days');

create temp table results (check_name text, value text) on commit drop;
grant all on results to authenticated;

insert into results
select 'email farm (expect Prairie Farm, America/Denver, not demo)',
       o.name || ', ' || o.timezone || ', ' || coalesce(o.demo_as_of::text, 'not demo')
from public.organizations o join public.profiles p on p.organization_id = o.id
where p.id = '11111111-1111-1111-1111-111111111111';
insert into results
select 'defaults (expect My Farm, America/Chicago)', o.name || ', ' || o.timezone
from public.organizations o join public.profiles p on p.organization_id = o.id
where p.id = '22222222-2222-2222-2222-222222222222';
insert into results
select 'email farm rows (expect 0)', count(*)::text
from public.employees e join public.profiles p on p.organization_id = e.organization_id
where p.id = '11111111-1111-1111-1111-111111111111';
insert into results
select 'demo profile name (expect Demo Admin)', full_name
from public.profiles where id = '33333333-3333-3333-3333-333333333333';
insert into results
select 'demo logs with audio (expect 14)', count(l.audio_path)::text
from public.activity_logs l join public.profiles p on p.organization_id = l.organization_id
where p.id = '33333333-3333-3333-3333-333333333333';
insert into results select 'stale demos purged (expect 1)', private.purge_stale_demo_accounts()::text;
insert into results select 'active demo kept (expect 1)', count(*)::text from public.profiles where id = '33333333-3333-3333-3333-333333333333';
insert into results select 'orphan farms (expect 0)', count(*)::text from public.organizations o where not exists (select 1 from public.profiles p where p.organization_id = o.id);

-- Act as the email user with an empty farm.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into results select 'empty farm stats (expect 0,0,0,null)', concat_ws(',', s.todays_recordings, s.todays_new, s.active_workers, coalesce(s.response_accuracy::text, 'null')) from public.dashboard_stats() s;
insert into results select 'email user sees demo logs (expect 0)', count(*)::text from public.activity_logs;
do $$ begin
  begin
    perform public.reset_demo_data();
    insert into results values ('reset on real farm', 'ALLOWED (bad)');
  exception when insufficient_privilege then insert into results values ('reset on real farm', 'blocked (expected)');
  end;
end $$;

-- Act as the demo user.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":true}', true);
insert into results select 'orgs visible (expect 1)', count(*)::text from public.organizations;
insert into results select 'logs visible (expect 14)', count(*)::text from public.activity_logs;
insert into results select 'employees (expect 12)', count(*)::text from public.employees;
insert into results select 'tag links (expect 4)', count(*)::text from public.activity_log_tags;
insert into results select 'stats (expect 2026-04-22,5,1,12,90)', row(s.*)::text from public.dashboard_stats() s;
insert into results select 'april unreviewed (expect 4)', count(*)::text from public.activity_logs where reviewed_at is null;
do $$ begin
  begin
    update public.profiles set organization_id = (
      select organization_id from public.profiles where id <> auth.uid() limit 1
    ) where id = auth.uid();
    insert into results values ('org hop', 'ALLOWED (bad)');
  exception when insufficient_privilege then insert into results values ('org hop', 'blocked (expected)');
  end;
  perform public.reset_demo_data();
  insert into results values ('reset', 'ok');
end $$;
insert into results select 'logs after reset (expect 14)', count(*)::text from public.activity_logs;

-- Settings, as the email user again.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.organizations set name = 'Renamed Farm' where id = private.current_org_id();
insert into results select 'rename own farm (expect Renamed Farm)', name from public.organizations;
update public.organizations set name = 'Hijacked'
  where id = (select organization_id from public.profiles where id = '33333333-3333-3333-3333-333333333333');
do $$ begin
  begin
    update public.organizations set timezone = 'Mars/Olympus' where id = private.current_org_id();
    insert into results values ('bad time zone', 'ALLOWED (bad)');
  exception when invalid_parameter_value then insert into results values ('bad time zone', 'rejected (expected)');
  end;
  begin
    update public.profiles set avatar_path = '33333333-3333-3333-3333-333333333333/x.webp' where id = auth.uid();
    insert into results values ('avatar in another folder', 'ALLOWED (bad)');
  exception when check_violation then insert into results values ('avatar in another folder', 'rejected (expected)');
  end;
  begin
    update public.organizations set demo_as_of = current_date where id = private.current_org_id();
    insert into results values ('edit demo flag', 'ALLOWED (bad)');
  exception when insufficient_privilege then insert into results values ('edit demo flag', 'blocked (expected)');
  end;
end $$;
update public.profiles set avatar_path = '11111111-1111-1111-1111-111111111111/photo.webp' where id = auth.uid();
insert into results select 'own avatar path (expect saved)', coalesce(avatar_path, 'missing') from public.profiles where id = auth.uid();
select public.delete_my_account();
reset role;
insert into results select 'other farm renamed (expect 0, checked as admin)', count(*)::text from public.organizations where name = 'Hijacked';
insert into results select 'deleted user and farm (expect 0,0)',
  (select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111')::text || ',' ||
  (select count(*) from public.organizations where name = 'Renamed Farm')::text;

select * from results;
rollback;
