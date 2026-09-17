-- Until the recording app exists, a log entered in the dashboard stands in for
-- a recording: what was typed becomes recorded_values, so reviewing it
-- unchanged scores 100 and corrections lower the score.

-- Share of the recorded fields a log still matches, at the precision the
-- dashboard form saves (times to the minute, text trimmed).
create function private.recording_accuracy(l public.activity_logs)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(100.0 * (
    (l.activity_type is not distinct from r ->> 'activity_type')::int
    + (l.field_id is not distinct from (r ->> 'field_id')::uuid)::int
    + (date_trunc('minute', l.started_at)
        is not distinct from date_trunc('minute', (r ->> 'started_at')::timestamptz))::int
    + (date_trunc('minute', l.ended_at)
        is not distinct from date_trunc('minute', (r ->> 'ended_at')::timestamptz))::int
    + (nullif(trim(l.product_name), '')
        is not distinct from nullif(trim(r ->> 'product_name'), ''))::int
    + (l.application_rate is not distinct from (r ->> 'application_rate')::numeric)::int
    + (nullif(trim(l.rate_unit), '')
        is not distinct from nullif(trim(r ->> 'rate_unit'), ''))::int
  ) / 7, 2)
  from (select l.recorded_values as r) as recording
$$;

create or replace function private.score_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewed_at is null or new.recorded_values is null then
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
    new.response_accuracy := private.recording_accuracy(new);
  end if;
  return new;
end;
$$;

-- A log inserted without a recording records its own values. One inserted
-- already reviewed is scored now; seeded logs keep their preset scores.
create function private.record_new_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.recorded_values is null then
    new.recorded_values := jsonb_build_object(
      'activity_type', new.activity_type,
      'field_id', new.field_id,
      'started_at', new.started_at,
      'ended_at', new.ended_at,
      'product_name', new.product_name,
      'application_rate', new.application_rate,
      'rate_unit', new.rate_unit
    );
  end if;
  if new.reviewed_at is not null and new.response_accuracy is null then
    new.response_accuracy := private.recording_accuracy(new);
  end if;
  return new;
end;
$$;

create trigger activity_logs_record_new_log
  before insert on public.activity_logs
  for each row execute function private.record_new_log();

-- Existing dashboard logs. Earlier edits weren't tracked, so their current
-- values are the recording and reviewed ones score 100.
update public.activity_logs
set recorded_values = jsonb_build_object(
      'activity_type', activity_type,
      'field_id', field_id,
      'started_at', started_at,
      'ended_at', ended_at,
      'product_name', product_name,
      'application_rate', application_rate,
      'rate_unit', rate_unit
    ),
    response_accuracy = case when reviewed_at is not null then 100 end
where recorded_values is null;
