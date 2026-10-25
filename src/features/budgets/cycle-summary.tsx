import { useTranslation } from 'react-i18next'
import { Money } from '@/components/money'
import { budgetStatus } from '@/lib/budget'
import { type BudgetProgress, summarize } from './queries'
import { PendingSwatch, PlanBar } from './plan-bar'

/** Cycle Summary: everything spent against the total of all Budgets. */
export function CycleSummary({ rows, compact = false }: { rows: BudgetProgress[]; compact?: boolean }) {
  const { t } = useTranslation()
  const total = summarize(rows)
  const status = budgetStatus(total.spent, total.limit)
  const left = total.limit - total.spent
  return (
    <div>
      <p className="text-sm text-muted-foreground">{t('budgets.spentOfTotal')}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <Money amount={total.spent} className={compact ? 'text-2xl font-semibold' : 'text-[32px] leading-10 font-semibold tracking-tight'} />
        <span className="text-sm text-muted-foreground">
          {t('budgets.ofLimit')} <Money amount={total.limit} />
        </span>
      </p>
      <PlanBar limit={total.limit} spent={total.spent} pending={total.pending} status={status} className="mt-3" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span className={left < 0 ? 'text-expense' : undefined}>
          {left < 0 ? t('budgets.overBy', { amount: '' }) : t('budgets.left')} <Money amount={Math.abs(left)} />
        </span>
        {total.pending > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <PendingSwatch />
            {t('budgets.pendingSafePay')} <Money amount={total.pending} />
          </span>
        )}
      </div>
    </div>
  )
}
