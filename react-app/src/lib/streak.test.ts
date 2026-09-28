import { describe, expect, it } from "vitest"

import { localDateKey } from "./dates"
import { computeLongestStreak, computeStreak } from "./streak"

// Times are written with an explicit +05:30 offset; tests run in IST.
const done = (iso: string) => ({ done: true, completedAt: iso })

describe("test environment", () => {
  it("runs in IST", () => {
    expect(new Date("2026-09-28T00:15:00+05:30").getHours()).toBe(0)
  })
})

describe("localDateKey", () => {
  it("uses the local day, not the UTC day, just after local midnight", () => {
    const d = new Date("2026-09-28T00:15:00+05:30") // 2026-09-27T18:45Z
    expect(d.toISOString().slice(0, 10)).toBe("2026-09-27")
    expect(localDateKey(d)).toBe("2026-09-28")
  })
})

describe("computeStreak", () => {
  const now = new Date("2026-09-28T00:30:00+05:30")

  it("is 0 with no activity", () => {
    expect(computeStreak([], now)).toBe(0)
  })

  it("is 0 after 23 idle days (the reported bug)", () => {
    expect(computeStreak([done("2026-09-05T20:19:00+05:30")], now)).toBe(0)
  })

  it("decays to 0 once a whole day is missed", () => {
    expect(computeStreak([done("2026-09-26T12:00:00+05:30")], now)).toBe(0)
  })

  it("keeps yesterday's streak alive while today is still empty", () => {
    expect(computeStreak([done("2026-09-27T12:00:00+05:30")], now)).toBe(1)
  })

  it("groups by local day across IST midnight", () => {
    // Both are 2026-09-27 in UTC, but different local days.
    const lateYesterday = done("2026-09-27T23:50:00+05:30")
    const earlyToday = done("2026-09-28T00:10:00+05:30")
    expect(computeStreak([earlyToday], now)).toBe(1)
    expect(computeStreak([lateYesterday, earlyToday], now)).toBe(2)
  })

  it("ignores tasks that aren't done", () => {
    expect(computeStreak([{ done: false, completedAt: "2026-09-28T00:10:00+05:30" }], now)).toBe(0)
  })
})

describe("computeLongestStreak", () => {
  it("finds the longest run anywhere in history, across a month boundary", () => {
    const tasks = [
      done("2026-08-30T10:00:00+05:30"),
      done("2026-08-31T10:00:00+05:30"),
      done("2026-09-01T10:00:00+05:30"),
      done("2026-09-01T18:00:00+05:30"), // same day, counted once
      done("2026-09-10T10:00:00+05:30"),
      done("2026-09-11T10:00:00+05:30"),
    ]
    expect(computeLongestStreak(tasks)).toBe(3)
  })

  it("is 0 with no completions", () => {
    expect(computeLongestStreak([])).toBe(0)
  })
})
