import { useTranslation } from 'react-i18next'
import { formatThousands } from '@/lib/format'
import { cn } from '@/lib/utils'
import { MASK, useAmountVisibility } from '@/providers/amount-visibility'

export type MoneyTone = 'default' | 'income' | 'expense' | 'transfer' | 'locked' | 'muted'

const toneClass: Record<MoneyTone, string> = {
  default: '',
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-transfer',
  locked: 'text-locked',
  muted: 'text-muted-foreground',
}

interface MoneyProps {
  amount: number
  tone?: MoneyTone
  /** Prefix "+" for income and "−" for expense tones. */
  signed?: boolean
  /** Ties the figure to its own show/hide choice ("summary", "account:<id>"); otherwise it follows the global one. */
  privacyKey?: string
  className?: string
}

/** An IDR amount in tabular figures, with "Rp" set smaller and quieter than the digits. */
export function Money({ amount, tone = 'default', signed = false, privacyKey, className }: MoneyProps) {
  const { t } = useTranslation()
  const { isHidden } = useAmountVisibility()
  if (isHidden(privacyKey)) {
    return (
      <span className={cn('num whitespace-nowrap', toneClass[tone], className)} aria-label={t('privacy.hiddenAmount')}>
        <span className="mr-[0.2em] text-[0.72em] font-medium opacity-70">Rp</span>
        <span aria-hidden="true" className="tracking-[0.08em]">
          {MASK}
        </span>
      </span>
    )
  }
  const negative = amount < 0
  const sign = negative ? '−' : signed && tone === 'income' ? '+' : signed && tone === 'expense' ? '−' : ''
  return (
    <span className={cn('num whitespace-nowrap', toneClass[tone], className)}>
      {sign}
      <span className="mr-[0.2em] text-[0.72em] font-medium opacity-70">Rp</span>
      {formatThousands(Math.abs(amount))}
    </span>
  )
}
