import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Transaction } from '@/lib/database'
import { zonedParts } from '@/lib/dates'
import { type Lookups, recordTitle } from './lookups'
import { RecordTile } from './record-tile'
import { TransactionAmount } from './transaction-dialog'

const rowClass =
  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted sm:px-5'

function RowAction({
  transaction,
  timezone,
  onOpen,
  children,
}: {
  transaction: Transaction
  timezone: string
  onOpen?: (transaction: Transaction) => void
  children: ReactNode
}) {
  if (onOpen) {
    return (
      <button type="button" onClick={() => onOpen(transaction)} className={rowClass}>
        {children}
      </button>
    )
  }
  return (
    <Link to={`/transactions?date=${zonedParts(transaction.occurred_at, timezone).date}`} className={rowClass}>
      {children}
    </Link>
  )
}

export function TransactionRow({
  transaction,
  lookups,
  timezone,
  onOpen,
}: {
  transaction: Transaction
  lookups: Lookups
  timezone: string
  /** Without it the row links to its day on the Transactions page. */
  onOpen?: (transaction: Transaction) => void
}) {
  const { t } = useTranslation()
  const account = lookups.accounts.get(transaction.account_id)
  const time = zonedParts(transaction.occurred_at, timezone).time
  const isTransfer = transaction.type === 'transfer'
  const title = recordTitle(transaction, lookups)
  const details = [
    isTransfer ? t('transactionTypes.transfer') : account?.name,
    time,
    transaction.parent_transaction_id ? t('transactions.adminFeeOfTransfer') : transaction.note,
  ].filter(Boolean)

  return (
    <li>
      <RowAction transaction={transaction} timezone={timezone} onOpen={onOpen}>
        <RecordTile type={transaction.type} categoryId={transaction.category_id} lookups={lookups} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{title}</span>
          <span className="num block truncate text-[13px] text-muted-foreground">{details.join(' · ')}</span>
        </span>
        <TransactionAmount transaction={transaction} />
      </RowAction>
    </li>
  )
}

