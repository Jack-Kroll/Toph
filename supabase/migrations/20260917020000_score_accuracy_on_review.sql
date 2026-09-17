-- Response accuracy: how much of a recording the reviewer kept.
--
-- The recording app stores what it captured in recorded_values when it
-- inserts a log. When a manager reviews the log (or edits it afterwards),
-- response_accuracy becomes the share of those fields they didn't change.
-- Logs typed into the dashboard have no recording, so they have no score.

alter table public.activity_logs add column recorded_values jsonb
  check (recorded_values is null or jsonb_typeof(recorded_values) = 'object');

comment on column public.activity_logs.recorded_values is
  'What the recording captured: activity_type, field_id, started_at, ended_at, product_name, application_rate, rate_unit.';

create function private.score_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r jsonb := new.recorded_values;
begin
  if new.reviewed_at is null or r is null then
    return new;
  end if;
  -- Score on review, and again when a reviewed log's fields change, so
  -- unrelated updates keep the existing score.
  if old.reviewed_at is null
    or (new.activity_type, new.field_id, new.started_at, new.ended_at,
        new.product_name, new.application_rate, new.rate_unit)
      is distinct from
       (old.activity_type, old.field_id, old.started_at, old.ended_at,
        old.product_name, old.application_rate, old.rate_unit)
  then
    new.response_accuracy := round(100.0 * (
      (new.activity_type is not distinct from r ->> 'activity_type')::int
      + (new.field_id is not distinct from (r ->> 'field_id')::uuid)::int
      + (new.started_at is not distinct from (r ->> 'started_at')::timestamptz)::int
      + (new.ended_at is not distinct from (r ->> 'ended_at')::timestamptz)::int
      + (new.product_name is not distinct from r ->> 'product_name')::int
      + (new.application_rate is not distinct from (r ->> 'application_rate')::numeric)::int
      + (new.rate_unit is not distinct from r ->> 'rate_unit')::int
    ) / 7, 2);
  end if;
  return new;
end;
$$;

-- Update only: seeded and app-created logs keep the score they were given.
create trigger activity_logs_score_review
  before update on public.activity_logs
  for each row execute function private.score_review();

-- The score comes from the trigger, and the recording is immutable, so
-- clients can't write either one.
revoke insert, update on public.activity_logs from authenticated;
grant insert (
  employee_id, field_id, activity_type, started_at, ended_at, product_name,
  application_rate, rate_unit, transcript, audio_path, latitude, longitude,
  reviewed_at, recorded_values
) on public.activity_logs to authenticated;
grant update (
  employee_id, field_id, activity_type, started_at, ended_at, product_name,
  application_rate, rate_unit, transcript, audio_path, latitude, longitude,
  reviewed_at
) on public.activity_logs to authenticated;

-- Seeded demo logs stand in for recordings, so they get a recording too.
-- Their preset scores stay until a reviewer scores them, which keeps the
-- demo's 90% average from the design.
create or replace function private.attach_demo_audio(target_org uuid)
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
      || to_char(l.started_at at time zone o.timezone, 'YYYY-MM-DD');

  -- Seeded rows have no creator; logs a user added keep no recording.
  update public.activity_logs l
  set recorded_values = jsonb_build_object(
    'activity_type', l.activity_type,
    'field_id', l.field_id,
    'started_at', l.started_at,
    'ended_at', l.ended_at,
    'product_name', l.product_name,
    'application_rate', l.application_rate,
    'rate_unit', l.rate_unit
  )
  where l.organization_id = target_org
    and l.created_by is null
    and l.recorded_values is null;
$$;
revoke execute on function private.attach_demo_audio(uuid) from public, anon, authenticated;

-- Existing demo farms. Logs a demo user already edited get a recording of
-- their current values, which is the closest record left.
select private.attach_demo_audio(id)
from public.organizations
where demo_as_of is not null;
