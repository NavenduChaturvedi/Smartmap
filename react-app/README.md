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

**When setting these in a dashboard (Vercel, etc.), paste the value directly
from a plain-text source and double-check it landed correctly.** A masked/
password-style input can end up with its *displayed* placeholder — partial
real characters followed by literal bullet characters (`•`, U+2022) — saved
as the actual value instead of the real key, if a password manager's autofill
overlay intercepts the field. That's an invalid header value (non-ASCII), and
Vite bakes env vars into the bundle at build time, so the break is silent: the
build succeeds, but the deployed app throws in every visitor's browser the
moment it tries to call Supabase. If login breaks with `Failed to execute
'fetch': ... String contains non ISO-8859-1 code point`, this is almost
certainly why — pull the live bundle's baked-in value and check it for
non-ASCII bytes before assuming it's a code bug.

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + shadcn-style components
(`src/components/ui`) + React Router + Supabase (`src/lib/supabase.ts`).

Auth is real (`src/lib/auth-context.tsx`, `RequireAuth`) — signup, login, and
session restore all hit the actual Supabase project. Roadmap/task data in
`src/lib/store.tsx` is real too — every read and write goes through Supabase,
nothing is local mock state anymore.

`src/lib/database.types.ts` is generated from the live schema. Regenerate it
after any migration (via the Supabase MCP `generate_typescript_types` tool,
or `supabase gen types typescript --project-id <ref>` with the CLI) — don't
hand-edit it.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run lint` — oxlint
