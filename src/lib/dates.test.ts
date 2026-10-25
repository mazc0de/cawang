import { describe, expect, it } from 'vitest'
import { dayBoundsUtc, zonedParts, zonedTimestamp } from './dates'

describe('dayBoundsUtc', () => {
  it('turns a calendar day in a timezone into a UTC half-open range', () => {
    expect(dayBoundsUtc('2026-10-25', 'Asia/Jakarta')).toEqual({
      start: '2026-10-24T17:00:00.000Z',
      end: '2026-10-25T17:00:00.000Z',
    })
  })

  it('handles a DST day of 23 hours', () => {
    expect(dayBoundsUtc('2026-03-08', 'America/New_York')).toEqual({
      start: '2026-03-08T05:00:00.000Z',
      end: '2026-03-09T04:00:00.000Z',
    })
  })
})

describe('zonedTimestamp and zonedParts', () => {
  it('builds the instant for a local date and time', () => {
    expect(zonedTimestamp('2026-10-25', '13:45', 'Asia/Jakarta')).toBe('2026-10-25T06:45:00.000Z')
    expect(zonedTimestamp('2026-10-25', '07:00', 'Asia/Jayapura')).toBe('2026-10-24T22:00:00.000Z')
  })

  it('reads the local date and time of an instant', () => {
    expect(zonedParts('2026-10-24T22:00:00.000Z', 'Asia/Jakarta')).toEqual({ date: '2026-10-25', time: '05:00' })
    expect(zonedParts('2026-10-24T16:59:00+00:00', 'Asia/Jakarta')).toEqual({ date: '2026-10-24', time: '23:59' })
  })
})
