import { describe, expect, it } from 'vitest'
import { DEFAULT_AMOUNT_PRESETS, MAX_AMOUNT_PRESETS, normalizePresets, presetsOf } from './amount-presets'

describe('normalizePresets', () => {
  it('sorts, removes duplicates and keeps whole positive rupiah', () => {
    expect(normalizePresets([50000, 10000, 10000, 0, -5, 2500.4])).toEqual([2500, 10000, 50000])
  })

  it(`keeps at most ${MAX_AMOUNT_PRESETS}`, () => {
    expect(normalizePresets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => n * 1000))).toHaveLength(MAX_AMOUNT_PRESETS)
  })
})

describe('presetsOf', () => {
  it('uses the saved list, or the defaults when there is none', () => {
    expect(presetsOf({ amount_presets: [20000, 5000] })).toEqual([5000, 20000])
    expect(presetsOf({ amount_presets: [] })).toEqual([])
    expect(presetsOf({})).toEqual(DEFAULT_AMOUNT_PRESETS)
  })
})
