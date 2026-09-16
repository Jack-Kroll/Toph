# Toph

Full-stack implementation of the Toph farm activity dashboard from the Fall 2026 Developer Challenge.

## Status

The dashboard UI matches the supplied default and expanded-entry references. It uses local sample data; backend integration is still pending.

Implemented: expandable employee logs, search, date sorting, activity filtering, row selection, session-only tags, and an expanded map dialog. The map and profile photo are cropped from the supplied design screenshots. Playback is a browser-synthesized reading of the sample transcript, not an original recording. Sidebar destinations outside the dashboard are disabled.

Run `npm run build` and `npm run lint` to verify the frontend.

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

Live site: [tophwebsite.netlify.app](https://tophwebsite.netlify.app/)

Import this repository into Netlify and use the included `netlify.toml`. The expected settings are:

- Build command: `npm run build`
- Publish directory: `dist`
- Production branch: `main`

Add the values from `.env.example` in Netlify under **Project configuration > Environment variables**. Never commit `.env.local` or a Supabase service-role key.

## Project structure

```text
src/
  App.tsx               Dashboard UI and local interactions
  App.css               Dashboard layout and responsive styles
  index.css             Global styles
  main.tsx              Application entry point
public/reference/       Design reference assets used by the UI
docs/FEATURES.md        Implementation checklist
ARCHITECTURE.md         Scope and technical decisions
netlify.toml            Netlify build configuration
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the planned technical decisions and [docs/FEATURES.md](docs/FEATURES.md) for the implementation checklist.
