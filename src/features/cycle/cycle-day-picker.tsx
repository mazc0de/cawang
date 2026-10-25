import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

/** Days 1–31 laid out like a month, so choosing payday feels like pointing at a calendar. */
export function CycleDayPicker({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={t('cycle.startDay')} className="grid grid-cols-7 gap-1.5">
      {DAYS.map((day) => {
        const selected = day === value
        return (
          <button
            key={day}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t('cycle.dayLabel', { day })}
            onClick={() => onChange(day)}
            className={cn(
              'num h-11 rounded-lg text-[15px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted hover:bg-accent hover:text-foreground',
            )}
          >
            {day}
          </button>
        )
      })}
    </div>
  )
}
