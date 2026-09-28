-- Persisted achievement unlocks. Rows are permanent: there is deliberately no
-- update or delete policy, so an unlock survives un-checking tasks, and the
-- client writes with INSERT ... ON CONFLICT DO NOTHING to stay idempotent.
create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  xp_awarded int not null default 0,
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "own rows select" on public.user_achievements
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.user_achievements
  for insert with check ((select auth.uid()) = user_id);

-- Longest streak ever reached, so streak achievements don't depend on
-- replaying task history (which changes when tasks are un-checked).
-- Other one-off flags (analytics viewed, AI roadmaps created) live in the
-- existing settings.preferences jsonb.
alter table public.settings add column longest_streak integer not null default 0;
