import { useTranslation } from 'react-i18next'
import { Money } from '@/components/money'
import { PendingSwatch, PlanBar } from '@/features/budgets/plan-bar'
import { BudgetStatusPill } from '@/features/budgets/status-pill'
import { CategoryTile } from '@/features/categories/category-tile'
import { currentLanguage } from '@/i18n'
import { budgetStatus } from '@/lib/budget'
import { formatCompact, formatCycleRange, formatDate, formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'

/*
 * Pieces of the real interface filled with sample money, for the landing page. Every total is
 * computed from its rows, so the numbers agree with each other.
 */

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-ui className={cn('rounded-(--radius-card) border bg-card p-5 text-card-foreground', className)}>
      {children}
    </div>
  )
}

const SAFE_PAYS = [
  { note: 'Bayar kos', category: { icon: 'receipt', color: 'blue' }, amount: 750_000, due: 'dueSoon' as const },
  { note: 'Tiket konser', category: { icon: 'clapperboard', color: 'rose' }, amount: 120_000, due: 'overdue' as const },
]

export function SafePayFragment() {
  const { t } = useTranslation()
  const locked = SAFE_PAYS.reduce((sum, item) => sum + item.amount, 0)
  return (
    <Frame>
      <p className="text-sm text-muted-foreground">{t('money.lockedFunds')}</p>
      <Money amount={locked} tone="locked" className="text-[28px] leading-9 font-semibold tracking-tight" />
      <ul className="mt-4 flex flex-col gap-3">
        {SAFE_PAYS.map((item) => (
          <li key={item.note} className="flex items-center gap-3">
            <CategoryTile icon={item.category.icon} color={item.category.color} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{item.note}</span>
              <span className={cn('block text-[13px]', item.due === 'overdue' ? 'text-expense' : 'text-muted-foreground')}>
                {t(`landing.sample.${item.due}`)}
              </span>
            </span>
            <Money amount={item.amount} tone="locked" className="text-[15px] font-medium" />
            <span className="rounded-lg border px-3 py-1.5 text-sm">{t('safePay.settle')}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const BUDGETS = [
  { name: 'food', icon: 'utensils', color: 'orange', limit: 1_500_000, spent: 1_240_000, pending: 0 },
  { name: 'bills', icon: 'receipt', color: 'blue', limit: 1_200_000, spent: 380_000, pending: 750_000 },
  { name: 'transport', icon: 'bus', color: 'sky', limit: 600_000, spent: 310_000, pending: 0 },
] as const

export function BudgetFragment() {
  const { t } = useTranslation()
  return (
    <Frame>
      <ul className="flex flex-col gap-5">
        {BUDGETS.map((row) => {
          const status = budgetStatus(row.spent, row.limit)
          return (
            <li key={row.name}>
              <div className="flex items-center gap-3">
                <CategoryTile icon={row.icon} color={row.color} className="size-8" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{t(`landing.sample.${row.name}`)}</span>
                <BudgetStatusPill status={status} />
              </div>
              <PlanBar limit={row.limit} spent={row.spent} pending={row.pending} status={status} className="mt-2.5" />
              <div className="mt-1.5 flex justify-between text-[13px] text-muted-foreground">
                <span>
                  {t('budgets.spent')} <Money amount={row.spent} className="text-foreground" />
                </span>
                <span>
                  {t('budgets.limit')} <Money amount={row.limit} className="text-foreground" />
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-locked">
        <PendingSwatch />
        {t('budgets.pendingSafePay')} <Money amount={BUDGETS.reduce((sum, row) => sum + row.pending, 0)} />
      </p>
    </Frame>
  )
}

const OCCURRENCES = [
  { name: 'Netflix', icon: 'clapperboard', color: 'rose', amount: 186_000, type: 'expense' as const, due: '2026-10-20' },
  { name: 'Gaji', icon: 'wallet', color: 'green', amount: 5_000_000, type: 'income' as const, due: '2026-10-25' },
]

export function RecurringFragment() {
  const { t } = useTranslation()
  return (
    <Frame>
      <p className="text-[15px] font-semibold">{t('recurring.waitingHeading', { count: OCCURRENCES.length })}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {OCCURRENCES.map((item) => (
          <li key={item.name} className="flex items-center gap-3">
            <CategoryTile icon={item.icon} color={item.color} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{item.name}</span>
              <span className="block text-[13px] text-muted-foreground">{t('recurring.dueOn', { date: formatDate(item.due, currentLanguage()) })}</span>
            </span>
            <Money amount={item.amount} tone={item.type} signed className="text-[15px] font-medium" />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2 text-sm">
        <span className="rounded-lg px-3 py-1.5 text-muted-foreground">{t('recurring.skip')}</span>
        <span className="rounded-lg border px-3 py-1.5">{t('recurring.confirm')}</span>
      </div>
    </Frame>
  )
}

const WEEK = [
  { day: 25, income: 5_000_000, expense: 725_500 },
  { day: 26, income: 0, expense: 64_000 },
  { day: 27, income: 0, expense: 182_000 },
  { day: 28, income: 0, expense: 0 },
  { day: 29, income: 750_000, expense: 45_000 },
  { day: 30, income: 0, expense: 310_000 },
  { day: 31, income: 0, expense: 28_000 },
]

export function CalendarFragment() {
  const { t } = useTranslation()
  return (
    <Frame className="p-0">
      <p className="px-5 pt-5 text-[15px] font-semibold">{formatCycleRange({ start: '2026-10-25', end: '2026-11-24' }, currentLanguage())}</p>
      <ol className="mt-3 grid grid-cols-7 border-t">
        {WEEK.map((cell, index) => (
          <li key={cell.day} className={cn('min-h-24 p-1.5 text-xs', index < WEEK.length - 1 && 'border-r')}>
            <span className={cn('num inline-flex size-6 items-center justify-center rounded-full', index === 0 && 'bg-primary text-primary-foreground')}>
              {cell.day}
            </span>
            {cell.income > 0 && <span className="num mt-1 block truncate text-income">+{formatCompact(cell.income, currentLanguage())}</span>}
            {cell.expense > 0 && <span className="num block truncate text-expense">−{formatCompact(cell.expense, currentLanguage())}</span>}
          </li>
        ))}
      </ol>
      <p className="border-t px-5 py-3 text-[13px] text-muted-foreground">{t('landing.sample.calendarNote')}</p>
    </Frame>
  )
}

const SPENDING = [
  { name: 'food', color: '#e0731f', amount: 1_240_000 },
  { name: 'bills', color: '#2f6fdb', amount: 980_000 },
  { name: 'transport', color: '#1694c9', amount: 310_000 },
  { name: 'others', color: '#9aa0a6', amount: 270_000 },
] as const

export function ReportsFragment() {
  const { t } = useTranslation()
  const total = SPENDING.reduce((sum, row) => sum + row.amount, 0)
  return (
    <Frame>
      <p className="text-sm text-muted-foreground">{t('reports.byCategory')}</p>
      <Money amount={total} className="text-[28px] leading-9 font-semibold tracking-tight" />
      <div className="mt-4 flex h-3 overflow-hidden rounded-full">
        {SPENDING.map((row) => (
          <span key={row.name} className="h-full border-r-2 border-card last:border-r-0" style={{ width: `${(row.amount / total) * 100}%`, background: row.color }} />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {SPENDING.map((row) => (
          <li key={row.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: row.color }} />
            <span className="flex-1">{t(`landing.sample.${row.name}`)}</span>
            <Money amount={row.amount} />
            <span className="num w-10 text-right text-muted-foreground">{Math.round((row.amount / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const BULK_ROWS = [
  { type: 'expense', date: '24/10', amount: 35_000, what: 'food', account: 'GoPay' },
  { type: 'income', date: '24/10', amount: 1_500_000, what: 'freelance', account: 'BCA' },
  { type: 'transfer', date: '24/10', amount: 100_000, what: 'Dompet', account: 'BCA' },
] as const

export function BulkFragment() {
  const { t } = useTranslation()
  return (
    <Frame className="overflow-x-auto p-0">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-normal">{t('transactions.type')}</th>
            <th className="px-2 py-2.5 font-normal">{t('transactions.date')}</th>
            <th className="px-2 py-2.5 text-right font-normal">{t('transactions.amount')}</th>
            <th className="px-4 py-2.5 font-normal">{t('bulk.categoryOrDestination')}</th>
          </tr>
        </thead>
        <tbody>
          {BULK_ROWS.map((row) => (
            <tr key={row.type} className="border-t">
              <td className="px-4 py-2.5">{t(`transactionTypes.${row.type}`)}</td>
              <td className="num px-2 py-2.5 text-muted-foreground">{row.date}</td>
              <td className="num px-2 py-2.5 text-right">{formatIDR(row.amount)}</td>
              <td className="px-4 py-2.5">{row.what === 'Dompet' ? row.what : t(`landing.sample.${row.what}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-3 text-[13px] text-muted-foreground">{t('bulk.pasteHint')}</p>
    </Frame>
  )
}

export function CalculatorFragment() {
  const { t } = useTranslation()
  return (
    <Frame>
      <p className="text-sm font-medium">{t('transactions.amount')}</p>
      <div className="mt-2 flex h-12 items-center justify-between rounded-lg border border-ring px-3 text-lg ring-3 ring-ring/30">
        <span className="num">
          <span className="mr-2 text-sm text-muted-foreground">Rp</span>25.000+12.500
        </span>
        <span className="num text-sm text-muted-foreground">= {formatIDR(37_500)}</span>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">{t('transactions.amountHint')}</p>
    </Frame>
  )
}
