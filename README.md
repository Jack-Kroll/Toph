# Toph

Full-stack implementation of the Toph farm activity dashboard from the Fall 2026 Developer Challenge.

**Live site:** [tophwebsite.netlify.app](https://tophwebsite.netlify.app/)

**Demo:** click **Try the demo** on the login page. Each browser gets its own private demo farm, so your edits are saved and nobody else sees them. You can also create an account with any email and password; every new account also gets its own copy of the demo data.

## Features

- Dashboard matching the supplied Figma default and expanded-entry frames
- Metrics (Todays Recordings, New, Active Workers, Response Accuracy) calculated in Postgres
- "New Employee Logs" inbox: unreviewed logs for the current month, with search, sort, activity filter, and a toggle to include reviewed logs
- Expandable rows with real recordings (private Storage, signed URLs), a waveform drawn from the audio with click-to-seek, tags, transcript, product and rate applied, and a field map
- Live satellite maps for signed-up accounts, plus a location picker in the log form (click the map, use the field's location, or use your current location); the demo keeps the design's map image
- Create, edit, and delete logs; bulk mark reviewed, mark new, and delete from the row checkboxes
- Tags saved per farm and reused across logs
- Private demo per browser (Supabase anonymous sign-in), plus email/password accounts; each gets its own farm
- Unused demo farms are deleted automatically after 14 days
- Farm isolation with Postgres row-level security
- Live updates: logs added or changed elsewhere (for example by the mobile app) appear without a refresh
- Reset demo data from the account menu (inbox icon beside the farm name)
- Loading, empty, error, and success states
- Real URLs for every sidebar section; unfinished sections show an illustrated "under construction" page

See [ARCHITECTURE.md](ARCHITECTURE.md) for the reasoning behind each decision.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, plain CSS |
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

In Supabase, **Allow anonymous sign-ins** is on (for the demo) and **Confirm email** is off (so new accounts can sign in immediately).

## Project structure

```text
src/
  App.tsx                          Auth gate and routes
  navigation.ts                    Sidebar sections, paths, and descriptions
  pages/                           Login, Dashboard, Under Construction
  components/                      App layout, Sidebar, Modal/ConfirmDialog, Icon, illustration
  features/activity-logs/          API calls, filters, expanded row, log form
  hooks/                           Session and dashboard data (with Realtime)
  lib/                             Supabase client, time-zone helpers
  types/database.ts                Generated database types
supabase/
  migrations/                      Schema, RLS, seed function, storage, Realtime
  demo-audio/                      Recordings uploaded to recordings/demo/
  tests/rls_check.sql              Rolled-back security and seed check
tests/unit/                        Vitest tests
scripts/generate-demo-audio.py     Rebuilds the demo recordings
public/reference/                  Avatar and map images from the design
```

## Known limitations

- Demo recordings are generated with macOS text-to-speech (`scripts/generate-demo-audio.py`), not real field recordings. Logs created in the dashboard have no audio, so **Play Recording** reads their transcript aloud instead.
- Demo sessions show the design's map image; the live map (Esri World Imagery, no API key) appears for email accounts. Esri's terms allow this for development and demos; production use would need an Esri or MapTiler plan. To preview the live map in a local demo session, add `?liveMap` to the URL (development builds only).
- Demo farms treat April 22, 2026 as "today" so the seeded numbers match the design. Farms without `demo_as_of` use the real date in their time zone.
- Sidebar sections other than Dashboard are placeholders that show an "under construction" page.
