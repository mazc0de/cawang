import { Archive, ArchiveRestore, Lock, MoreHorizontal, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountForm } from '@/features/accounts/account-form'
import { ACCOUNT_TYPE_ICONS } from '@/features/accounts/account-types'
import {
  useAccountBalances,
  useAccounts,
  useDeleteAccount,
  useSetAccountArchived,
} from '@/features/accounts/queries'
import type { Account, AccountBalance } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { AmountToggle } from '@/components/amount-toggle'
import { useAmountVisibility } from '@/providers/amount-visibility'

type Pending = { kind: 'delete'; account: Account } | null

function AccountCard({
  account,
  balance,
  onEdit,
  onArchive,
  onDelete,
}: {
  account: Account
  balance: AccountBalance | undefined
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const { isHidden } = useAmountVisibility()
  const Icon = ACCOUNT_TYPE_ICONS[account.type]
  const current = balance?.balance ?? account.initial_balance
  const locked = balance?.locked_funds ?? 0
  const available = balance?.available_balance ?? current
  const privacyKey = `account:${account.id}`
  // A hidden balance must not give away that it is below zero.
  const isNegative = current < 0 && !isHidden(privacyKey)

  return (
    <article className="flex flex-col rounded-(--radius-card) border bg-card p-5">
      <header className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold">{account.name}</h3>
          <p className="text-[13px] text-muted-foreground">{t(`accountTypes.${account.type}`)}</p>
        </div>
        <AmountToggle privacyKey={privacyKey} name={account.name} className="-mt-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-2 text-muted-foreground" aria-label={t('common.actionsFor', { name: account.name })}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onArchive}>
              <Archive />
              {t('common.archive')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <p className="mt-6 text-[13px] text-muted-foreground">{t('money.accountBalance')}</p>
      <Money amount={current} privacyKey={privacyKey} tone={isNegative ? 'expense' : 'default'} className="text-2xl font-semibold tracking-tight" />
      {isNegative && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-expense">
          <TriangleAlert className="size-3.5" />
          {t('accounts.negativeWarning')}
        </p>
      )}

      <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-[13px]">
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">{t('money.availableBalance')}</dt>
          <dd>
            <Money amount={available} privacyKey={privacyKey} />
          </dd>
        </div>
        {locked > 0 && (
          <div className="flex items-center gap-1.5 text-locked">
            <dt className="flex items-center gap-1">
              <Lock className="size-3.5" />
              {t('money.lockedFunds')}
            </dt>
            <dd>
              <Money amount={locked} privacyKey={privacyKey} />
            </dd>
          </div>
        )}
      </dl>
    </article>
  )
}

export function AccountsPage() {
  const { t } = useTranslation()
  const accounts = useAccounts()
  const { data: balances } = useAccountBalances()
  const setArchived = useSetAccountArchived()
  const deleteAccount = useDeleteAccount()
  const [form, setForm] = useState<{ open: boolean; account?: Account }>({ open: false })
  const [pending, setPending] = useState<Pending>(null)

  const all = accounts.data ?? []
  const active = all.filter((account) => !account.archived_at)
  const archived = all.filter((account) => account.archived_at)
  const totals = active.reduce(
    (sum, account) => {
      const balance = balances?.get(account.id)
      return {
        total: sum.total + (balance?.balance ?? account.initial_balance),
        locked: sum.locked + (balance?.locked_funds ?? 0),
      }
    },
    { total: 0, locked: 0 },
  )

  const archive = (account: Account, value: boolean) =>
    setArchived.mutate(
      { id: account.id, archived: value },
      {
        onSuccess: () => toast.success(value ? t('accounts.archived', { name: account.name }) : t('accounts.restored', { name: account.name })),
        onError: (error) => toast.error(errorMessage(error, t)),
      },
    )

  return (
    <>
      <PageHeader
        title={t('nav.accounts')}
        actions={
          <Button onClick={() => setForm({ open: true })}>
            <Plus />
            <span className="hidden sm:inline">{t('onboarding.addAccount')}</span>
          </Button>
        }
      />

      <section className="mt-6 grid overflow-hidden rounded-(--radius-card) border bg-card sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]" aria-label={t('money.totalBalance')}>
        <div className="p-5">
          <div className="-my-1.5 flex items-center gap-1">
            <p className="text-sm text-muted-foreground">{t('money.totalBalance')}</p>
            <AmountToggle privacyKey="summary" name={t('money.totalBalance')} />
          </div>
          {accounts.isPending ? (
            <Skeleton className="mt-2 h-9 w-48" />
          ) : (
            <Money amount={totals.total} privacyKey="summary" className="mt-1 block text-[32px] leading-10 font-semibold tracking-tight" />
          )}
        </div>
        <div className="grid grid-cols-2 border-t sm:col-span-2 sm:grid-cols-2 sm:border-t-0 sm:border-l">
          <div className="border-r p-5">
            <p className="text-sm text-muted-foreground">{t('money.availableBalance')}</p>
            <Money amount={totals.total - totals.locked} privacyKey="summary" className="mt-1 block text-xl font-semibold" />
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground">{t('money.lockedFunds')}</p>
            <Money amount={totals.locked} privacyKey="summary" tone={totals.locked ? 'locked' : 'muted'} className="mt-1 block text-xl font-semibold" />
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="active-accounts">
        <h2 id="active-accounts" className="text-base font-semibold">
          {t('accounts.activeHeading', { count: active.length })}
        </h2>
        {accounts.isPending ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[188px] rounded-(--radius-card)" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">{t('accounts.empty')}</p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                balance={balances?.get(account.id)}
                onEdit={() => setForm({ open: true, account })}
                onArchive={() => archive(account, true)}
                onDelete={() => setPending({ kind: 'delete', account })}
              />
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section className="mt-10" aria-labelledby="archived-accounts">
          <h2 id="archived-accounts" className="text-base font-semibold">
            {t('accounts.archivedHeading', { count: archived.length })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('accounts.archivedBody')}</p>
          <ul className="mt-3 overflow-hidden rounded-(--radius-card) border bg-card">
            {archived.map((account) => {
              const Icon = ACCOUNT_TYPE_ICONS[account.type]
              return (
                <li key={account.id} className="flex items-center gap-3 border-b px-5 py-3 last:border-b-0">
                  <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-muted-foreground">{account.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => archive(account, false)}>
                    <ArchiveRestore />
                    {t('common.unarchive')}
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Dialog open={form.open} onOpenChange={(open) => setForm((current) => ({ ...current, open }))}>
        <DialogContent className="sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">{form.account ? t('accounts.editTitle') : t('onboarding.addAccount')}</DialogTitle>
            <DialogDescription className="sr-only">{t('onboarding.accountsBody')}</DialogDescription>
          </DialogHeader>
          {form.open && (
            <AccountForm
              key={form.account?.id ?? 'new'}
              account={form.account}
              onSaved={() => {
                if (form.account) setForm({ open: false })
                else toast.success(t('common.saved'))
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pending?.kind === 'delete'}
        onOpenChange={(open) => !open && setPending(null)}
        title={t('accounts.deleteTitle', { name: pending?.account.name ?? '' })}
        description={t('accounts.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (!pending) return
          try {
            await deleteAccount.mutateAsync(pending.account.id)
            toast.success(t('accounts.deleted', { name: pending.account.name }))
          } catch (error) {
            toast.error(errorMessage(error, t))
            throw error
          }
        }}
      />
    </>
  )
}
