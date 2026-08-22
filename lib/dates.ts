export const TZ = "America/Mexico_City"

const ymdFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// Returns YYYY-MM-DD for a given date in the business timezone.
export function toYMD(date: Date = new Date()): string {
  return ymdFmt.format(date)
}

export function todayYMD(): string {
  return toYMD(new Date())
}

// UTC offset (ms) of the business timezone at a given instant.
function tzOffsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const parts = dtf.formatToParts(date)
  const map: Record<string, number> = {}
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value)
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour === 24 ? 0 : map.hour, map.minute, map.second)
  return asUTC - date.getTime()
}

// UTC instant of local midnight for a YMD in the business timezone.
function zonedMidnightUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number)
  const naive = Date.UTC(y, m - 1, d, 0, 0, 0)
  const offset = tzOffsetMs(new Date(naive))
  return new Date(naive - offset)
}

// Build a UTC ISO range [startISO, endISO) covering the local day(s) between
// the two YMD strings (inclusive). Used to query sales.created_at.
export function ymdRangeToISO(startYMD: string, endYMD: string) {
  const start = zonedMidnightUTC(startYMD)
  const [ey, em, ed] = endYMD.split("-").map(Number)
  const next = new Date(Date.UTC(ey, em - 1, ed))
  next.setUTCDate(next.getUTCDate() + 1)
  const endYMDNext = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`
  const end = zonedMidnightUTC(endYMDNext)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export type RangeKey = "hoy" | "ayer" | "semana" | "mes"

export function presetRange(key: RangeKey): { start: string; end: string } {
  const now = new Date()
  const today = toYMD(now)
  if (key === "hoy") return { start: today, end: today }
  if (key === "ayer") {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    const yd = toYMD(y)
    return { start: yd, end: yd }
  }
  if (key === "semana") {
    const s = new Date(now)
    s.setDate(s.getDate() - 6)
    return { start: toYMD(s), end: today }
  }
  // mes
  const s = new Date(now)
  s.setDate(s.getDate() - 29)
  return { start: toYMD(s), end: today }
}
