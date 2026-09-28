// Auto-assigns due dates to a roadmap's top-level tasks when it's created
// (manual builder or AI generator), by detecting a "Day N" / "Week N"
// pattern across every task title and spreading tasks evenly across the
// implied date range. v1 scope: top-level tasks only - subtasks never get a
// due date. If the titles don't share one consistent day/week pattern, the
// roadmap has no clear duration/stage structure and every task gets a null
// due date (falls into "unscheduled", not "today").

// YYYY-MM-DD in the user's local timezone. Not toISOString(), which is UTC:
// in e.g. IST that files anything done before 05:30 under the previous day.
function toDateOnlyIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// Returns the total span in days implied by the titles, or null if the
// titles don't share one consistent day/week pattern. Requires *every*
// title to match in the same unit - a partial match is still "unclear
// structure" per the v1 spec, not a best-effort partial schedule.
function detectDurationDays(titles: string[]): number | null {
  if (titles.length === 0) return null

  const dayValues = titles.map((t) => t.match(/\bdays?\s*(\d{1,3})\b/i)?.[1])
  const weekValues = titles.map((t) => t.match(/\bweeks?\s*(\d{1,3})\b/i)?.[1])

  if (dayValues.every((v) => v !== undefined)) {
    const max = Math.max(...dayValues.map(Number))
    return max
  }
  if (weekValues.every((v) => v !== undefined)) {
    const max = Math.max(...weekValues.map(Number))
    return max * 7
  }
  return null
}

// Given the top-level task titles (in their intended chronological order)
// and a start date, returns one due date (or null) per title.
function assignDueDates(titles: string[], startDate: Date): (string | null)[] {
  if (titles.length === 0) return []
  if (titles.length === 1) {
    // Nothing to "spread" - a single task just starts on day one.
    return detectDurationDays(titles) !== null ? [toDateOnlyIso(startDate)] : [null]
  }

  const totalDays = detectDurationDays(titles)
  if (totalDays === null) return titles.map(() => null)

  const spanDays = Math.max(0, totalDays - 1)
  return titles.map((_, i) => {
    const offsetDays = Math.round((i / (titles.length - 1)) * spanDays)
    const d = new Date(startDate)
    d.setDate(d.getDate() + offsetDays)
    return toDateOnlyIso(d)
  })
}

export { assignDueDates, detectDurationDays, toDateOnlyIso }
