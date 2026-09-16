# Toph

Full-stack implementation of the Toph farm activity dashboard from the Fall 2026 Developer Challenge.

**Live site:** [tophwebsite.netlify.app](https://tophwebsite.netlify.app/)

**Demo login:** click **Continue with demo account**, or sign in with `demo@toph.farm` / `TophDemo2026!`. You can also create your own farm; every new account gets a private copy of the demo data.

## Features

- Dashboard matching the supplied Figma default and expanded-entry frames
- Metrics (Todays Recordings, New, Active Workers, Response Accuracy) calculated in Postgres
- "New Employee Logs" inbox: unreviewed logs for the current month, with search, sort, activity filter, and a toggle to include reviewed logs
- Expandable rows with playback, tags, transcript, product and rate applied, and a field map
- Create, edit, and delete logs; bulk mark reviewed, mark new, and delete from the row checkboxes
- Tags saved per farm and reused across logs
- Email/password authentication, sign-up that creates a new farm, log out and switch user
- Farm isolation with Postgres row-level security
- Live updates: logs added or changed elsewhere (for example by the mobile app) appear without a refresh
- Reset demo data from the account menu (inbox icon beside the farm name)
- Loading, empty, error, and success states

See [ARCHITECTURE.md](ARCHITECTURE.md) for the reasoning behind each decision.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, plain CSS |
| Backend | Supabase: Postgres, Auth, Storage, Realtime |
| Hosting | Netlify, deployed from `main` |
| Tests | Vitest (unit) and a rolled-back SQL check for RLS |

## Local setup

Requirements: Node.js 24 and npm.

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Lint with oxlint |
| `npm test` | Unit tests for filtering, sorting, and time-zone handling |
| `npm run db:push` | Apply `supabase/migrations` to the linked project |
| `npm run db:types` | Regenerate `src/types/database.ts` from the live schema |
| `npm run db:test` | Run the RLS and seed check inside a rolled-back transaction |

Database commands need `npx supabase login` and `npx supabase link --project-ref <ref>` first.

## Deployment

Netlify builds with the settings in `netlify.toml` (`npm run build`, publish `dist`, Node 24, SPA fallback). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Site configuration → Environment variables**. The publishable key is designed to be public; the database password and secret keys are never used by the app or committed.

In Supabase, **Confirm email** is off so reviewers can sign up and sign in immediately.

## Project structure

```text
src/
  App.tsx                          Auth gate: login page or dashboard
  pages/                           LoginPage, DashboardPage
  components/                      Sidebar, Modal/ConfirmDialog, Icon
  features/activity-logs/          API calls, filters, expanded row, log form
  hooks/                           Session and dashboard data (with Realtime)
  lib/                             Supabase client, time-zone helpers
  types/database.ts                Generated database types
supabase/
  migrations/                      Schema, RLS, seed function, storage, Realtime
  tests/rls_check.sql              Rolled-back security and seed check
tests/unit/                        Vitest tests
public/reference/                  Avatar and map images from the design
```

## Known limitations

- No real recordings exist yet. When a log has no `audio_path`, **Play Recording** reads the transcript aloud with the browser's speech synthesis. Uploaded files in the private `recordings` bucket play through signed URLs.
- The field map is the design's satellite image with the recorded coordinates listed underneath, not a live map.
- Demo farms treat April 22, 2026 as "today" so the seeded numbers match the design. Farms without `demo_as_of` use the real date in their time zone.
- Sidebar destinations other than Dashboard are intentionally disabled.
