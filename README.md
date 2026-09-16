# Toph

Full-stack implementation of the Toph farm activity dashboard from the Fall 2026 Developer Challenge.

## Status

The repository is scaffolded but the product features have not been implemented yet.

## Planned stack

- React, TypeScript, and Vite
- Supabase Postgres, Auth, and Storage
- Netlify hosting and continuous deployment

## Local setup

Requirements: Node.js 24 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Netlify

Import this repository into Netlify and use the included `netlify.toml`. The expected settings are:

- Build command: `npm run build`
- Publish directory: `dist`
- Production branch: `main`

Add the values from `.env.example` in Netlify under **Project configuration > Environment variables**. Never commit `.env.local` or a Supabase service-role key.

## Project structure

```text
src/
  components/          Shared UI components
  features/            Feature-specific UI and logic
    activity-logs/     Dashboard activity-log feature
  layouts/             Application shell and navigation
  lib/                 Service clients and shared utilities
  pages/               Route-level page components
  routes/              Routing and access control
  styles/              Shared styles and design tokens
  types/               Shared TypeScript types
supabase/
  migrations/          Versioned database migrations
  seed.sql             Development and demo data
tests/
  e2e/                 Browser-level tests
  unit/                Unit and component tests
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the planned technical decisions and [docs/FEATURES.md](docs/FEATURES.md) for the implementation checklist.
