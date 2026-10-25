import { Lock, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccountBalances, useActiveAccounts } from '@/features/accounts/queries'
import { CycleSummary } from '@/features/budgets/cycle-summary'
import { useBudgetProgress } from '@/features/budgets/queries'
import { BudgetStatusPill } from '@/features/budgets/status-pill'
import { CategoryTile } from '@/features/categories/category-tile'
import { useCurrentCycle, useCycleTransactions } from '@/features/cycle/use-cycle'
import { PendingOccurrenceList } from '@/features/recurring/pending-list'
import { usePendingOccurrences } from '@/features/recurring/queries'
import { useLookups } from '@/features/transactions/lookups'
import { TransactionRow } from '@/features/transactions/transaction-row'
import { currentLanguage } from '@/i18n'
import { daysUntilNextCycle } from '@/lib/cycle'
import type { Transaction } from '@/lib/database'
import { diffInDays, zonedParts } from '@/lib/dates'
import { formatCycleRange } from '@/lib/format'
import { AmountToggle } from '@/components/amount-toggle'

const TODAY_ROWS = 5
const SIDE_ROWS = 4

function totalsOf(rows: Transaction[]) {
  return rows.reduce(
    (sum, row) => (row.type === 'transfer' ? sum : { ...sum, [row.type]: sum[row.type] + row.amount }),
    { income: 0, expense: 0 },
  )
}

function Figure({ label, amount, tone, size = 'md' }: { label: string; amount: number; tone?: 'income' | 'expense'; size?: 'md' | 'lg' }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <Money
        amount={amount}
        tone={amount === 0 ? 'muted' : tone}
        className={size === 'lg' ? 'mt-1 block text-2xl font-semibold' : 'mt-1 block text-xl font-semibold'}
      />
    </div>
  )
}

function CardHeader({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 pt-4 sm:px-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <Link to={to} className="text-sm text-muted-foreground hover:text-foreground">
        {linkLabel}
      </Link>
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { today, cycle, timezone, startDay } = useCurrentCycle()
  const lookups = useLookups()
  const accounts = useActiveAccounts()
  const { data: balances } = useAccountBalances()
  const cycleTransactions = useCycleTransactions(cycle, timezone)
  const budgets = useBudgetProgress(cycle, timezone)
  const pending = usePendingOccurrences(today)

  const balance = (accounts.data ?? []).reduce(
    (sum, account) => {
      const row = balances?.get(account.id)
      return {
        total: sum.total + (row?.balance ?? account.initial_balance),
        locked: sum.locked + (row?.locked_funds ?? 0),
      }
    },
    { total: 0, locked: 0 },
  )

  const cycleRows = cycleTransactions.data ?? []
  const todayRows = cycleRows.filter((row) => zonedParts(row.occurred_at, timezone).date === today).reverse()
  const todayTotals = totalsOf(todayRows)
  const cycleTotals = totalsOf(cycleRows)
  const daysLeft = daysUntilNextCycle(today, startDay)
  const cycleLength = diffInDays(cycle.end, cycle.start) + 1
  const dayNumber = diffInDays(today, cycle.start) + 1
  const atRisk = (budgets.data ?? []).filter((row) => row.status !== 'safe')
  const waiting = pending.data ?? []

  return (
    <>
      <PageHeader
        title={t('nav.dashboard')}
        description={t('dashboard.subtitle', { range: formatCycleRange(cycle, language), count: daysLeft })}
        actions={
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/transactions?new=1">
              <Plus />
              {t('nav.addTransaction')}
            </Link>
          </Button>
        }
      />

      <section
        className="mt-6 grid overflow-hidden rounded-(--radius-card) border bg-card sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]"
        aria-label={t('money.totalBalance')}
      >
        <div className="p-5">
          <div className="-my-1.5 flex items-center gap-1">
            <p className="text-sm text-muted-foreground">{t('money.totalBalance')}</p>
            <AmountToggle privacyKey="summary" name={t('money.totalBalance')} />
          </div>
          {accounts.isPending ? (
            <Skeleton className="mt-2 h-10 w-52" />
          ) : (
            <Money amount={balance.total} privacyKey="summary" className="mt-1 block text-[34px] leading-10 font-semibold tracking-tight" />
          )}
          <p className="mt-1 text-[13px] text-muted-foreground">{t('dashboard.accountsCount', { count: accounts.data?.length ?? 0 })}</p>
        </div>
        <div className="grid grid-cols-2 border-t sm:col-span-2 sm:border-t-0 sm:border-l">
          <div className="border-r p-5">
            <p className="text-sm text-muted-foreground">{t('money.availableBalance')}</p>
            <Money amount={balance.total - balance.locked} privacyKey="summary" className="mt-1 block text-xl font-semibold" />
          </div>
          <Link to="/safe-pay" className="p-5 transition-colors hover:bg-muted/50">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="size-3.5" />
              {t('money.lockedFunds')}
            </p>
            <Money amount={balance.locked} privacyKey="summary" tone={balance.locked ? 'locked' : 'muted'} className="mt-1 block text-xl font-semibold" />
          </Link>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="overflow-hidden rounded-(--radius-card) border bg-card" aria-labelledby="today">
          <div className="flex items-baseline justify-between gap-3 px-4 pt-4 sm:px-5">
            <h2 id="today" className="text-base font-semibold">
              {t('dashboard.today')}
            </h2>
            <Link to="/transactions" className="text-sm text-muted-foreground hover:text-foreground">
              {todayRows.length > TODAY_ROWS ? t('dashboard.viewAllCount', { count: todayRows.length }) : t('dashboard.openTransactions')}
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 px-4 sm:px-5">
            <Figure label={t('transactionTypes.income')} amount={todayTotals.income} tone="income" />
            <Figure label={t('transactionTypes.expense')} amount={todayTotals.expense} tone="expense" />
          </div>
          {cycleTransactions.isPending ? (
            <div className="flex flex-col gap-2 p-5">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : todayRows.length === 0 ? (
            <div className="m-4 flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-4 sm:m-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{t('dashboard.nothingToday')}</p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/transactions?new=1">
                  <Plus />
                  {t('nav.addTransaction')}
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-2 pb-2">
              {todayRows.slice(0, TODAY_ROWS).map((row) => (
                <TransactionRow key={row.id} transaction={row} lookups={lookups} timezone={timezone} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-(--radius-card) border bg-card p-4 sm:p-5" aria-labelledby="this-cycle">
          <h2 id="this-cycle" className="text-base font-semibold">
            {t('dashboard.thisCycle')}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Figure label={t('transactionTypes.income')} amount={cycleTotals.income} tone="income" size="lg" />
            <Figure label={t('transactionTypes.expense')} amount={cycleTotals.expense} tone="expense" size="lg" />
          </div>
          <div className="mt-5 border-t pt-4">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t('dashboard.dayOfCycle', { day: dayNumber, total: cycleLength })}</span>
              <span className="font-medium">{t('cycle.nextIn', { count: daysLeft })}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(dayNumber / cycleLength) * 100}%` }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t('dashboard.netThisCycle')}{' '}
              <Money amount={cycleTotals.income - cycleTotals.expense} className="font-medium text-foreground" />
            </p>
          </div>
        </section>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-(--radius-card) border bg-card" aria-labelledby="budget-overview">
          <CardHeader title={t('nav.budgets')} to="/budgets" linkLabel={t('dashboard.manageBudgets')} />
          <h2 id="budget-overview" className="sr-only">
            {t('nav.budgets')}
          </h2>
          {budgets.isPending ? (
            <div className="p-5">
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : (budgets.data ?? []).length === 0 ? (
            <p className="m-4 rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground sm:m-5">{t('dashboard.noBudgets')}</p>
          ) : (
            <>
              <div className="px-4 pt-3 sm:px-5">
                <CycleSummary rows={budgets.data!} compact />
              </div>
              {atRisk.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">{t('dashboard.allBudgetsSafe')}</p>
              ) : (
                <ul className="mt-3 border-t pb-2">
                  {atRisk.slice(0, SIDE_ROWS).map((row) => {
                    const left = row.budget.amount - row.spent
                    return (
                      <li key={row.budget.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                        <CategoryTile icon={row.category?.icon ?? 'tag'} color={row.category?.color ?? 'slate'} className="size-8" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.category?.name}</span>
                        <BudgetStatusPill status={row.status} />
                        <span className="w-28 text-right text-sm">
                          {left < 0 ? (
                            <Money amount={-left} tone="expense" signed />
                          ) : (
                            <>
                              <span className="text-muted-foreground">{t('budgets.leftShort')} </span>
                              <Money amount={left} />
                            </>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-(--radius-card) border bg-card" aria-labelledby="recurring-overview">
          <CardHeader
            title={t('recurring.waitingHeading', { count: waiting.length })}
            to="/recurring"
            linkLabel={waiting.length > SIDE_ROWS ? t('dashboard.viewAllCount', { count: waiting.length }) : t('dashboard.openRecurring')}
          />
          <h2 id="recurring-overview" className="sr-only">
            {t('nav.recurring')}
          </h2>
          {pending.isPending ? (
            <div className="p-5">
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : waiting.length === 0 ? (
            <p className="m-4 rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground sm:m-5">{t('recurring.nothingWaiting')}</p>
          ) : (
            <div className="mt-2 pb-2">
              <PendingOccurrenceList occurrences={waiting.slice(0, SIDE_ROWS)} />
            </div>
          )}
        </section>
      </div>
    </>
  )
}
