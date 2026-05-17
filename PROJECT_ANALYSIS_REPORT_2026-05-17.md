# Roadmap Webapp Project Analysis Report

Generated: 2026-05-17  
Project path: `C:\Users\pc\Desktop\Projects\Roadmap_webapp`

## Executive Summary

The project is a static, multi-page HTML/CSS/vanilla JavaScript app for an RPG-style roadmap/productivity dashboard. The visual direction and page skeleton are mostly present, and there is meaningful work already done around shared navigation components, local state, dashboard rendering, settings persistence, achievements, analytics, and initial Supabase authentication.

However, the project is not currently in a stable MVP state. The existing `README.md` and `PROJECT_PROGRESS.md` describe the frontend as stable or near complete, but the current source has critical runtime and structural issues:

- `js/dashboard.js` has an extra closing brace around line 118 that likely prevents the dashboard script from parsing.
- `js/roadmap.js` expects an element with id `roadmap-tasks-list`, but `roadmap.html` does not contain that element. This makes the roadmap page fail as soon as it tries to render selected roadmap tasks.
- Supabase auth and remote persistence have been started, but there is no schema/migration documentation in the repo, no environment separation, and the anon key is hardcoded in `js/supabase-client.js`.
- Several CSS and JS placeholder files are empty.
- The nested `Roadmap_webapp/` folder contains a second copy of the project with conflicting/stale files, including a `roadmap.html` that is only 2 bytes. This can cause confusion and accidental edits to the wrong copy.
- There is no real test command. `npm test` is currently a placeholder that exits with an error, and in this environment it was also blocked by PowerShell execution policy.

## Revised Actual Progress

The previous tracker claims 82% frontend completion and roughly 50% overall completion. Based on the current files, a more realistic estimate is:

| Area | Actual Progress | Status |
|---|---:|---|
| Visual/UI page skeletons | 70% | Main screens exist, but responsiveness and HTML validity need review. |
| Shared frontend architecture | 55% | Shared components and state exist, but scripts are fragile and not consistently synchronized with HTML. |
| Dashboard functionality | 45% | Rendering logic exists, but script currently has a likely parse-breaking brace issue. |
| Roadmap functionality | 35% | Old static node UI and newer dynamic task UI are mixed together. Runtime element mismatch blocks the intended flow. |
| Analytics | 35% | Basic metrics render from state; charts and deeper insights are placeholders. |
| Achievements | 50% | Filters/modals work conceptually, but achievement data is hardcoded and not tied to real unlock rules. |
| Settings | 55% | Local profile/theme controls exist; remote save is indirect and needs validation. |
| Authentication | 30% | Supabase login/signup code exists, but database schema, environment setup, error handling, and end-to-end validation are incomplete. |
| Backend/data model | 20% | Client code assumes tables exist; no migrations, policies, API contracts, or seed data are documented. |
| Testing/QA | 5% | No automated tests or linting workflow. |
| Deployment readiness | 15% | Static files can be hosted, but CDN dependencies, secrets/config, schema setup, and build strategy are unresolved. |

Estimated overall completion: **40-45%**.

The app has a strong visual prototype and a partial state/auth foundation, but it needs stabilization before feature expansion.

## What Exists Now

### Pages

- `index.html`: Login/signup entry page with Supabase auth script.
- `dashboard.html`: Dashboard shell with stats, objective list, roadmap cards, commendations, and shared topbar/sidebar.
- `roadmap.html`: Roadmap shell with static hardcoded mission nodes and a mission detail panel.
- `analytics.html`: Analytics shell with state-derived metric cards and a "Chart visualization coming soon" placeholder.
- `achievements.html`: Achievement vault with hardcoded cards, filters, and modal.
- `settings.html`: Profile/settings UI with local state controls and save behavior.

### Shared JavaScript

- `js/app.js`: Global `window.Aegis` state manager, localStorage persistence, Supabase hydration/sync helpers, task helpers, sign-out flow.
- `js/components.js`: Web Components for `<aegis-sidebar>` and `<aegis-topbar>`.
- `js/auth.js`: Login/signup mode switching and Supabase auth calls.
- `js/supabase-client.js`: Supabase client initialization from globals or hardcoded fallback values.
- Page scripts: `dashboard.js`, `roadmap.js`, `analytics.js`, `achievements.js`, `settings.js`.

### State Model Currently Implied

Local state key: `aegis_state_v1`

Current frontend state shape:

```js
{
  roadmapsActive,
  streak,
  totalXp,
  tasks: [{ id, title, tag, xp, done }],
  roadmap: { selectedNode },
  commanderName,
  clearanceLevel,
  profile: { displayName, email },
  settings: {
    theme,
    fontScale,
    scanlines,
    soundEffects,
    animations
  }
}
```

Supabase tables assumed by client code:

- `profiles`: `id`, `display_name`, `email`
- `settings`: `user_id`, `theme`, `font_scale`, `scanlines`, `sound_effects`, `animations`
- `roadmap_state`: `user_id`, `selected_node`
- `tasks`: `id`, `user_id`, `title`, `tag`, `xp`, `done`

No SQL schema, migration, RLS policy, or setup instructions for these tables were found.

## Critical Issues To Fix First

### 1. Dashboard Script Parse Issue

File: `js/dashboard.js`  
Evidence: lines 113-118 include `handleCreateRoadmap`, followed by two closing `};` blocks. The second one appears unmatched.

Current section:

```js
const handleCreateRoadmap = () => {
  const roadmapName = prompt("Enter roadmap name:");
  if (!roadmapName || !roadmapName.trim()) return;

  window.Aegis.addTask(`Start ${roadmapName.trim()}`, `RM: ${roadmapName.trim()}`, 0);
};
};
```

Impact:

- If this is parsed by the browser as-is, `dashboard.js` can fail completely.
- Dashboard stats, task list, roadmap list, and create-roadmap behavior may not initialize.

How to fix:

1. Remove the extra `};`.
2. Re-run syntax checks on every file in `js/`.
3. Open `dashboard.html` in the browser and verify:
   - stats render,
   - task list renders,
   - create roadmap works,
   - no console errors appear.

### 2. Roadmap HTML/JS Contract Is Broken

File: `js/roadmap.js`  
Evidence: line 20 calls `document.getElementById("roadmap-tasks-list")`.

File: `roadmap.html`  
Evidence: no `id="roadmap-tasks-list"` exists. The page instead contains hardcoded `.roadmap-node` buttons with `data-node="NODE_01"` through `NODE_05`.

Impact:

- `listEl` becomes `null`.
- The first call to `listEl.innerHTML = ...` will throw.
- The intended dynamic roadmap-by-query-param flow cannot work.

How to fix:

Choose one roadmap model and remove the other.

Recommended direction:

1. Keep the dynamic task-based roadmap model.
2. In `roadmap.html`, replace the hardcoded static node grid with an empty container:

```html
<div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-gutter" id="roadmap-tasks-list"></div>
```

3. Update `roadmap.js` so it handles both states gracefully:
   - no roadmap selected,
   - roadmap selected but no tasks,
   - roadmap selected with tasks.
4. Make the dashboard roadmap cards link to `roadmap.html?roadmap=<name>` as they already attempt to do.
5. Add an "Add Task" action inside the roadmap page, not only on the dashboard.

### 3. Supabase Is Partially Wired But Not Product-Ready

File: `js/supabase-client.js`  
Evidence: Supabase URL and anon key are hardcoded on lines 3-4.

Impact:

- Hardcoded project config makes environment switching difficult.
- The project cannot be safely cloned or deployed without editing source.
- The code assumes Supabase tables and policies exist, but the repo does not define them.

How to fix:

1. Add `supabase/schema.sql` with the required tables.
2. Add RLS policies so users can only access their own rows.
3. Move runtime config into one of these:
   - `config.js` ignored by Git, with `config.example.js` committed,
   - or a small build step that injects environment variables.
4. Document Supabase setup in `README.md`.
5. Add graceful handling for missing/failed remote tables. Right now failed reads are not surfaced clearly to the user.

Suggested initial schema:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'dark',
  font_scale integer default 100,
  scanlines boolean default true,
  sound_effects boolean default false,
  animations boolean default true,
  updated_at timestamptz default now()
);

create table roadmap_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_node text default 'NODE_01',
  updated_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  tag text,
  xp integer default 0,
  done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4. Project Has Duplicate/Stale Copies

There is a nested directory:

`Roadmap_webapp/Roadmap_webapp/`

It contains another set of HTML/CSS/JS files with different sizes and stale content. For example, nested `Roadmap_webapp/roadmap.html` is only 2 bytes.

Impact:

- Easy to edit the wrong file.
- Reports and future tooling may scan duplicate/stale files.
- Deployment may accidentally publish the wrong directory.

How to fix:

1. Decide the canonical root. The current canonical root should be:

`C:\Users\pc\Desktop\Projects\Roadmap_webapp`

2. Move any useful file from the nested copy into the root if needed.
3. Delete or archive the nested copy after confirmation.
4. Update `.gitignore` if generated extraction folders should not be tracked.

### 5. Empty Placeholder Files Create False Confidence

Empty or placeholder files include:

- `css/animations.css`
- `css/components.css`
- `css/dashboard.css`
- `css/layout.css`
- `css/main.css`
- `css/style.css`
- `css/themes.css`
- `data/default-data.json`
- `js/backend/api.js`
- `js/backend/firebase-config.js`
- `js/features/analytics.js`
- `js/features/gamifications.js`
- `js/features/roadmap.js`
- `js/features/tasks.js`

Impact:

- The folder structure looks more complete than it is.
- Future contributors may not know where real code belongs.

How to fix:

1. Either remove unused placeholders or add a short comment explaining planned ownership.
2. Consolidate CSS into either:
   - one real `css/base.css` plus page CSS files that are actually used, or
   - a structured CSS system: `tokens.css`, `layout.css`, `components.css`, `pages/*.css`.
3. Do the same for JS: either use current page scripts or move logic into `js/features`, but avoid both.

## Functional Gaps

### Authentication

Current state:

- Login and signup UI exist.
- Supabase `signInWithPassword` and `signUp` are called.
- Signup can optionally upsert a display name into `profiles`.
- Existing sessions redirect from `index.html` to `dashboard.html`.
- Protected pages redirect unauthenticated users back to `index.html`.

Missing:

- Confirmed database schema.
- RLS policies.
- Password reset.
- Email confirmation UX.
- Loading states for protected pages while session restores.
- Clear error messages for missing Supabase tables/policies.
- Config separation for local/dev/prod.

How to complete:

1. Add schema and RLS policies.
2. Add a manual auth test checklist.
3. Add password reset.
4. Add a loading overlay while `window.Aegis.ready` resolves.
5. Add user-facing remote sync errors.

### Roadmaps

Current state:

- Dashboard can create a roadmap by adding one task tagged `RM: <name>`.
- Roadmap cards are derived from task tags.
- Roadmap page has a mission panel and dynamic task rendering logic.

Missing:

- Real roadmap entity/table.
- Real nodes/stages/subtasks model.
- Create/edit/delete roadmap.
- Add/edit/delete/reorder tasks.
- Completion rules.
- Locked/unlocked node logic.
- Dedicated roadmap progress persistence beyond tasks.

How to complete:

1. Introduce a `roadmaps` table:

```sql
create table roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

2. Add `roadmap_id` to `tasks`.
3. Stop using `tag` as the main relationship.
4. Build UI flows:
   - create roadmap modal,
   - create task modal,
   - mark task done,
   - edit task,
   - delete task,
   - archive roadmap.

### Dashboard

Current state:

- UI sections exist.
- Stats are derived from `window.Aegis.state`.
- Task toggles update state.
- Roadmap cards derive progress from task tags.

Missing:

- Stable parsing due dashboard script issue.
- Empty-state quality.
- Real onboarding seed tasks.
- Better create-roadmap modal instead of `prompt()`.
- Loading and error states.
- Recent activity should be generated from real events.

How to complete:

1. Fix syntax.
2. Replace `prompt()` with a modal.
3. Add `activity_log` state/table.
4. Seed a first roadmap/task for new users.
5. Add dashboard smoke tests.

### Analytics

Current state:

- Basic task count, XP, throughput, and streak values render.
- Chart area is explicitly "coming soon."

Missing:

- Real charts.
- Date-aware task completion history.
- Weekly/monthly filters.
- Streak calculation from actual activity dates.
- Roadmap-specific analytics.

How to complete:

1. Add `completed_at` to tasks.
2. Track activity events.
3. Add a chart library or lightweight SVG/canvas charts.
4. Define metrics:
   - completion rate,
   - XP by day,
   - streak,
   - best roadmap,
   - pending load,
   - weekly velocity.

### Achievements

Current state:

- Achievement cards are hardcoded.
- Filtering works by `data-rarity`.
- Modal shows card data.
- Summary loosely reacts to completed task count.

Missing:

- Real achievement definitions.
- Unlock rules.
- Persistence of unlocked achievements.
- Notification/toast when achievements unlock.

How to complete:

1. Move achievement definitions to JS or JSON.
2. Add unlock evaluator:

```js
const achievementRules = {
  first_task: (state) => state.tasks.some((task) => task.done),
  ten_tasks: (state) => state.tasks.filter((task) => task.done).length >= 10,
  first_roadmap: (state) => state.roadmapsActive >= 1
};
```

3. Save unlocked achievement ids.
4. Render achievements from data, not static HTML.

### Settings

Current state:

- Profile fields and UI settings are present.
- Settings save into `window.Aegis.state` and then call `window.Aegis.save()`.

Missing:

- Avatar upload.
- Account security section.
- Remote sync status.
- Delete account/export data flows.
- Validation for profile/email edits.

How to complete:

1. Decide whether email can be edited from settings. If yes, use Supabase auth email update, not only profile table updates.
2. Add avatar storage via Supabase Storage.
3. Add account actions:
   - reset password,
   - export data,
   - delete account.

## Technical Debt

### Encoding Issues

Several files show mojibake in rendered text, especially `README.md` and `achievements.html` symbols. This likely happened from mismatched UTF-8/Windows encoding.

How to fix:

1. Convert all project text files to UTF-8.
2. Replace corrupted characters manually.
3. Add editor settings:

```json
{
  "files.encoding": "utf8",
  "files.eol": "\n"
}
```

### CDN Dependency

All HTML pages load Tailwind and fonts from CDNs.

Impact:

- App needs network access to render correctly.
- Tailwind CDN is not a production build strategy.
- CSS class scanning/minification is absent.

How to fix:

1. Add a build setup with Tailwind CLI or Vite.
2. Move Tailwind config into `tailwind.config.js`.
3. Build a local CSS bundle.
4. Keep fonts local or accept external font dependency intentionally.

### Global State and Global Scripts

The app depends on `window.Aegis` and script load order.

Impact:

- Pages can break if scripts load in the wrong order.
- Testing individual modules is hard.
- Race conditions exist around Supabase hydration and page render.

How to fix:

1. Convert scripts to ES modules.
2. Export/import state functions explicitly.
3. Make page scripts wait for `window.Aegis.ready` before rendering.
4. Add defensive null checks for every DOM lookup.

### No Automated QA

Current `package.json` has:

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

How to fix:

1. Add a syntax check script.
2. Add a link/DOM smoke test.
3. Add Playwright for the core flows.

Suggested scripts:

```json
{
  "scripts": {
    "check:js": "node scripts/check-js.js",
    "test": "npm run check:js",
    "serve": "npx http-server . -p 4173"
  }
}
```

## Recommended Implementation Plan

### Phase 1: Stabilize Current Frontend

Goal: Make existing app pages load without console errors.

Tasks:

1. Fix `js/dashboard.js` extra brace.
2. Fix `roadmap.html` / `js/roadmap.js` mismatch.
3. Add defensive DOM checks in page scripts.
4. Remove or archive nested duplicate project folder.
5. Convert corrupted text to UTF-8.
6. Add a basic JS syntax check script.
7. Update `PROJECT_PROGRESS.md` to reflect reality.

Exit criteria:

- `index.html`, `dashboard.html`, `roadmap.html`, `analytics.html`, `achievements.html`, and `settings.html` load with no console errors.
- Dashboard can create a roadmap.
- Roadmap page can open that roadmap.
- Task completion updates dashboard, roadmap, analytics, and achievements summary.

### Phase 2: Define Real Data Model

Goal: Stop using task tags as the primary data model.

Tasks:

1. Add `supabase/schema.sql`.
2. Create tables: `profiles`, `settings`, `roadmaps`, `tasks`, `achievements`, `activity_events`.
3. Add RLS policies.
4. Add `config.example.js`.
5. Document Supabase setup.

Exit criteria:

- A new developer can create the Supabase project and run the app from the README.
- User data is isolated per account.
- Remote persistence works after refresh and across browsers.

### Phase 3: Build Core Product Workflows

Goal: Make the app useful as a real roadmap tracker.

Tasks:

1. Create roadmap modal.
2. Roadmap detail page with task CRUD.
3. Mark done/undo done.
4. XP and level calculation.
5. Activity log.
6. Achievement unlock engine.
7. Dashboard recent activity from real events.

Exit criteria:

- User can sign up, create a roadmap, add tasks, complete tasks, gain XP, unlock achievements, and see analytics update.

### Phase 4: UX and Production Polish

Goal: Make the app deployable and pleasant.

Tasks:

1. Replace Tailwind CDN with local build.
2. Add responsive mobile sidebar/topbar.
3. Add loading/skeleton states.
4. Add error toasts.
5. Add password reset.
6. Add account settings.
7. Add Playwright smoke tests.
8. Deploy to Netlify/Vercel.

Exit criteria:

- Deployed app works on desktop and mobile.
- Core flows pass automated smoke tests.
- No hardcoded environment values in source.

## Suggested File Changes

Immediate files to edit:

- `js/dashboard.js`: remove unmatched closing brace and wait for `Aegis.ready`.
- `roadmap.html`: add `#roadmap-tasks-list` or revert `roadmap.js` to static node behavior.
- `js/roadmap.js`: add null checks and support task add/toggle.
- `js/supabase-client.js`: remove hardcoded fallback config after adding `config.example.js`.
- `README.md`: fix encoding, update status, add setup instructions.
- `PROJECT_PROGRESS.md`: update progress and blockers.
- `package.json`: add real scripts.

New files to add:

- `PROJECT_ANALYSIS_REPORT_2026-05-17.md`
- `supabase/schema.sql`
- `config.example.js`
- `scripts/check-js.js`
- `tests/smoke.spec.js` after Playwright is introduced

## Verification Performed

Commands and checks attempted:

- Inspected root project files and nested duplicate folder.
- Reviewed `README.md` and `PROJECT_PROGRESS.md`.
- Reviewed core HTML pages and page scripts.
- Checked Git history and status with `git -C`.
- Searched for placeholders, Supabase config, and roadmap DOM contract mismatches.
- Attempted `npm test`; it is not currently usable because the package test script is a placeholder and PowerShell blocked `npm.ps1` under the current execution policy.
- Attempted JS syntax checks through shell/Node; shell checks were unreliable in this sandbox, but manual source inspection found clear breakpoints that should be fixed first.

## Immediate Next Action

Start with stabilization, not new features:

1. Fix `dashboard.js`.
2. Fix `roadmap.html` and `roadmap.js` contract.
3. Add a minimal `scripts/check-js.js`.
4. Run the app locally and verify all pages in browser.
5. Only then continue backend/schema work.

The project has a solid concept and enough UI work to build from, but the honest current state is a prototype with partial auth and broken page contracts, not a complete frontend MVP.
