/** A round axis maximum at or above `value` (1, 1.25, 2, 2.5 or 5 × 10ⁿ) and evenly spaced ticks up to it. */
export function niceScale(value: number, tickCount = 4): { max: number; ticks: number[] } {
  if (value <= 0) return { max: tickCount, ticks: Array.from({ length: tickCount + 1 }, (_, index) => index) }
  const rawStep = value / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 1.25, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rawStep)!
  const max = step * tickCount
  return { max, ticks: Array.from({ length: tickCount + 1 }, (_, index) => index * step) }
}
