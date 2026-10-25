import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccountBalances, useAccounts } from '@/features/accounts/queries'
import { CategoryTile } from '@/features/categories/category-tile'
import { useCategories } from '@/features/categories/queries'
import type { CategoryType } from '@/lib/database'
import { useMaskedFormat } from '@/providers/amount-visibility'

interface PickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  /** An archived Account or Category the record already uses stays selectable. */
  keepIds?: Array<string | null | undefined>
}

/** Active Accounts with their Available Balance beside the name. */
function AvailableAmount({ accountId, amount }: { accountId: string; amount: number }) {
  const { formatIDR: format } = useMaskedFormat(`account:${accountId}`)
  return <span className="num text-xs text-muted-foreground">{format(amount)}</span>
}

export function AccountSelect({ id, value, onChange, invalid, keepIds = [] }: PickerProps) {
  const { t } = useTranslation()
  const { data: accounts = [] } = useAccounts()
  const { data: balances } = useAccountBalances()
  const options = accounts.filter((account) => !account.archived_at || keepIds.includes(account.id))
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={t('transactions.chooseAccount')} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <span className="flex w-full items-center justify-between gap-6">
              <span className="truncate">{account.name}</span>
              <AvailableAmount accountId={account.id} amount={balances?.get(account.id)?.available_balance ?? account.initial_balance} />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Active Categories of one type, each on its colour tile. */
export function CategorySelect({ id, value, onChange, invalid, keepIds = [], type }: PickerProps & { type: CategoryType }) {
  const { t } = useTranslation()
  const { data: categories = [] } = useCategories()
  const options = categories.filter((category) => category.type === type && (!category.archived_at || keepIds.includes(category.id)))
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={t('transactions.chooseCategory')} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <CategoryTile icon={category.icon} color={category.color} className="size-6 rounded-md" />
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
