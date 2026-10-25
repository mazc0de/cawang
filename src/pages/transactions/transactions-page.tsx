import { format } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, Table2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { CalendarPopover } from '@/components/date-picker'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { AvailableBalanceList } from '@/features/accounts/available-list'
import { useAccounts } from '@/features/accounts/queries'
import { useCategories } from '@/features/categories/queries'
import { useCurrentProfile } from '@/features/profile/queries'
import { BulkEntryDialog } from '@/features/transactions/bulk-entry-dialog'
import { useLookups } from '@/features/transactions/lookups'
import { TransactionRow } from '@/features/transactions/transaction-row'
import { fetchTransaction, useDayTransactions, useTransactionSearch } from '@/features/transactions/queries'
import { TransactionDialog } from '@/features/transactions/transaction-dialog'
import { currentLanguage } from '@/i18n'
import type { Transaction, TransactionType } from '@/lib/database'
import { addDays, type IsoDate, isoDateToLocalDate, todayIn, zonedParts } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { dateLocale, formatDate } from '@/lib/format'

type Filter = 'all' | TransactionType

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function sumBy(rows: Transaction[], type: TransactionType) {
  return rows.reduce((sum, row) => (row.type === type ? sum + row.amount : sum), 0)
}

function RowSkeletons() {
  return (
    <ul aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <li key={index} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Skeleton className="size-10 rounded-[10px]" />
          <span className="flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-1.5 h-3 w-24" />
          </span>
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  )
}

export function TransactionsPage() {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const language = currentLanguage()
  const today = todayIn(profile.timezone)
  const [params, setParams] = useSearchParams()
  const requested = params.get('date')
  const date = requested && ISO_DATE.test(requested) && requested <= today ? requested : today

  const [filter, setFilter] = useState<Filter>('all')
  const [searchText, setSearchText] = useState('')
  const [searchAllDates, setSearchAllDates] = useState(false)
  const [editing, setEditing] = useState<{ open: boolean; transaction: Transaction | null }>({ open: false, transaction: null })
  const [bulkOpen, setBulkOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: accountList = [] } = useAccounts()
  const { data: categoryList = [] } = useCategories()
  const lookups = useLookups()

  const day = useDayTransactions(date, profile.timezone)
  const query = searchText.trim()
  const search = useTransactionSearch(
    query
      ? {
          text: query,
          accountIds: accountList.filter((a) => a.name.toLowerCase().includes(query.toLowerCase())).map((a) => a.id),
          categoryIds: categoryList.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).map((c) => c.id),
          day: searchAllDates ? null : { date, timezone: profile.timezone },
        }
      : null,
  )

  // The bottom bar's "+" lands here with ?new=1; closing the form drops the flag.
  const newFromNav = params.get('new') === '1'
  const closeForm = () => {
    setEditing({ open: false, transaction: null })
    if (newFromNav)
      setParams(
        (current) => {
          current.delete('new')
          return current
        },
        { replace: true },
      )
  }

  const goTo = (next: IsoDate) =>
    setParams((current) => {
      if (next === today) current.delete('date')
      else current.set('date', next)
      return current
    })

  const openTransaction = async (transaction: Transaction) => {
    // An Admin Fee is edited through the Transfer it belongs to.
    if (transaction.parent_transaction_id) {
      try {
        setEditing({ open: true, transaction: await fetchTransaction(transaction.parent_transaction_id) })
      } catch (error) {
        toast.error(errorMessage(error, t))
      }
      return
    }
    setEditing({ open: true, transaction })
  }

  const source = query ? search : day
  const rows = source.data ?? []
  const visible = filter === 'all' ? rows : rows.filter((row) => row.type === filter)
  const dayRows = day.data ?? []
  const income = sumBy(dayRows, 'income')
  const expense = sumBy(dayRows, 'expense')

  const dayLabel = format(isoDateToLocalDate(date), language === 'id' ? 'EEEE, d MMMM yyyy' : 'EEEE, MMMM d, yyyy', {
    locale: dateLocale(language),
  })

  const groups = useMemo(() => {
    if (!query || !searchAllDates) return null
    const byDate = new Map<IsoDate, Transaction[]>()
    for (const row of visible) {
      const local = zonedParts(row.occurred_at, profile.timezone).date
      byDate.set(local, [...(byDate.get(local) ?? []), row])
    }
    return [...byDate.entries()]
  }, [query, searchAllDates, visible, profile.timezone])

  const count = (type: TransactionType) => rows.filter((row) => row.type === type).length

  return (
    <>
      <PageHeader
        title={t('nav.transactions')}
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)} aria-label={t('bulk.title')}>
              <Table2 />
              <span className="hidden sm:inline">{t('bulk.title')}</span>
            </Button>
            <Button onClick={() => setEditing({ open: true, transaction: null })} className="hidden sm:inline-flex">
              <Plus />
              {t('nav.addTransaction')}
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={t('transactions.previousDay')} onClick={() => goTo(addDays(date, -1))}>
            <ChevronLeft />
          </Button>
          <CalendarPopover value={date} onChange={goTo} max={today} open={pickerOpen} onOpenChange={setPickerOpen}>
            <Button variant="ghost" className="min-w-0 px-2 text-base font-semibold" aria-label={t('transactions.pickDate')}>
              <CalendarDays className="text-muted-foreground" />
              <span className="truncate">{dayLabel}</span>
            </Button>
          </CalendarPopover>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('transactions.nextDay')}
            disabled={date >= today}
            onClick={() => goTo(addDays(date, 1))}
          >
            <ChevronRight />
          </Button>
          {date !== today && (
            <Button variant="outline" size="sm" className="ml-1" onClick={() => goTo(today)}>
              {t('transactions.today')}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={t('transactions.searchPlaceholder')}
              aria-label={t('transactions.search')}
              className="pl-9"
            />
          </div>
          {query && (
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <Switch checked={searchAllDates} onCheckedChange={setSearchAllDates} />
              {t('transactions.searchAllDates')}
            </label>
          )}
        </div>
      </div>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-(--radius-card) border bg-card lg:order-1" aria-label={t('nav.transactions')}>
          <div className="flex flex-col gap-3 px-4 pt-4 pb-2 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="text-base font-semibold">
              {query
                ? t('transactions.resultsCount', { count: visible.length })
                : t('transactions.dayCount', { count: visible.length })}
            </h2>
            <SegmentedControl<Filter>
              label={t('transactions.filter')}
              value={filter}
              onChange={setFilter}
              className="w-full flex-nowrap overflow-x-auto sm:w-auto"
              options={[
                { value: 'all', label: t('transactions.filterAll') },
                { value: 'income', label: `${t('transactionTypes.income')} ${count('income')}` },
                { value: 'expense', label: `${t('transactionTypes.expense')} ${count('expense')}` },
                { value: 'transfer', label: `${t('transactionTypes.transfer')} ${count('transfer')}` },
              ]}
            />
          </div>

          {source.isPending && (!query || search.fetchStatus !== 'idle') ? (
            <RowSkeletons />
          ) : source.isError ? (
            <div className="flex items-center justify-between gap-3 px-5 py-6 text-sm">
              <span>{t('errors.loadFailed')}</span>
              <Button variant="ghost" size="sm" onClick={() => source.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="mx-4 mb-4 flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-5 sm:mx-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {query ? t('transactions.noResults', { query }) : t('transactions.emptyDay')}
              </p>
              {!query && (
                <Button variant="outline" size="sm" onClick={() => setEditing({ open: true, transaction: null })}>
                  <Plus />
                  {t('nav.addTransaction')}
                </Button>
              )}
            </div>
          ) : groups ? (
            <div className="pb-2">
              {groups.map(([groupDate, items]) => (
                <div key={groupDate}>
                  <h3 className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground sm:px-5">
                    {formatDate(groupDate, language)}
                  </h3>
                  <ul>
                    {items.map((row) => (
                      <TransactionRow key={row.id} transaction={row} lookups={lookups} timezone={profile.timezone} onOpen={openTransaction} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="pb-2">
              {visible.map((row) => (
                <TransactionRow key={row.id} transaction={row} lookups={lookups} timezone={profile.timezone} onOpen={openTransaction} />
              ))}
            </ul>
          )}
        </section>

        <aside className="order-first flex flex-col gap-4 lg:order-2">
          <div className="grid grid-cols-2 overflow-hidden rounded-(--radius-card) border bg-card lg:grid-cols-1">
            <div className="border-r p-4 sm:p-5 lg:border-r-0 lg:border-b">
              <p className="text-sm text-muted-foreground">{t('transactions.dayIncome')}</p>
              <Money amount={income} tone={income ? 'income' : 'muted'} className="mt-1 block text-2xl font-semibold" />
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{t('transactions.dayExpense')}</p>
              <Money amount={expense} tone={expense ? 'expense' : 'muted'} className="mt-1 block text-2xl font-semibold" />
            </div>
            <p className="col-span-2 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5 lg:col-span-1">
              {t('transactions.transfersExcluded')}
            </p>
          </div>
          <AvailableBalanceList className="hidden lg:block" />
        </aside>
      </div>

      <TransactionDialog
        open={editing.open || newFromNav}
        onOpenChange={(open) => (open ? setEditing((current) => ({ ...current, open })) : closeForm())}
        transaction={newFromNav ? null : editing.transaction}
        defaultDate={date}
      />
      <BulkEntryDialog open={bulkOpen} onOpenChange={setBulkOpen} defaultDate={date} />
    </>
  )
}
