# Feature checklist

## Submission-critical

- [x] Match the supplied dashboard layout and visual states
- [x] Display database-backed summary metrics
- [x] Display persistent employee activity logs
- [x] Search, sort, and filter activity logs
- [x] Expand and collapse an activity-log row
- [x] Play the recording associated with a log (signed URL, or spoken transcript when none is uploaded)
- [x] Display the transcript and summary
- [x] Display the field location on a map (reference image and expansion dialog)
- [x] Add and remove persistent tags
- [x] Create, edit, and delete activity logs
- [x] Preserve changes after a page refresh
- [x] Provide loading, empty, error, and success states
- [x] Verify the production Netlify deployment

## Above and beyond

- [x] Authenticate users and provide a one-click reviewer demo
- [x] Isolate organization data with Postgres row-level security
- [x] Add responsive behavior for smaller screens
- [x] Add accessible keyboard and focus behavior
- [x] Add unit tests for data transformations and filters
- [ ] Add an end-to-end test covering login, editing, and refresh persistence
- [x] Document the database model and implementation tradeoffs
- [x] Live updates through Supabase Realtime
- [x] Private demo farm per browser (anonymous sign-in), with reset and automatic cleanup
- [x] Bulk mark reviewed, mark new, and delete
- [x] Empty farms for new accounts, with inline employee and field creation
- [x] Routed sidebar with "under construction" pages for unfinished sections

## Deliberately out of scope

- The farm-worker mobile recording application
- Complete implementations of every sidebar destination
- Production speech transcription or AI summarization
