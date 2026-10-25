import { useTranslation } from 'react-i18next'
import { Money } from '@/components/money'
import { cn } from '@/lib/utils'
import { useAmountVisibility } from '@/providers/amount-visibility'
import { useAccountBalances, useActiveAccounts } from './queries'

/** Available Balance per active Account; a negative one is the only red figure. */
export function AvailableBalanceList({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { data: accounts = [] } = useActiveAccounts()
  const { data: balances } = useAccountBalances()
  const { isHidden } = useAmountVisibility()
  return (
    <section className={cn('rounded-(--radius-card) border bg-card p-4 sm:p-5', className)} aria-labelledby="available-by-account">
      <h2 id="available-by-account" className="text-sm font-semibold">
        {t('money.availableBalance')}
      </h2>
      <ul className="mt-2">
        {accounts.map((account) => {
          const available = balances?.get(account.id)?.available_balance ?? account.initial_balance
          const privacyKey = `account:${account.id}`
          return (
            <li key={account.id} className="flex h-9 items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{account.name}</span>
              <Money amount={available} privacyKey={privacyKey} tone={available < 0 && !isHidden(privacyKey) ? 'expense' : 'default'} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
