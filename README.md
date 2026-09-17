# Toph

A farm activity dashboard for reviewing employee logs, listening to guided transcripts, and tracking work across fields. Built with React, TypeScript, and Supabase, with a responsive interface based on the supplied Figma design.

**[Open Toph](https://tophwebsite.netlify.app/)** · [Architecture](ARCHITECTURE.md) · [Features](docs/FEATURES.md)

Choose **Try the demo** to explore a saved demo farm, or create an account to start your own. Add employees and fields directly from **New Log**.

## Features

- Daily recording totals, active-worker counts, and review accuracy
- Searchable activity logs with sorting, filters, tags, and bulk review actions
- Guided question-and-answer transcripts with distinct narrator and employee voices
- Recording playback, waveform displays, and seeking for uploaded audio
- Field locations, satellite maps, and an interactive location picker
- Profile photos, farm settings, employee status, and account management
- Saved changes, live log updates, and farm isolation through row-level security
- Responsive layouts and keyboard-accessible forms and dialogs

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, CSS |
| Backend | Supabase Postgres, Auth, Storage, Realtime |
| Hosting | Netlify |
| Tests | Vitest and transactional SQL checks |

## Run locally

Use Node.js 24 and npm.

```bash
npm ci
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
npm run dev
```

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Check code with oxlint |
| `npm test` | Run unit and regression tests |
| `npm run db:push` | Apply database migrations |
| `npm run db:types` | Generate TypeScript database types |
| `npm run db:test` | Run database isolation and behavior checks in a rolled-back transaction |

Database commands use a linked Supabase project: run `npx supabase login` and `npx supabase link --project-ref <ref>` first.

## Project structure

```text
src/
  components/              Shared layout, dialogs, maps, and UI
  features/activity-logs/  Log forms, data access, transcripts, and playback
  features/settings/       Profile and farm settings
  hooks/                   Authentication and dashboard data
  lib/                     Supabase client and time helpers
  pages/                   Routed application screens
  types/                   Database types
supabase/
  migrations/              Schema, policies, and database functions
  tests/                   Transactional database checks
tests/unit/                Frontend regression tests
public/reference/          Design reference images
```

## Deployment

Netlify uses `netlify.toml`: `npm run build`, publish `dist`, Node 24, and a single-page-app route fallback. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the site's environment variables.

Enable anonymous sign-ins in Supabase for the demo. The frontend uses the publishable key; database credentials and secret keys stay outside the application.
