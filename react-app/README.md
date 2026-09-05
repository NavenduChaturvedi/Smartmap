# RoadmapOS (react-app)

The React/Tailwind frontend for RoadmapOS — a roadmap and task tracker with
XP, streaks, and progress tracking. This is the frontend going forward,
replacing the vanilla-JS pages at the repo root.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project's URL + anon key
npm run dev
```

## Environment variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon` `public` key |

The anon key is a public key by design — it's safe in the browser bundle.
Row Level Security policies on every table (`profiles`, `roadmaps`, `tasks`,
`settings`) are what actually restrict each user to their own rows.
`.env.local` is gitignored; never commit real values into `.env.example`.

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + shadcn-style components
(`src/components/ui`) + React Router + Supabase (`src/lib/supabase.ts`).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run lint` — oxlint
