import { addDays, addMonths, daysInMonth, diffInDays, type IsoDate, parseIsoDate, toIsoDate } from './dates'

/**
 * A Cycle runs from the Cycle Start Day up to the day before the next start day
 * (GLOSSARY.md). Start days 29–31 clamp to the last day of shorter months. The setting is
 * retroactive, so a Cycle is always computed from the current start day, never stored.
 */
export interface Cycle {
  start: IsoDate
  /** Inclusive. */
  end: IsoDate
}

export function cycleStartInMonth(year: number, month: number, startDay: number): IsoDate {
  return toIsoDate(year, month, Math.min(startDay, daysInMonth(year, month)))
}

function cycleStartingIn(year: number, month: number, startDay: number): Cycle {
  const next = addMonths(year, month, 1)
  return {
    start: cycleStartInMonth(year, month, startDay),
    end: addDays(cycleStartInMonth(next.year, next.month, startDay), -1),
  }
}

export function cycleContaining(date: IsoDate, startDay: number): Cycle {
  const { year, month } = parseIsoDate(date)
  if (date >= cycleStartInMonth(year, month, startDay)) {
    return cycleStartingIn(year, month, startDay)
  }
  const previous = addMonths(year, month, -1)
  return cycleStartingIn(previous.year, previous.month, startDay)
}

export function shiftCycle(cycle: Cycle, startDay: number, delta: number): Cycle {
  const { year, month } = parseIsoDate(cycle.start)
  const target = addMonths(year, month, delta)
  return cycleStartingIn(target.year, target.month, startDay)
}

export function daysUntilNextCycle(today: IsoDate, startDay: number): number {
  return diffInDays(addDays(cycleContaining(today, startDay).end, 1), today)
}
