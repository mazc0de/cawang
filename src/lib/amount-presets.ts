/** Amount templates: tapping one adds it to the amount being entered, like counting out cash. */
export const DEFAULT_AMOUNT_PRESETS = [5_000, 10_000, 20_000, 50_000, 100_000]
export const MAX_AMOUNT_PRESETS = 8

export function normalizePresets(amounts: number[]): number[] {
  const whole = amounts.map((amount) => Math.round(amount)).filter((amount) => amount > 0)
  return [...new Set(whole)].sort((a, b) => a - b).slice(0, MAX_AMOUNT_PRESETS)
}

/** The profile's templates; before the column exists (schema not re-run yet) the defaults apply. */
export function presetsOf(profile: { amount_presets?: number[] | null }): number[] {
  return profile.amount_presets ? normalizePresets(profile.amount_presets) : DEFAULT_AMOUNT_PRESETS
}
