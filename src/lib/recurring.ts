import { addMonths, type IsoDate, parseIsoDate, toIsoDate } from './dates'
import { cycleStartInMonth } from './cycle'

/** The scheduling fields of a Recurring Template. */
export interface Schedule {
  day_of_month: number
  start_date: IsoDate
  end_date: IsoDate | null
  is_active: boolean
}

export interface Occurrence {
  /** First day of the due month; identifies the Occurrence. */
  period: IsoDate
  dueDate: IsoDate
}

function occurrenceIn(year: number, month: number, schedule: Schedule): Occurrence {
  // A Cycle Start Day and a template's day of month clamp the same way.
  return { period: toIsoDate(year, month, 1), dueDate: cycleStartInMonth(year, month, schedule.day_of_month) }
}

function withinSchedule(occurrence: Occurrence, schedule: Schedule): boolean {
  return occurrence.dueDate >= schedule.start_date && (!schedule.end_date || occurrence.dueDate <= schedule.end_date)
}

/**
 * Occurrences due on or before today that are neither confirmed nor skipped, oldest first.
 * Only resolved ones are stored, so a template edit reaches every pending Occurrence.
 */
export function pendingOccurrences(schedule: Schedule, resolvedPeriods: Set<IsoDate>, today: IsoDate): Occurrence[] {
  if (!schedule.is_active) return []
  const result: Occurrence[] = []
  let { year, month } = parseIsoDate(schedule.start_date)
  const last = parseIsoDate(today)
  while (year < last.year || (year === last.year && month <= last.month)) {
    const occurrence = occurrenceIn(year, month, schedule)
    if (withinSchedule(occurrence, schedule) && occurrence.dueDate <= today && !resolvedPeriods.has(occurrence.period)) {
      result.push(occurrence)
    }
    ;({ year, month } = addMonths(year, month, 1))
  }
  return result
}

/** The first due date after today, or null when the template is paused or has ended. */
export function nextDueDate(schedule: Schedule, today: IsoDate): IsoDate | null {
  if (!schedule.is_active) return null
  const from = schedule.start_date > today ? schedule.start_date : today
  let { year, month } = parseIsoDate(from)
  // Two months always contain the next due date after `from`.
  for (let step = 0; step < 3; step++) {
    const occurrence = occurrenceIn(year, month, schedule)
    if (occurrence.dueDate > today && withinSchedule(occurrence, schedule)) return occurrence.dueDate
    if (schedule.end_date && occurrence.dueDate > schedule.end_date) return null
    ;({ year, month } = addMonths(year, month, 1))
  }
  return null
}
