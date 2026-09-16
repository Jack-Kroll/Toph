# Toph architecture

## Product scope

Toph is a focused implementation of the supplied dashboard design, including its default and expanded activity-log states. The first release will not implement complete versions of the other products represented by the sidebar navigation.

The dashboard is expected to support authentication, persistent activity records, calculated summary metrics, search and filtering, expandable rows, audio playback, maps, and persistent tags.

## UI decisions

- The supplied screenshots are the visual source of truth for desktop proportions, text, row content, borders, and colors. The dashboard is tuned for a 1440px desktop viewport and adapts to narrower screens.
- Plain CSS gives direct control over the reference's small spacing and typography differences. No component framework or styling dependency is needed for this focused screen.
- Arial matches the supplied screenshot's letterforms closely and avoids a remote font-loading dependency.
- The map and profile photo are cropped reference assets. A larger map dialog demonstrates expansion; live map services are deferred.
- State is local to React and resets on refresh. Statistics are fixed reference values. Audio playback uses the browser's speech synthesis as a demonstrator because no recording was supplied.
- Icons are small inline SVGs. Reduced motion, keyboard focus, labeled controls, and narrow-screen table scrolling are included.

## Technical decisions

### React, TypeScript, and Vite

The application is a highly interactive dashboard that does not require server-side rendering. Vite provides a small static build that Netlify can deploy directly, while TypeScript makes the database and UI boundaries explicit.

### Supabase

Supabase keeps the relational database, authentication, and audio storage in one service. Postgres fits the relationships among organizations, workers, fields, activity logs, and tags. Row-level security will isolate each organization's data.

### Netlify

Netlify will build the Vite application from the `main` branch and serve it from its global CDN. Deploy previews can be used for visual review before changes reach the production URL.

## Planned data model

- `organizations`
- `profiles`
- `employees`
- `fields`
- `activity_logs`
- `tags`
- `activity_log_tags`

Database migrations and row-level security policies belong in `supabase/migrations` so the backend can be recreated and reviewed from the repository.

## Security boundaries

- The Supabase publishable key may be used in the browser with row-level security enabled.
- Supabase database passwords and service-role keys must never be exposed to the client or committed.
- Stored recordings should require an authenticated user with access to the corresponding organization.
