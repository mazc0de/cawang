import { TZDate } from '@date-fns/tz'

/**
 * Calendar dates are carried as ISO strings ("2026-10-25") so that no browser timezone can
 * shift them. Arithmetic runs on UTC midnights, which have no DST.
 */
export type IsoDate = string

const DAY_MS = 86_400_000

export function toIsoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` // taste-skill-ignore: ISO dates, not index labels
}

export function parseIsoDate(date: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function toUtcMs(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date)
  return Date.UTC(year, month - 1, day)
}

function fromUtcMs(ms: number): IsoDate {
  const d = new Date(ms)
  return toIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS)
}

export function diffInDays(later: IsoDate, earlier: IsoDate): number {
  return Math.round((toUtcMs(later) - toUtcMs(earlier)) / DAY_MS)
}

/** Month arithmetic on (year, month) pairs; month is 1–12. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** Today's calendar date in an IANA timezone ("Asia/Jakarta"). */
export function todayIn(timeZone: string): IsoDate {
  return zonedParts(new Date().toISOString(), timeZone).date
}

/** Local wall-clock time "HH:mm". */
export type LocalTime = string

/** The UTC instant (ISO, "Z") of a local date and time in a timezone. */
export function zonedTimestamp(date: IsoDate, time: LocalTime, timeZone: string): string {
  const { year, month, day } = parseIsoDate(date)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(new TZDate(year, month - 1, day, hours, minutes, timeZone).getTime()).toISOString()
}

/** The local date and time of an instant in a timezone. */
export function zonedParts(timestamp: string, timeZone: string): { date: IsoDate; time: LocalTime } {
  const local = new TZDate(new Date(timestamp).getTime(), timeZone)
  const time = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}` // taste-skill-ignore: clock time
  return { date: toIsoDate(local.getFullYear(), local.getMonth() + 1, local.getDate()), time }
}

/** A calendar day in a timezone as a half-open UTC range, for querying timestamptz columns. */
export function dayBoundsUtc(date: IsoDate, timeZone: string): { start: string; end: string } {
  return { start: zonedTimestamp(date, '00:00', timeZone), end: zonedTimestamp(addDays(date, 1), '00:00', timeZone) }
}

/**
 * A plain Date whose local fields equal the given calendar date, for display with date-fns
 * `format`. Never use it for arithmetic or storage.
 */
export function isoDateToLocalDate(date: IsoDate): Date {
  const { year, month, day } = parseIsoDate(date)
  return new Date(year, month - 1, day)
}
