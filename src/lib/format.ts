import { format } from 'date-fns'
import { enUS, id as idLocale } from 'date-fns/locale'
import type { Language } from '@/i18n'
import type { Cycle } from './cycle'
import { type IsoDate, isoDateToLocalDate, parseIsoDate } from './dates'

const rupiah = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** "Rp 1.250.000" in both languages; negatives as "-Rp 1.250.000". */
export function formatIDR(amount: number): string {
  return `${amount < 0 ? '-' : ''}Rp ${rupiah.format(Math.abs(amount))}`
}

/** Digits with thousands dots, no currency: "1.250.000". */
export function formatThousands(amount: number): string {
  return rupiah.format(amount)
}

/** Short amounts for tight spaces: "1,2 jt", "250 rb" / "1.2M", "250K" (no currency). */
export function formatCompact(amount: number, language: Language): string {
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', { notation: 'compact', maximumSignificantDigits: 2 }).format(amount)
}

export function dateLocale(language: Language) {
  return language === 'id' ? idLocale : enUS
}

/** "25 Okt 2026" / "Oct 25, 2026". */
export function formatDate(date: IsoDate, language: Language): string {
  return format(isoDateToLocalDate(date), 'PP', { locale: dateLocale(language) })
}

/** "25 Okt – 24 Nov 2026" / "Oct 25 – Nov 24, 2026"; the year appears twice only when it differs. */
export function formatCycleRange(cycle: Cycle, language: Language): string {
  const locale = dateLocale(language)
  const sameYear = parseIsoDate(cycle.start).year === parseIsoDate(cycle.end).year
  const start = isoDateToLocalDate(cycle.start)
  const end = isoDateToLocalDate(cycle.end)
  if (language === 'id') {
    return `${format(start, sameYear ? 'd MMM' : 'd MMM yyyy', { locale })} – ${format(end, 'd MMM yyyy', { locale })}`
  }
  return `${format(start, sameYear ? 'MMM d' : 'MMM d, yyyy', { locale })} – ${format(end, 'MMM d, yyyy', { locale })}`
}
