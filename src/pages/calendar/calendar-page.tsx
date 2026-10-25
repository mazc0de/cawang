import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { CycleNavigator } from '@/features/cycle/cycle-navigator'
import { useCurrentCycle, useCycleTransactions } from '@/features/cycle/use-cycle'
import { currentLanguage } from '@/i18n'
import { shiftCycle } from '@/lib/cycle'
import { addDays, diffInDays, type IsoDate, isoDateToLocalDate, parseIsoDate, zonedParts } from '@/lib/dates'
import { dateLocale, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMaskedFormat } from '@/providers/amount-visibility'

interface DayTotals {
  income: number
  expense: number
}

/** Monday = 0 … Sunday = 6. */
function weekdayIndex(date: IsoDate): number {
  return (isoDateToLocalDate(date).getDay() + 6) % 7
}

export function CalendarPage() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const current = useCurrentCycle()
  const [offset, setOffset] = useState(0)
  const cycle = shiftCycle(current.cycle, current.startDay, offset)
  const transactions = useCycleTransactions(cycle, current.timezone)
  const masked = useMaskedFormat()

  const totals = useMemo(() => {
    const byDay = new Map<IsoDate, DayTotals>()
    for (const row of transactions.data ?? []) {
      if (row.type === 'transfer') continue
      const date = zonedParts(row.occurred_at, current.timezone).date
      const day = byDay.get(date) ?? { income: 0, expense: 0 }
      day[row.type] += row.amount
      byDay.set(date, day)
    }
    return byDay
  }, [transactions.data, current.timezone])

  const days = Array.from({ length: diffInDays(cycle.end, cycle.start) + 1 }, (_, index) => addDays(cycle.start, index))
  const leading = weekdayIndex(cycle.start)
  const cycleIncome = [...totals.values()].reduce((sum, day) => sum + day.income, 0)
  const cycleExpense = [...totals.values()].reduce((sum, day) => sum + day.expense, 0)
  const net = cycleIncome - cycleExpense
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    format(isoDateToLocalDate(addDays('2026-10-26', index)), 'EEE', { locale: dateLocale(language) }),
  )

  return (
    <>
      <PageHeader title={t('nav.calendar')} />
      <div className="mt-4">
        <CycleNavigator cycle={cycle} offset={offset} onOffsetChange={setOffset} />
      </div>

      <section className="mt-4 grid overflow-hidden rounded-(--radius-card) border bg-card sm:grid-cols-3" aria-label={t('calendar.cycleTotals')}>
        {[
          { label: t('transactionTypes.income'), amount: cycleIncome, tone: cycleIncome ? ('income' as const) : ('muted' as const) },
          { label: t('transactionTypes.expense'), amount: cycleExpense, tone: cycleExpense ? ('expense' as const) : ('muted' as const) },
          { label: t('calendar.net'), amount: net, tone: 'default' as const },
        ].map((item, index) => (
          <div
            key={item.label}
            className={cn(
              'flex items-baseline justify-between gap-3 px-4 py-3 sm:block sm:p-5',
              index > 0 && 'border-t sm:border-t-0 sm:border-l',
            )}
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <Money amount={item.amount} tone={item.tone} className="text-lg font-semibold sm:mt-1 sm:block sm:text-2xl" />
          </div>
        ))}
      </section>

      <section className="mt-4 overflow-hidden rounded-(--radius-card) border bg-card" aria-label={t('nav.calendar')}>
        <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
          {weekdays.map((name) => (
            <div key={name} className="py-2.5">
              {name}
            </div>
          ))}
        </div>
        <ol className="grid grid-cols-7">
          {Array.from({ length: leading }, (_, index) => (
            <li key={`blank-${index}`} aria-hidden="true" className="min-h-20 border-r border-b bg-muted/40 sm:min-h-24" />
          ))}
          {days.map((date, index) => {
            const { day } = parseIsoDate(date)
            const totalsForDay = totals.get(date)
            const isFuture = date > current.today
            const isToday = date === current.today
            const firstOfMonth = day === 1 || date === cycle.start
            const label = firstOfMonth
              ? format(isoDateToLocalDate(date), language === 'id' ? 'd MMM' : 'MMM d', { locale: dateLocale(language) })
              : String(day)
            const content = (
              <>
                <span
                  className={cn(
                    'num inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px]',
                    isToday && 'bg-primary font-semibold text-primary-foreground',
                    isFuture && 'text-muted-foreground',
                  )}
                >
                  <span className="sm:hidden">{day}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
                {transactions.isPending ? (
                  <Skeleton className="mt-2 h-3 w-12" />
                ) : (
                  totalsForDay && (
                    <span className="num mt-1 flex w-full min-w-0 flex-col gap-0.5 text-[11px] leading-tight sm:text-xs">
                      {totalsForDay.income > 0 && (
                        <span className="truncate text-income">
                          +<span className="sm:hidden">{masked.formatCompact(totalsForDay.income, language)}</span>
                          <Money amount={totalsForDay.income} className="hidden sm:inline" />
                        </span>
                      )}
                      {totalsForDay.expense > 0 && (
                        <span className="truncate text-expense">
                          −<span className="sm:hidden">{masked.formatCompact(totalsForDay.expense, language)}</span>
                          <Money amount={totalsForDay.expense} className="hidden sm:inline" />
                        </span>
                      )}
                    </span>
                  )
                )}
              </>
            )
            const lastInRow = (leading + index) % 7 === 6
            const cell = cn('flex h-full min-h-20 flex-col items-start overflow-hidden border-b p-1 sm:min-h-24 sm:p-2', !lastInRow && 'border-r')
            return (
              <li key={date}>
                {isFuture ? (
                  <div className={cn(cell, 'bg-muted/20')} aria-label={formatDate(date, language)}>
                    {content}
                  </div>
                ) : (
                  <Link
                    to={`/transactions?date=${date}`}
                    aria-label={formatDate(date, language)}
                    className={cn(cell, 'transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted')}
                  >
                    {content}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </section>
      <p className="mt-3 text-xs text-muted-foreground">{t('transactions.transfersExcluded')}</p>
    </>
  )
}
