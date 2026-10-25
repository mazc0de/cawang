import { useTranslation } from 'react-i18next'
import type { BudgetStatus } from '@/lib/budget'
import { cn } from '@/lib/utils'

const pillClass: Record<BudgetStatus, string> = {
  safe: 'bg-muted text-muted-foreground',
  running_low: 'bg-caution-soft text-caution',
  over: 'bg-expense-soft text-expense',
}

export function BudgetStatusPill({ status }: { status: BudgetStatus }) {
  const { t } = useTranslation()
  return (
    <span className={cn('inline-flex h-6 flex-none items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap', pillClass[status])}>
      {t(`budgets.status.${status}`)}
    </span>
  )
}
