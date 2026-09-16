# Feature checklist

## Submission-critical

- [x] Match the supplied dashboard layout and visual states
- [ ] Display database-backed summary metrics
- [ ] Display persistent employee activity logs
- [x] Search, sort, and filter activity logs (local sample data)
- [x] Expand and collapse an activity-log row
- [ ] Play the recording associated with a log
- [x] Display the transcript and summary
- [x] Display the field location on a map (reference image and expansion dialog)
- [ ] Add and remove persistent tags
- [ ] Create, edit, and delete activity logs
- [ ] Preserve changes after a page refresh
- [ ] Provide loading, empty, error, and success states
- [ ] Verify the production Netlify deployment

## Above and beyond

- [ ] Authenticate users and provide reviewer demo credentials
- [ ] Isolate organization data with Postgres row-level security
- [ ] Add responsive behavior for smaller screens
- [ ] Add accessible keyboard and focus behavior
- [ ] Add unit tests for data transformations and filters
- [ ] Add an end-to-end test covering login, editing, and refresh persistence
- [ ] Document the database model and implementation tradeoffs

## Deliberately out of scope

- The farm-worker mobile recording application
- Complete implementations of every sidebar destination
- Production speech transcription or AI summarization
