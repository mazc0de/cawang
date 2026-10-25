export const INDONESIAN_TIMEZONES = [
  { value: 'Asia/Jakarta', abbreviation: 'WIB' },
  { value: 'Asia/Makassar', abbreviation: 'WITA' },
  { value: 'Asia/Jayapura', abbreviation: 'WIT' },
] as const

const indonesian = new Set<string>(INDONESIAN_TIMEZONES.map((zone) => zone.value))

/** Every other IANA zone the browser knows, for people living outside Indonesia. */
export function otherTimezones(): string[] {
  return Intl.supportedValuesOf('timeZone').filter((zone) => !indonesian.has(zone))
}

export function timezoneLabel(zone: string): string {
  const match = INDONESIAN_TIMEZONES.find((item) => item.value === zone)
  const name = zone.replaceAll('_', ' ')
  return match ? `${match.abbreviation} · ${name}` : name
}
