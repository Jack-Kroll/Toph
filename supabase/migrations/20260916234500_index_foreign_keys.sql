-- Cover the foreign keys Supabase's advisor flagged, so cascading deletes and
-- joins don't scan whole tables as farms grow.
create index activity_log_tags_log_idx
  on public.activity_log_tags (organization_id, activity_log_id);
create index activity_log_tags_org_tag_idx
  on public.activity_log_tags (organization_id, tag_id);
-- Superseded by the composite index above.
drop index public.activity_log_tags_tag_idx;
create index activity_logs_created_by_idx on public.activity_logs (created_by);
