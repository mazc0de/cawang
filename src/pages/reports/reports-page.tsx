import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useBudgets } from '@/features/budgets/queries'
import { CycleNavigator } from '@/features/cycle/cycle-navigator'
import { useCurrentCycle, useRangeTransactions } from '@/features/cycle/use-cycle'
import { ExportDialog } from '@/features/export/export-dialog'
import { useLookups } from '@/features/transactions/lookups'
import { currentLanguage } from '@/i18n'
import { niceScale } from '@/lib/chart-scale'
import { type Cycle, shiftCycle } from '@/lib/cycle'
import { addDays, diffInDays, type IsoDate, isoDateToLocalDate, zonedParts } from '@/lib/dates'
import { dateLocale } from '@/lib/format'
import { categoryChartColor } from '@/lib/palette'
import { useMaskedFormat } from '@/providers/amount-visibility'

const HISTORY = 6
const DONUT_PARTS = 4
const OTHERS_COLOR = '#9aa0a6'

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col rounded-(--radius-card) border bg-card p-4 sm:p-5 ${className ?? ''}`} aria-label={title}>
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  )
}

export function ReportsPage() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const current = useCurrentCycle()
  const lookups = useLookups()
  const [offset, setOffset] = useState(0)
  const cycle = shiftCycle(current.cycle, current.startDay, offset)
  const history = useMemo(
    () => Array.from({ length: HISTORY }, (_, index) => shiftCycle(cycle, current.startDay, index - (HISTORY - 1))),
    [cycle, current.startDay],
  )
  const transactions = useRangeTransactions(history[0].start, cycle.end, current.timezone)
  const { data: budgets = [] } = useBudgets()
  const masked = useMaskedFormat()
  const budgetTotal = budgets.reduce((sum, budget) => sum + budget.amount, 0)

  const report = useMemo(() => {
    const rows = (transactions.data ?? []).map((row) => ({ ...row, date: zonedParts(row.occurred_at, current.timezone).date }))
    const inCycle = (date: IsoDate, range: Cycle) => date >= range.start && date <= range.end

    const perCycle = history.map((range) => {
      const own = rows.filter((row) => inCycle(row.date, range))
      return {
        label: format(isoDateToLocalDate(range.start), language === 'id' ? 'd MMM' : 'MMM d', { locale: dateLocale(language) }),
        income: own.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amount, 0),
        expense: own.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0),
      }
    })

    const expenses = rows.filter((row) => row.type === 'expense' && inCycle(row.date, cycle))
    const byCategory = new Map<string, number>()
    for (const row of expenses) byCategory.set(row.category_id ?? '', (byCategory.get(row.category_id ?? '') ?? 0) + row.amount)
    const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
    const totalExpense = expenses.reduce((sum, row) => sum + row.amount, 0)
    const parts = ranked.slice(0, DONUT_PARTS).map(([id, amount]) => {
      const category = lookups.categories.get(id)
      return { key: id, name: category?.name ?? '—', amount, fill: categoryChartColor(category?.color ?? 'slate') }
    })
    const rest = ranked.slice(DONUT_PARTS).reduce((sum, [, amount]) => sum + amount, 0)
    if (rest > 0) parts.push({ key: 'others', name: t('reports.others'), amount: rest, fill: OTHERS_COLOR })

    const lastDay = cycle.end < current.today ? cycle.end : current.today
    const days = diffInDays(cycle.end, cycle.start) + 1
    const dates = Array.from({ length: days }, (_, index) => addDays(cycle.start, index))
    const daily = dates.map((date) => expenses.filter((row) => row.date === date).reduce((sum, row) => sum + row.amount, 0))
    const running = daily.map((_, index) => daily.slice(0, index + 1).reduce((sum, amount) => sum + amount, 0))
    const cumulative = dates.map((date, index) => ({
      label: format(isoDateToLocalDate(date), language === 'id' ? 'd MMM' : 'MMM d', { locale: dateLocale(language) }),
      spent: date <= lastDay ? running[index] : null,
    }))
    const spentSoFar = running[dates.findLastIndex((date) => date <= lastDay)] ?? 0

    return { perCycle, parts, totalExpense, cumulative, spentSoFar }
  }, [transactions.data, history, cycle, current.timezone, current.today, lookups, language, t])

  const barConfig = {
    income: { label: t('transactionTypes.income'), color: 'var(--income)' },
    expense: { label: t('transactionTypes.expense'), color: 'var(--expense)' },
  } satisfies ChartConfig
  const lineConfig = { spent: { label: t('reports.spentSoFar'), color: 'var(--brand)' } } satisfies ChartConfig
  const donutConfig = Object.fromEntries(report.parts.map((part) => [part.key, { label: part.name, color: part.fill }])) satisfies ChartConfig
  const moneyTooltip = (value: unknown) => masked.formatIDR(Number(value))
  const axisTick = { fontSize: 12 }
  const loading = transactions.isPending
  const lineScale = niceScale(Math.max(report.spentSoFar, budgetTotal) * 1.05)
  const drawnPoints = report.cumulative.filter((point) => point.spent !== null).length
  const share = (amount: number) => {
    const percent = (amount / report.totalExpense) * 100
    return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`
  }

  return (
    <>
      <PageHeader title={t('nav.reports')} actions={<ExportDialog cycle={cycle} timezone={current.timezone} />} />
      <div className="mt-4">
        <CycleNavigator cycle={cycle} offset={offset} onOffsetChange={setOffset} />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <Card title={t('reports.byCategory')} subtitle={t('reports.byCategoryBody')}>
          {loading ? (
            <Skeleton className="mt-4 h-[220px] rounded-xl" />
          ) : report.parts.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">{t('reports.noExpense')}</p>
          ) : (
            <div className="mt-4 grid flex-1 content-center items-center gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="relative mx-auto size-[180px]">
                <ChartContainer config={donutConfig} className="aspect-square h-[180px] w-[180px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel formatter={(value, _name, item) => `${item.payload.name}: ${moneyTooltip(value)}`} />} />
                    <Pie data={report.parts} dataKey="amount" nameKey="key" innerRadius={70} outerRadius={84} paddingAngle={2} strokeWidth={0} isAnimationActive={false} />
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-muted-foreground">{t('transactionTypes.expense')}</span>
                  <Money amount={report.totalExpense} className="text-base font-semibold" />
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>{t('transactions.category')}</th>
                    <th>{t('transactions.amount')}</th>
                    <th>{t('reports.share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.parts.map((part) => (
                    <tr key={part.key} className="h-9">
                      <td className="pr-2">
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: part.fill }} />
                          <span className="truncate">{part.name}</span>
                        </span>
                      </td>
                      <td className="text-right">
                        <Money amount={part.amount} />
                      </td>
                      <td className="num w-14 text-right text-muted-foreground">
                        {share(part.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={t('reports.incomeVsExpense')} subtitle={t('reports.incomeVsExpenseBody', { count: HISTORY })}>
          <div className="mt-3 flex items-center gap-4 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-income" />
              {t('transactionTypes.income')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-expense" />
              {t('transactionTypes.expense')}
            </span>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-[220px] rounded-xl" />
          ) : (
            <ChartContainer config={barConfig} className="mt-3 aspect-auto min-h-[220px] w-full flex-1">
              <BarChart data={report.perCycle} margin={{ left: 0, right: 4, top: 8 }} barGap={2}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} tickFormatter={(value) => masked.formatCompact(value, language)} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => `${barConfig[name as 'income' | 'expense'].label}: ${moneyTooltip(value)}`} />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          )}
        </Card>
      </div>

      <Card
        className="mt-6"
        title={t('reports.cumulative')}
        subtitle={
          budgetTotal > 0
            ? t('reports.cumulativeBody', { spent: masked.formatIDR(report.spentSoFar), budget: masked.formatIDR(budgetTotal) })
            : t('reports.cumulativeNoBudget', { spent: masked.formatIDR(report.spentSoFar) })
        }
      >
        {loading ? (
          <Skeleton className="mt-4 h-[240px] rounded-xl" />
        ) : (
          <ChartContainer config={lineConfig} className="mt-4 aspect-auto h-[240px] w-full">
            <LineChart data={report.cumulative} margin={{ left: 0, right: 12, top: 16 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={24} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={axisTick}
                domain={[0, lineScale.max]}
                ticks={lineScale.ticks}
                tickFormatter={(value) => masked.formatCompact(value, language)}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${lineConfig.spent.label}: ${moneyTooltip(value)}`} />} />
              {budgetTotal > 0 && (
                <ReferenceLine
                  y={budgetTotal}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: t('reports.totalBudget'), position: 'insideTopRight', fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
              )}
              <Line
                dataKey="spent"
                stroke="var(--color-spent)"
                strokeWidth={2}
                // A single day so far has no line to draw; show its point instead.
                dot={drawnPoints === 1 ? { r: 4, fill: 'var(--color-spent)', strokeWidth: 0 } : false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </Card>
    </>
  )
}
