import { CircleSlash, MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentProfile } from '@/features/profile/queries'
import { useCancelSafePay, useSafePays, useSettlementTransactions } from '@/features/safe-pay/queries'
import { SafePayDialog } from '@/features/safe-pay/safe-pay-dialog'
import { SettleDialog } from '@/features/safe-pay/settle-dialog'
import { recordTitle, useLookups } from '@/features/transactions/lookups'
import { RecordTile } from '@/features/transactions/record-tile'
import { currentLanguage } from '@/i18n'
import type { SafePay, SafePayStatus } from '@/lib/database'
import { diffInDays, todayIn, zonedParts } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/** "Due today", "3 days overdue" or "Due 1 Nov 2026"; overdue is the only red fact on the row. */
export function DueLabel({ dueDate, today }: { dueDate: string; today: string }) {
  const { t } = useTranslation()
  const days = diffInDays(today, dueDate)
  if (days > 0) return <span className="font-medium text-expense">{t('safePay.overdue', { count: days })}</span>
  if (days === 0) return <span className="font-medium text-locked">{t('safePay.dueToday')}</span>
  return <span>{t('safePay.dueOn', { date: formatDate(dueDate, currentLanguage()) })}</span>
}

export function SafePayPage() {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  const language = currentLanguage()
  const lookups = useLookups()
  const safePays = useSafePays()
  const cancel = useCancelSafePay()
  const [tab, setTab] = useState<SafePayStatus>('pending')
  const [editing, setEditing] = useState<{ open: boolean; safePay: SafePay | null }>({ open: false, safePay: null })
  const [settling, setSettling] = useState<SafePay | null>(null)
  const [cancelling, setCancelling] = useState<SafePay | null>(null)

  const all = safePays.data ?? []
  const byStatus = (status: SafePayStatus) => all.filter((item) => item.status === status)
  const pending = byStatus('pending').sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const locked = pending.reduce((sum, item) => sum + item.amount, 0)
  const overdue = pending.filter((item) => item.due_date && item.due_date < today).length
  const settled = byStatus('settled')
  const settlements = useSettlementTransactions(settled.map((item) => item.transaction_id!).filter(Boolean))
  const rows = tab === 'pending' ? pending : byStatus(tab)

  const describe = (item: SafePay) => ({
    title: item.note || recordTitle({ type: 'expense', account_id: item.account_id, to_account_id: null, category_id: item.category_id }, lookups),
    account: lookups.accounts.get(item.account_id)?.name ?? '—',
    category: lookups.categories.get(item.category_id)?.name,
  })

  return (
    <>
      <PageHeader
        title={t('nav.safePay')}
        actions={
          <Button onClick={() => setEditing({ open: true, safePay: null })}>
            <Plus />
            <span className="hidden sm:inline">{t('safePay.addTitle')}</span>
          </Button>
        }
      />

      <section className="mt-6 grid overflow-hidden rounded-(--radius-card) border bg-card sm:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]" aria-label={t('money.lockedFunds')}>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">{t('money.lockedFunds')}</p>
          {safePays.isPending ? (
            <Skeleton className="mt-2 h-9 w-44" />
          ) : (
            <Money amount={locked} privacyKey="summary" tone={locked ? 'locked' : 'muted'} className="mt-1 block text-[32px] leading-10 font-semibold tracking-tight" />
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {t('safePay.pendingCount', { count: pending.length })}
            {overdue > 0 && <span className="text-expense"> · {t('safePay.overdueCount', { count: overdue })}</span>}
          </p>
        </div>
        <p className="border-t p-5 text-sm text-muted-foreground sm:border-t-0 sm:border-l">{t('safePay.explainer')}</p>
      </section>

      <section className="mt-6 overflow-hidden rounded-(--radius-card) border bg-card" aria-label={t('nav.safePay')}>
        <div className="px-4 pt-4 pb-2 sm:px-5">
          <SegmentedControl<SafePayStatus>
            label={t('safePay.status')}
            value={tab}
            onChange={setTab}
            className="w-full flex-nowrap overflow-x-auto sm:w-auto"
            options={[
              { value: 'pending', label: `${t('safePay.pending')} ${pending.length}` },
              { value: 'settled', label: `${t('safePay.settledTab')} ${settled.length}` },
              { value: 'cancelled', label: `${t('safePay.cancelledTab')} ${byStatus('cancelled').length}` },
            ]}
          />
        </div>

        {safePays.isPending ? (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : safePays.isError ? (
          <div className="flex items-center justify-between gap-3 px-5 py-6 text-sm">
            <span>{t('errors.loadFailed')}</span>
            <Button variant="ghost" size="sm" onClick={() => safePays.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="mx-4 mb-4 rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground sm:mx-5">
            {t(`safePay.empty_${tab}`)}
          </p>
        ) : (
          <ul className="pb-2">
            {rows.map((item) => {
              const { title, account, category } = describe(item)
              const isOverdue = item.status === 'pending' && item.due_date !== null && item.due_date < today
              const settlement = item.transaction_id ? settlements.data?.get(item.transaction_id) : undefined
              return (
                <li
                  key={item.id}
                  className={cn('flex items-center gap-3 px-4 py-3 sm:px-5', isOverdue && 'bg-expense-soft/60')}
                >
                  <RecordTile type="expense" categoryId={item.category_id} lookups={lookups} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{title}</p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {[item.note ? category : null, account].filter(Boolean).join(' · ')}
                      {' · '}
                      {item.status === 'pending' ? (
                        item.due_date ? (
                          <DueLabel dueDate={item.due_date} today={today} />
                        ) : (
                          t('safePay.noDueDate')
                        )
                      ) : item.status === 'settled' ? (
                        t('safePay.settledOn', {
                          date: formatDate(settlement ? zonedParts(settlement.occurred_at, profile.timezone).date : today, language),
                        })
                      ) : (
                        t('safePay.cancelledOn', {
                          date: formatDate(zonedParts(item.cancelled_at ?? item.created_at, profile.timezone).date, language),
                        })
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.status === 'settled' && settlement ? (
                      <>
                        <Money amount={settlement.amount} tone="expense" signed className="block text-[15px] font-medium" />
                        {settlement.amount !== item.amount && (
                          <span className="num text-xs text-muted-foreground">
                            {t('safePay.lockedWasShort')} <Money amount={item.amount} />
                          </span>
                        )}
                      </>
                    ) : (
                      <Money
                        amount={item.amount}
                        tone={item.status === 'pending' ? 'locked' : 'muted'}
                        className={cn('text-[15px] font-medium', item.status === 'cancelled' && 'line-through')}
                      />
                    )}
                  </div>
                  {item.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSettling(item)}>
                        {t('safePay.settle')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={t('common.actionsFor', { name: title })}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing({ open: true, safePay: item })}>
                            <Pencil />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setCancelling(item)}>
                            <CircleSlash />
                            {t('safePay.cancel')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <SafePayDialog
        open={editing.open}
        onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
        safePay={editing.safePay}
      />
      <SettleDialog safePay={settling} onOpenChange={(open) => !open && setSettling(null)} />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={t('safePay.cancelTitle')}
        description={t('safePay.cancelBody')}
        confirmLabel={t('safePay.cancel')}
        destructive
        onConfirm={async () => {
          if (!cancelling) return
          try {
            await cancel.mutateAsync(cancelling.id)
            toast.success(t('safePay.cancelled'))
          } catch (error) {
            toast.error(errorMessage(error, t))
            throw error
          }
        }}
      />
    </>
  )
}
