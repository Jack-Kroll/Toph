-- Broadcast activity log changes so dashboards update when the mobile app
-- submits a recording. Realtime applies the same RLS policies as the API.
alter publication supabase_realtime add table public.activity_logs;
