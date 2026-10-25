import { describe, expect, it } from 'vitest'
import { niceScale } from './chart-scale'

describe('niceScale', () => {
  it('rounds the top up to an even step', () => {
    expect(niceScale(3_900_000)).toEqual({ max: 4_000_000, ticks: [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000] })
    expect(niceScale(4_290_000)).toEqual({ max: 5_000_000, ticks: [0, 1_250_000, 2_500_000, 3_750_000, 5_000_000] })
    expect(niceScale(725_500)).toEqual({ max: 800_000, ticks: [0, 200_000, 400_000, 600_000, 800_000] })
  })

  it('handles an empty chart', () => {
    expect(niceScale(0)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] })
  })
})
