import { useTranslation } from 'react-i18next'
import { currentLanguage } from '@/i18n'
import { cycleContaining, daysUntilNextCycle } from '@/lib/cycle'
import { todayIn } from '@/lib/dates'
import { formatCycleRange } from '@/lib/format'

/** What a Cycle Start Day produces, shown next to the control that sets it. */
export function CyclePreview({ startDay, timezone }: { startDay: number; timezone: string }) {
  const { t } = useTranslation()
  const today = todayIn(timezone)
  const cycle = cycleContaining(today, startDay)
  return (
    <div className="rounded-xl bg-raised px-4 py-3 text-sm">
      <p className="font-medium text-foreground">{t('cycle.current', { range: formatCycleRange(cycle, currentLanguage()) })}</p>
      <p className="mt-0.5 text-muted-foreground">{t('cycle.nextIn', { count: daysUntilNextCycle(today, startDay) })}</p>
      {startDay >= 29 && <p className="mt-2 text-muted-foreground">{t('cycle.clampNote')}</p>}
    </div>
  )
}
