import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { currentLanguage } from '@/i18n'
import type { Cycle } from '@/lib/cycle'
import { formatCycleRange } from '@/lib/format'

interface CycleNavigatorProps {
  cycle: Cycle
  /** 0 is the current Cycle, -1 the one before, and so on. Future Cycles are not offered. */
  offset: number
  onOffsetChange: (offset: number) => void
}

export function CycleNavigator({ cycle, offset, onOffsetChange }: CycleNavigatorProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" aria-label={t('cycle.previous')} onClick={() => onOffsetChange(offset - 1)}>
        <ChevronLeft />
      </Button>
      <p className="min-w-0 px-1 text-base font-semibold">
        <span className="sr-only">{t('cycle.label')} </span>
        {formatCycleRange(cycle, currentLanguage())}
      </p>
      <Button variant="ghost" size="icon" aria-label={t('cycle.next')} disabled={offset >= 0} onClick={() => onOffsetChange(offset + 1)}>
        <ChevronRight />
      </Button>
      {offset < 0 && (
        <Button variant="outline" size="sm" className="ml-1" onClick={() => onOffsetChange(0)}>
          {t('cycle.thisCycle')}
        </Button>
      )}
    </div>
  )
}
