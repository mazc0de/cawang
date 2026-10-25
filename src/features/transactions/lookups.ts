import { useMemo } from 'react'
import { useAccounts } from '@/features/accounts/queries'
import { useCategories } from '@/features/categories/queries'
import type { Account, Category, TransactionType } from '@/lib/database'

export interface Lookups {
  accounts: Map<string, Account>
  categories: Map<string, Category>
}

/** Accounts and Categories by id, archived ones included, for showing names on old records. */
export function useLookups(): Lookups {
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  return useMemo(
    () => ({
      accounts: new Map(accounts.map((account) => [account.id, account])),
      categories: new Map(categories.map((category) => [category.id, category])),
    }),
    [accounts, categories],
  )
}

interface MoneyRecord {
  type: TransactionType
  account_id: string
  to_account_id: string | null
  category_id: string | null
}

/** The headline of a Transaction-like record: its Category, or "BCA → GoPay" for a Transfer. */
export function recordTitle(record: MoneyRecord, lookups: Lookups): string {
  if (record.type === 'transfer') {
    const from = lookups.accounts.get(record.account_id)?.name ?? '—'
    const to = lookups.accounts.get(record.to_account_id ?? '')?.name ?? '—'
    return `${from} → ${to}`
  }
  return lookups.categories.get(record.category_id ?? '')?.name ?? '—'
}
