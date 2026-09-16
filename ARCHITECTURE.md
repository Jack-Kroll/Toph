# Toph architecture

## Scope

Toph is a focused implementation of the supplied dashboard, in both its default and expanded-entry states, backed by a real database. It does not implement the other products in the sidebar or the mobile recording app. The data model and API assume a mobile app writes logs, and the dashboard updates live when it does.

## Request flow

```text
Browser (React SPA on Netlify CDN)
  │  supabase-js with the publishable key + the user's JWT
  ▼
Supabase
  ├─ Auth        email/password sessions
  ├─ PostgREST   tables and RPCs, filtered by row-level security
  ├─ Realtime    activity_logs changes, filtered by the same policies
  └─ Storage     private "recordings" bucket, per-farm folders
  ▼
Postgres (schema in supabase/migrations)
```

There is no custom API server. Row-level security in Postgres is the authorization layer, so the browser can query tables directly.

## Decisions

### React, TypeScript, and Vite

The dashboard is one interactive, signed-in screen. It has no public pages that need server rendering or SEO, so a Next.js-style server adds hosting complexity without benefit. Vite produces a static bundle that Netlify serves from its CDN. TypeScript, together with the generated `Database` types, catches schema drift at build time: renaming a column breaks the build instead of failing in production.

### React Router

Every sidebar section has its own URL, so refreshing, bookmarking, and the browser's Back button all work. The alternative, tracking the current page in React state, breaks all three. Netlify's SPA fallback in `netlify.toml` serves `index.html` for any path, and the router picks the page. The routes share one `AppLayout` that owns the sidebar, farm data, toasts, and the reset dialog, so moving between pages doesn't reload data. A section that isn't built yet shows an illustrated placeholder page; its description lives in `src/navigation.ts` next to the sidebar entry. The router, React, and Supabase are split into separately cached bundles.

### Plain CSS, no component library

The brief grades pixel accuracy. The design's 8–14px type, custom pills, and waveform don't match any component library's defaults, and overriding a library costs more than writing the CSS directly. Tailwind was considered, but the design has many one-off measurements, which would become arbitrary-value utilities with no real advantage.

### Supabase over a custom backend or Firebase

- **Relational data.** Farms, employees, fields, logs, and tags are naturally relational. Firebase's document model would require denormalizing names and managing joins in client code.
- **One service for four needs.** Supabase provides Postgres, Auth, file storage for audio, and Realtime together. A custom Express API would also need hosting, auth, and upload handling, and Netlify Functions have cold starts and no persistent connection pool.
- **Security lives with the data.** Policies are SQL in version-controlled migrations, so a reviewer can read exactly who can see what.
- **Tradeoff.** Moving business logic into the database (RPCs, triggers) ties the app to Postgres. That's acceptable here because Postgres is the part least likely to change.

### Netlify

This was a hard requirement. It also fits the design: static hosting, deploys from `main`, preview deploys, and `netlify.toml` checked in so the build is reproducible.

## Data model

```text
organizations ─┬─< profiles (1:1 with auth.users)
               ├─< employees ─┐
               ├─< fields ────┤
               ├─< activity_logs >─┘ ── activity_log_tags >── tags
               └─< tags
```

| Table | Notes |
| --- | --- |
| `organizations` | A farm. `timezone` says what "today" means; `demo_as_of` pins "today" for demo farms. |
| `profiles` | Links an auth user to one farm, with a role (`admin`, `manager`, `viewer`). |
| `employees`, `fields` | Workers and fields. Fields store crop, acres, and coordinates. |
| `activity_logs` | One recording: who, what, where, when, product and rate, transcript, audio path, GPS, response accuracy, and `reviewed_at`. |
| `tags`, `activity_log_tags` | Per-farm tag vocabulary with a many-to-many link to logs. Tag names are unique per farm, ignoring case. |

Key choices:

- **`organization_id` on every table**, defaulted to the caller's farm. RLS policies stay one line each, and the client never sends a farm ID it could forge.
- **Composite foreign keys** `(organization_id, employee_id)` → `employees(organization_id, id)`. RLS limits what a user can *see*, but a plain foreign key would still accept an employee ID from another farm. The composite key makes that impossible in the database itself.
- **`timestamptz` plus a farm time zone** instead of separate date and time columns. Shifts can cross midnight, and the dashboard has to agree with the farm about which day "today" is, whichever time zone the viewer is in. `src/lib/time.ts` converts through the farm's IANA zone, and its tests cover DST.
- **`reviewed_at` instead of a status enum.** "New Employee Logs" means unreviewed logs. A timestamp answers both "is it new?" and "when was it reviewed?". The sidebar badge and "1 New" count come from the same column.
- **Check constraints** on activity type, accuracy (0–100), non-negative rates, coordinate ranges, and `ended_at >= started_at`, so bad data is rejected even if it bypasses the UI (for example, from the mobile app).
- **Indexes** on `(organization_id, started_at desc)` and on the foreign keys, matching the dashboard's query pattern.

## Security

- RLS is enabled on every table. Each policy compares `organization_id` to `private.current_org_id()`, a `security definer` function in a schema the API doesn't expose, which avoids policy recursion on `profiles`.
- Supabase's default table grants were narrowed (second migration). Users can update only their own `full_name` and `avatar_url`; without this, a user could change their own `organization_id` and read another farm's data. `npm run db:test` checks that this is blocked.
- The `anon` role has no table access. An unauthenticated request returns `permission denied`.
- `dashboard_stats()` is `security invoker`, so it can only count rows the caller can already see.
- `reset_demo_data()` is `security definer` so it can reseed the farm, but it verifies the caller is an admin of a demo farm first. Supabase's advisor flags this function; the flag is expected.
- Storage objects live under `<organization_id>/…`, and policies restrict reads, uploads, and deletes to that prefix. Playback uses short-lived signed URLs.
- Only the publishable key reaches the browser. The database password and secret keys are never used by the app.

## Onboarding and demo data

A trigger on `auth.users` creates a farm, an admin profile, and a copy of the design's data for every new account (`private.seed_demo_org`). This has three benefits:

1. Reviewers can sign up and see a working dashboard immediately.
2. Reviewers never overwrite each other's changes, because each one has their own copy.
3. The seed lives in a migration, so it matches the schema exactly and can be reapplied with `reset_demo_data()`.

The seed reproduces the design's numbers from real rows rather than hard-coded values. April 22 has 5 recordings, one of them unreviewed. The four unreviewed April logs are the four rows in the design. Twelve employees are active. April's accuracy averages exactly 90.

## Frontend structure

- `useSession` restores the session and shows either `LoginPage` or the routed app. `AppLayout` is keyed by user ID so switching accounts can't show stale data.
- `useDashboardData` loads profile, logs, stats, and form options in parallel, ignores responses from superseded requests, and refreshes when a Realtime event arrives for `activity_logs`.
- `features/activity-logs/api.ts` is the only module that knows table and column names. It maps snake_case rows to UI types and turns PostgREST errors into exceptions.
- Filtering and sorting are pure functions (`filters.ts`) with unit tests. They run on the client because a farm's monthly log volume is small and filters should respond instantly. If volume grows, the same filters move to PostgREST query parameters with pagination.
- Tag removal updates the UI first and reloads if the request fails. Creates, edits, and deletes wait for the server, because the user needs to know the write actually succeeded.

## UI decisions

- The supplied screenshots are the visual source of truth, tuned for a 1440px desktop viewport, with narrower layouts down to phone width.
- Sidebar sections not in the design link to a placeholder page instead of doing nothing when clicked.
- Additions beyond the design are deliberately small and reuse its visual language: the **New Log** pill, a bulk-action toolbar that replaces the filter pills when rows are checked, an **Edit** link beside "Summary", and one line for product, rate, and accuracy.
- Arial matches the screenshot's letterforms and avoids loading a remote font.
- The map and avatar are images cropped from the design. A live map (MapLibre with satellite tiles) is the next step; field and log coordinates are already stored.
- Includes keyboard focus styles, Escape to close menus and dialogs, labeled icon buttons, `role="alert"`/`status` for feedback, and reduced-motion support.

## Testing

- `npm test`: Vitest covers time-zone conversion (including DST and near-midnight dates), search, month and reviewed filters, and sorting.
- `npm run db:test`: creates two users inside a transaction that is rolled back. It checks farm isolation, the seeded stats (`5 / 1 / 12 / 90`), that the organization-hopping attack is blocked, and that reset works.
- Manual browser check: demo login; add a tag and refresh; create, review, and delete a log; reset demo data; open the map.

## Next steps

- End-to-end Playwright test covering login, editing, and persistence after refresh
- Live satellite map with the recorded GPS point
- Audio upload from the dashboard and a real waveform generated from the file
- Server-side pagination for large farms
