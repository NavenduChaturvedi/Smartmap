// The one place calendar days are computed. Every "which day was this?"
// question in the app (streaks, per-day charts, due dates, achievements) goes
// through localDateKey so they all agree on where a day starts: the user's
// local midnight. Never use toISOString().slice(0, 10) for this - that's UTC,
// which in IST files anything done before 05:30 under the previous day.

// YYYY-MM-DD in the user's local timezone.
function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// Whole calendar days from key `a` to key `b` (positive when b is later).
// Keys are parsed as UTC midnights, so DST shifts can't produce fractions.
function daysBetweenKeys(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export { addDays, daysBetweenKeys, localDateKey }
