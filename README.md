# Smartmap

A roadmap and task tracker with XP, streaks, and progress tracking — build a roadmap for any goal, break it into tasks and subtasks, and track completion over time.

## Current Status

The live frontend is **`react-app/`** — a React + TypeScript + Tailwind app backed by real Supabase auth and data. The original vanilla-JS pages (`index.html`, `dashboard.html`, `roadmap.html`, etc., plus `css/` and `js/`) have been removed now that the cutover is live; they're still in git history if anything needs cross-checking.

- **Auth**: real signup/login/session restore via Supabase Auth
- **Data**: roadmaps, tasks, subtasks, XP, and streaks are stored in Postgres (Supabase), not localStorage
- **AI roadmap generation**: the Workflows page has a manual builder and an AI-generator UI (the AI path currently runs a local simulation pending real model wiring — `api/ai/chat.js` has a working Gemini proxy from the legacy app that isn't wired into `react-app/` yet)

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind v4 + shadcn-style components + React Router (`react-app/`)
- **Backend**: Supabase (Postgres + Auth), with Row Level Security on every table so each user only ever sees their own data
- **AI proxy**: `api/ai/chat.js` (Vercel serverless function) keeps the Gemini API key server-side; `server.py` is the local-dev equivalent

## Setup

```bash
cd react-app
npm install
cp .env.example .env.local   # fill in your Supabase project's URL + anon key
npm run dev
```

See [react-app/README.md](react-app/README.md) for details.

## Deployment

Deployed on Vercel. `vercel.json` at the repo root builds `react-app/` and serves its output as the site, with `api/*` still served as serverless functions. Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set as Vercel project environment variables (Vite bakes these in at build time).

## Project Structure

```
Smartmap/
├── vercel.json              # Build config: builds react-app/, serves react-app/dist
├── react-app/                # Live frontend
│   ├── src/
│   │   ├── lib/               # supabase client, auth context, data store, legacy-import
│   │   ├── components/        # layout (Sidebar, TopHeader, AppShell) + ui primitives
│   │   └── pages/              # Dashboard, Roadmap, Workflows, Logs, Analytics, Achievements, Settings, Login
│   └── README.md
├── api/
│   └── ai/chat.js            # Gemini proxy (Vercel serverless function)
└── server.py                 # Local-dev equivalent of the AI proxy
```

## License

MIT
