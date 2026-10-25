import { describe, expect, it } from 'vitest'
import { nextDueDate, pendingOccurrences, type Schedule } from './recurring'

const monthly = (overrides: Partial<Schedule> = {}): Schedule => ({
  day_of_month: 25,
  start_date: '2026-08-01',
  end_date: null,
  is_active: true,
  ...overrides,
})

describe('pendingOccurrences', () => {
  it('lists every due month up to today, oldest first', () => {
    expect(pendingOccurrences(monthly(), new Set(), '2026-10-25')).toEqual([
      { period: '2026-08-01', dueDate: '2026-08-25' },
      { period: '2026-09-01', dueDate: '2026-09-25' },
      { period: '2026-10-01', dueDate: '2026-10-25' },
    ])
  })

  it('leaves out this month while its due date is still ahead', () => {
    expect(pendingOccurrences(monthly(), new Set(), '2026-10-24').map((o) => o.period)).toEqual([
      '2026-08-01',
      '2026-09-01',
    ])
  })

  it('leaves out months already confirmed or skipped', () => {
    const resolved = new Set(['2026-08-01', '2026-10-01'])
    expect(pendingOccurrences(monthly(), resolved, '2026-10-30')).toEqual([{ period: '2026-09-01', dueDate: '2026-09-25' }])
  })

  it('clamps days 29–31 to the end of shorter months', () => {
    const schedule = monthly({ day_of_month: 31, start_date: '2026-01-01' })
    expect(pendingOccurrences(schedule, new Set(), '2026-04-30').map((o) => o.dueDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('starts at the first due date on or after the start date', () => {
    const schedule = monthly({ day_of_month: 10, start_date: '2026-09-15' })
    expect(pendingOccurrences(schedule, new Set(), '2026-10-25')).toEqual([{ period: '2026-10-01', dueDate: '2026-10-10' }])
  })

  it('stops after the end date', () => {
    const schedule = monthly({ end_date: '2026-09-30' })
    expect(pendingOccurrences(schedule, new Set(), '2026-12-31').map((o) => o.period)).toEqual(['2026-08-01', '2026-09-01'])
  })

  it('crosses the year boundary', () => {
    const schedule = monthly({ day_of_month: 5, start_date: '2026-12-01' })
    expect(pendingOccurrences(schedule, new Set(), '2027-02-10').map((o) => o.dueDate)).toEqual([
      '2026-12-05',
      '2027-01-05',
      '2027-02-05',
    ])
  })

  it('has nothing pending while paused or before it starts', () => {
    expect(pendingOccurrences(monthly({ is_active: false }), new Set(), '2026-10-25')).toEqual([])
    expect(pendingOccurrences(monthly({ start_date: '2026-11-01' }), new Set(), '2026-10-25')).toEqual([])
  })
})

describe('nextDueDate', () => {
  it('is the first due date after today', () => {
    expect(nextDueDate(monthly(), '2026-10-24')).toBe('2026-10-25')
    expect(nextDueDate(monthly(), '2026-10-25')).toBe('2026-11-25')
    expect(nextDueDate(monthly({ day_of_month: 31 }), '2026-10-31')).toBe('2026-11-30')
  })

  it('respects the start and end dates and pausing', () => {
    expect(nextDueDate(monthly({ start_date: '2027-01-01' }), '2026-10-25')).toBe('2027-01-25')
    expect(nextDueDate(monthly({ end_date: '2026-11-01' }), '2026-10-25')).toBeNull()
    expect(nextDueDate(monthly({ is_active: false }), '2026-10-25')).toBeNull()
  })
})
