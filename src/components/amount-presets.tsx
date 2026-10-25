import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { currentLanguage } from '@/i18n'
import { formatCompact, formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'

interface AmountPresetsProps {
  presets: number[]
  amount: number | null
  onChange: (amount: number | null) => void
  className?: string
}

/** One-tap amounts under an amount field: each tap adds its value, like counting out cash. */
export function AmountPresets({ presets, amount, onChange, className }: AmountPresetsProps) {
  const { t } = useTranslation()
  const language = currentLanguage()
  if (presets.length === 0) return null
  const chip =
    'inline-flex h-9 shrink-0 items-center rounded-full border bg-card px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95'
  return (
    <div role="group" aria-label={t('amountPresets.label')} className={cn('-mx-1 flex gap-2 overflow-x-auto px-1 pb-1', className)}>
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          className={cn(chip, 'num')}
          aria-label={t('amountPresets.add', { amount: formatIDR(preset) })}
          onClick={() => onChange((amount ?? 0) + preset)}
        >
          +{formatCompact(preset, language)}
        </button>
      ))}
      {amount !== null && amount > 0 && (
        <button type="button" className={cn(chip, 'text-muted-foreground')} onClick={() => onChange(null)}>
          <RotateCcw className="mr-1.5 size-3.5" />
          {t('amountPresets.reset')}
        </button>
      )}
    </div>
  )
}
