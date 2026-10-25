import { describe, expect, it } from 'vitest'
import { budgetStatus } from './budget'

describe('budgetStatus', () => {
  it('is Safe below 80% of the limit', () => {
    expect(budgetStatus(0, 1_000_000)).toBe('safe')
    expect(budgetStatus(799_999, 1_000_000)).toBe('safe')
  })

  it('is Running Low from 80% up to and including 100%', () => {
    expect(budgetStatus(800_000, 1_000_000)).toBe('running_low')
    expect(budgetStatus(1_000_000, 1_000_000)).toBe('running_low')
  })

  it('is Over above 100%', () => {
    expect(budgetStatus(1_000_001, 1_000_000)).toBe('over')
  })
})
