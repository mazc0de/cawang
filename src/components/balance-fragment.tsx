import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/components/money'
import { ACCOUNT_TYPE_ICONS } from '@/features/accounts/account-types'
import type { AccountType } from '@/lib/database'

// Sample data for the public pages. Totals are computed from the rows so they always agree.
const SAMPLE_ACCOUNTS: Array<{ name: string; type: AccountType; balance: number }> = [
  { name: 'BCA', type: 'bank', balance: 4_250_000 },
  { name: 'GoPay', type: 'ewallet', balance: 380_000 },
  { name: 'Dompet', type: 'cash', balance: 150_000 },
]
const SAMPLE_LOCKED = 650_000

/** A real piece of the app's interface, filled with sample money, for the auth and landing pages. */
export function BalanceFragment() {
  const { t } = useTranslation()
  const total = SAMPLE_ACCOUNTS.reduce((sum, account) => sum + account.balance, 0)
  const available = total - SAMPLE_LOCKED

  return (
    <figure data-ui className="w-full max-w-[420px]">
      <div className="rounded-(--radius-card) bg-card p-6 border">
        <p className="text-sm text-muted-foreground">{t('money.availableBalance')}</p>
        <Money amount={available} className="mt-1 block text-[32px] leading-10 font-semibold tracking-tight" />
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            {t('money.totalBalance')} <Money amount={total} className="text-foreground" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-locked-soft px-2.5 py-0.5 text-locked">
            <Lock className="size-3.5" />
            {t('money.lockedFunds')} <Money amount={SAMPLE_LOCKED} />
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Safe-Pay · {t('fragment.safePayNote')}</p>

        <p className="mt-6 text-sm font-medium">{t('fragment.accountsHeading')}</p>
        <ul className="mt-2">
          {SAMPLE_ACCOUNTS.map((account) => {
            const Icon = ACCOUNT_TYPE_ICONS[account.type]
            return (
              <li key={account.name} className="flex h-14 items-center gap-3">
                <span className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{account.name}</span>
                  <span className="block text-xs text-muted-foreground">{t(`accountTypes.${account.type}`)}</span>
                </span>
                <Money amount={account.balance} className="text-[15px]" />
              </li>
            )
          })}
        </ul>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">{t('fragment.caption')}</figcaption>
    </figure>
  )
}
