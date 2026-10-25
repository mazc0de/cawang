import { describe, expect, it } from 'vitest'
import { cycleContaining, cycleStartInMonth, daysUntilNextCycle, shiftCycle } from './cycle'

describe('cycleStartInMonth', () => {
  it('uses the start day when the month has it', () => {
    expect(cycleStartInMonth(2026, 10, 25)).toBe('2026-10-25')
  })

  it('clamps days 29–31 to the last day of a shorter month', () => {
    expect(cycleStartInMonth(2026, 2, 31)).toBe('2026-02-28')
    expect(cycleStartInMonth(2028, 2, 30)).toBe('2028-02-29')
    expect(cycleStartInMonth(2026, 4, 31)).toBe('2026-04-30')
  })
})

describe('cycleContaining', () => {
  it('runs from the start day to the day before the next start day', () => {
    expect(cycleContaining('2026-11-03', 25)).toEqual({ start: '2026-10-25', end: '2026-11-24' })
    expect(cycleContaining('2026-10-25', 25)).toEqual({ start: '2026-10-25', end: '2026-11-24' })
    expect(cycleContaining('2026-10-24', 25)).toEqual({ start: '2026-09-25', end: '2026-10-24' })
  })

  it('is the calendar month when the start day is 1', () => {
    expect(cycleContaining('2026-02-14', 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(cycleContaining('2026-12-31', 1)).toEqual({ start: '2026-12-01', end: '2026-12-31' })
  })

  it('rolls over the year', () => {
    expect(cycleContaining('2027-01-10', 25)).toEqual({ start: '2026-12-25', end: '2027-01-24' })
    expect(cycleContaining('2026-12-28', 25)).toEqual({ start: '2026-12-25', end: '2027-01-24' })
  })

  it('clamps around short months so every day belongs to exactly one cycle', () => {
    expect(cycleContaining('2026-01-31', 31)).toEqual({ start: '2026-01-31', end: '2026-02-27' })
    expect(cycleContaining('2026-02-28', 31)).toEqual({ start: '2026-02-28', end: '2026-03-30' })
    expect(cycleContaining('2026-03-30', 31)).toEqual({ start: '2026-02-28', end: '2026-03-30' })
    expect(cycleContaining('2026-03-31', 31)).toEqual({ start: '2026-03-31', end: '2026-04-29' })
    expect(cycleContaining('2028-02-29', 30)).toEqual({ start: '2028-02-29', end: '2028-03-29' })
  })

  it('is retroactive: the same date falls in a different cycle when the start day changes', () => {
    expect(cycleContaining('2026-10-10', 1)).toEqual({ start: '2026-10-01', end: '2026-10-31' })
    expect(cycleContaining('2026-10-10', 25)).toEqual({ start: '2026-09-25', end: '2026-10-24' })
    expect(cycleContaining('2026-10-10', 10)).toEqual({ start: '2026-10-10', end: '2026-11-09' })
  })
})

describe('shiftCycle', () => {
  it('moves to the next and previous cycle', () => {
    const current = cycleContaining('2026-11-03', 25)
    expect(shiftCycle(current, 25, 1)).toEqual({ start: '2026-11-25', end: '2026-12-24' })
    expect(shiftCycle(current, 25, -1)).toEqual({ start: '2026-09-25', end: '2026-10-24' })
    expect(shiftCycle(current, 25, 3)).toEqual({ start: '2027-01-25', end: '2027-02-24' })
  })

  it('keeps clamping while stepping through short months', () => {
    const jan = cycleContaining('2026-01-31', 31)
    expect(shiftCycle(jan, 31, 1)).toEqual({ start: '2026-02-28', end: '2026-03-30' })
    expect(shiftCycle(jan, 31, 2)).toEqual({ start: '2026-03-31', end: '2026-04-29' })
  })
})

describe('daysUntilNextCycle', () => {
  it('counts the days from today to the next start day', () => {
    expect(daysUntilNextCycle('2026-11-20', 25)).toBe(5)
    expect(daysUntilNextCycle('2026-11-24', 25)).toBe(1)
    expect(daysUntilNextCycle('2026-11-25', 25)).toBe(30)
    expect(daysUntilNextCycle('2026-12-31', 1)).toBe(1)
  })
})
