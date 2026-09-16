-- Move the demo fields from the edge of a town onto four quarter-section
-- crop fields in eastern Nebraska, so live satellite maps show
-- farmland. Log points keep their small offsets inside each field.

create or replace function private.seed_demo_org(target_org uuid)
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
    (target_org, 'Field A', 'Corn', 160, 41.0583, -97.3574),
    (target_org, 'Field B', 'Winter Wheat', 130, 41.0589, -97.3458),
    (target_org, 'Field C', 'Soybeans', 200, 41.0505, -97.3445),
    (target_org, 'Field D', 'Alfalfa', 85, 41.0505, -97.3574);

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

with moves (name, old_lat, old_lng, new_lat, new_lng) as (
  values
    ('Field A', 41.2172, -96.6205, 41.0583, -97.3574),
    ('Field B', 41.2141, -96.6118, 41.0589, -97.3458),
    ('Field C', 41.2098, -96.6237, 41.0505, -97.3445),
    ('Field D', 41.2066, -96.6142, 41.0505, -97.3574)
),
moved as (
  update public.fields f
  set latitude = m.new_lat, longitude = m.new_lng
  from moves m, public.organizations o
  where o.id = f.organization_id
    and o.demo_as_of is not null
    and f.name = m.name
    and f.latitude = m.old_lat
    and f.longitude = m.old_lng
  returning f.id, m.new_lat - m.old_lat as dlat, m.new_lng - m.old_lng as dlng
)
update public.activity_logs l
set latitude = l.latitude + moved.dlat,
    longitude = l.longitude + moved.dlng
from moved
where l.field_id = moved.id
  and l.latitude is not null
  and l.longitude is not null;
