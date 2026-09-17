-- Compare at the precision the dashboard form saves: times to the minute and
-- text trimmed, so saving a log untouched doesn't count as a correction.

create or replace function private.score_review()
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
      + (date_trunc('minute', new.started_at)
          is not distinct from date_trunc('minute', (r ->> 'started_at')::timestamptz))::int
      + (date_trunc('minute', new.ended_at)
          is not distinct from date_trunc('minute', (r ->> 'ended_at')::timestamptz))::int
      + (nullif(trim(new.product_name), '')
          is not distinct from nullif(trim(r ->> 'product_name'), ''))::int
      + (new.application_rate is not distinct from (r ->> 'application_rate')::numeric)::int
      + (nullif(trim(new.rate_unit), '')
          is not distinct from nullif(trim(r ->> 'rate_unit'), ''))::int
    ) / 7, 2);
  end if;
  return new;
end;
$$;
