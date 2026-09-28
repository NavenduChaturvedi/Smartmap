import { addDays, daysBetweenKeys, localDateKey } from "./dates"

interface CompletionLike {
  done: boolean
  completedAt: string | null
}

// Local days with at least one completed task.
function activeDayKeys(tasks: CompletionLike[]): Set<string> {
  const days = new Set<string>()
  for (const t of tasks) {
    if (t.done && t.completedAt) days.add(localDateKey(new Date(t.completedAt)))
  }
  return days
}

// Consecutive local days, ending today, with at least one completed task.
// Derived on read, so it decays by itself: after a missed day it's 0 without
// anything having to write that down. A day with nothing done yet doesn't
// break the streak until it's over, so the count runs back from yesterday
// when today is still empty.
function computeStreak(tasks: CompletionLike[], now = new Date()): number {
  const days = activeDayKeys(tasks)
  let cursor = days.has(localDateKey(now)) ? now : addDays(now, -1)
  let streak = 0
  while (days.has(localDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

// Longest run of consecutive active days anywhere in the task history. Used
// to seed settings.longest_streak for accounts that predate that column.
function computeLongestStreak(tasks: CompletionLike[]): number {
  const keys = [...activeDayKeys(tasks)].sort()
  let longest = 0
  let run = 0
  for (let i = 0; i < keys.length; i++) {
    run = i > 0 && daysBetweenKeys(keys[i - 1], keys[i]) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  return longest
}

export { computeLongestStreak, computeStreak }
