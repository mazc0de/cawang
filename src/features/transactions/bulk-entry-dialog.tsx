import { ClipboardPaste, Plus, X } from 'lucide-react'
import { DatePicker } from '@/components/date-picker'
import { type ClipboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { NativeSelect } from '@/components/native-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useActiveAccounts } from '@/features/accounts/queries'
import { useCategories } from '@/features/categories/queries'
import { useCurrentProfile } from '@/features/profile/queries'
import { parseAmountInput } from '@/lib/calculator'
import type { Account, Category, TransactionType } from '@/lib/database'
import { TRANSACTION_TYPES } from '@/lib/database'
import { type IsoDate, todayIn, toIsoDate, zonedParts, zonedTimestamp } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { type BulkRow, useBulkInsertTransactions } from './queries'
import { sentenceCase } from '@/components/sentence-case'
import { capitalizeSentences } from '@/lib/text'

interface Row {
  key: string
  type: TransactionType
  date: IsoDate
  amount: string
  /** Category id, or the destination Account id on a Transfer row. */
  target: string
  account_id: string
  note: string
}

type RowField = 'amount' | 'date' | 'target' | 'account_id'

const INITIAL_ROWS = 5
let rowCounter = 0
const newKey = () => `row-${++rowCounter}`

const TYPE_WORDS: Record<string, TransactionType> = {
  income: 'income',
  pemasukan: 'income',
  masuk: 'income',
  expense: 'expense',
  pengeluaran: 'expense',
  keluar: 'expense',
  transfer: 'transfer',
}

/** "2026-10-25", "25/10/2026" or "25-10-2026" (day first, as written in Indonesia). */
function parseDate(text: string): IsoDate | null {
  const value = text.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value)
  if (!match) return null
  const [, day, month, year] = match.map(Number)
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? toIsoDate(year, month, day) : null
}

function byName<T extends { name: string }>(items: T[], name: string): T | undefined {
  const wanted = name.trim().toLowerCase()
  return wanted ? items.find((item) => item.name.trim().toLowerCase() === wanted) : undefined
}

function isBlank(row: Row) {
  return !row.amount.trim() && !row.note.trim()
}

interface BulkEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: IsoDate
}

export function BulkEntryDialog({ open, onOpenChange, defaultDate }: BulkEntryDialogProps) {
  const { t } = useTranslation()
  // Blank rows pick the first Account, so wait for the list.
  const accounts = useActiveAccounts()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-[1120px] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('bulk.title')}</DialogTitle>
          <DialogDescription>{t('bulk.description')}</DialogDescription>
        </DialogHeader>
        {open && !accounts.isPending && <BulkEntryTable defaultDate={defaultDate} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function BulkEntryTable({ defaultDate, onDone }: { defaultDate: IsoDate; onDone: () => void }) {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  const { data: accounts = [] } = useActiveAccounts()
  const { data: allCategories = [] } = useCategories()
  const categories = allCategories.filter((category) => !category.archived_at)
  const bulkInsert = useBulkInsertTransactions()

  const blankRow = (): Row => ({
    key: newKey(),
    type: 'expense',
    date: defaultDate,
    amount: '',
    target: '',
    account_id: accounts[0]?.id ?? '',
    note: '',
  })
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: INITIAL_ROWS }, blankRow))
  const [errors, setErrors] = useState<Map<string, Set<RowField>>>(new Map())

  const update = (key: string, changes: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row
        const next = { ...row, ...changes }
        // Switching between a Transfer and Income/Expense changes what the target column holds.
        if (changes.type && (changes.type === 'transfer') !== (row.type === 'transfer')) next.target = ''
        else if (changes.type && changes.type !== 'transfer') {
          const category = categories.find((item) => item.id === row.target)
          if (category && category.type !== changes.type) next.target = ''
        }
        return next
      }),
    )

  const targetOptions = (row: Row): Array<Account | Category> =>
    row.type === 'transfer' ? accounts : categories.filter((category) => category.type === row.type)

  const rowFromCells = (cells: string[]): Row => {
    const [typeCell = '', dateCell = '', amountCell = '', targetCell = '', accountCell = '', noteCell = ''] = cells
    const type = TYPE_WORDS[typeCell.trim().toLowerCase()] ?? 'expense'
    const target =
      type === 'transfer'
        ? byName(accounts, targetCell)
        : byName(
            categories.filter((category) => category.type === type),
            targetCell,
          )
    return {
      key: newKey(),
      type,
      date: parseDate(dateCell) ?? defaultDate,
      amount: amountCell.trim(),
      target: target?.id ?? '',
      account_id: byName(accounts, accountCell)?.id ?? accounts[0]?.id ?? '',
      note: capitalizeSentences(noteCell.trim()),
    }
  }

  // Rows copied from a spreadsheet arrive as tab-separated lines; a single value pastes normally.
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.trim().includes('\n')) return
    event.preventDefault()
    const pasted = text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => rowFromCells(line.split('\t')))
    const focusedKey = (event.target as HTMLElement).closest('tr')?.dataset.row
    setRows((current) => {
      const start = Math.max(0, current.findIndex((row) => row.key === focusedKey))
      const kept = current.slice(0, start)
      const after = current.slice(start).filter((row) => !isBlank(row))
      return [...kept, ...pasted, ...after]
    })
    toast.success(t('bulk.pasted', { count: pasted.length }))
  }

  const save = async () => {
    const nextErrors = new Map<string, Set<RowField>>()
    const payload: BulkRow[] = []
    for (const row of rows) {
      if (isBlank(row)) continue
      const problems = new Set<RowField>()
      const amount = parseAmountInput(row.amount)
      if (amount === null || amount <= 0) problems.add('amount')
      if (!parseDate(row.date) || row.date > today) problems.add('date')
      if (!row.account_id) problems.add('account_id')
      if (!row.target || (row.type === 'transfer' && row.target === row.account_id)) problems.add('target')
      if (problems.size) {
        nextErrors.set(row.key, problems)
        continue
      }
      const time = row.date === today ? zonedParts(new Date().toISOString(), profile.timezone).time : '12:00'
      payload.push({
        type: row.type,
        amount: amount!,
        occurred_at: zonedTimestamp(row.date, time, profile.timezone),
        account_id: row.account_id,
        to_account_id: row.type === 'transfer' ? row.target : null,
        category_id: row.type === 'transfer' ? null : row.target,
        note: row.note,
      })
    }
    setErrors(nextErrors)
    if (nextErrors.size) return void toast.error(t('bulk.fixRows', { count: nextErrors.size }))
    if (!payload.length) return void toast.error(t('bulk.nothingToSave'))
    try {
      const count = await bulkInsert.mutateAsync(payload)
      toast.success(t('bulk.saved', { count }))
      onDone()
    } catch (error) {
      toast.error(errorMessage(error, t))
    }
  }

  const filled = rows.filter((row) => !isBlank(row)).length
  const invalid = (row: Row, field: RowField) => errors.get(row.key)?.has(field) ?? false

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border" onPaste={onPaste}>
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="w-[160px] px-2 py-2.5 font-normal">{t('transactions.type')}</th>
              <th className="w-[150px] px-2 py-2.5 font-normal">{t('transactions.date')}</th>
              <th className="w-[150px] px-2 py-2.5 text-right font-normal">{t('transactions.amount')}</th>
              <th className="px-2 py-2.5 font-normal">{t('bulk.categoryOrDestination')}</th>
              <th className="w-[170px] px-2 py-2.5 font-normal">{t('transactions.account')}</th>
              <th className="px-2 py-2.5 font-normal">{t('transactions.note')}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} data-row={row.key} className="border-t">
                <td className="px-2 py-1.5">
                  <NativeSelect
                    aria-label={`${t('transactions.type')} ${index + 1}`}
                    value={row.type}
                    onChange={(event) => update(row.key, { type: event.target.value as TransactionType })}
                  >
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`transactionTypes.${type}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td className="px-2 py-1.5">
                  <DatePicker
                    size="sm"
                    max={today}
                    aria-label={`${t('transactions.date')} ${index + 1}`}
                    invalid={invalid(row, 'date')}
                    value={row.date}
                    onChange={(date) => update(row.key, { date })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    inputMode="decimal"
                    aria-label={`${t('transactions.amount')} ${index + 1}`}
                    aria-invalid={invalid(row, 'amount')}
                    className="num h-9 text-right"
                    placeholder="0"
                    value={row.amount}
                    onChange={(event) => update(row.key, { amount: event.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <NativeSelect
                    aria-label={`${t('bulk.categoryOrDestination')} ${index + 1}`}
                    aria-invalid={invalid(row, 'target')}
                    value={row.target}
                    onChange={(event) => update(row.key, { target: event.target.value })}
                  >
                    <option value="">{row.type === 'transfer' ? t('transactions.toAccount') : t('transactions.chooseCategory')}</option>
                    {targetOptions(row).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td className="px-2 py-1.5">
                  <NativeSelect
                    aria-label={`${t('transactions.account')} ${index + 1}`}
                    aria-invalid={invalid(row, 'account_id')}
                    value={row.account_id}
                    onChange={(event) => update(row.key, { account_id: event.target.value })}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    aria-label={`${t('transactions.note')} ${index + 1}`}
                    autoCapitalize="sentences"
                    className="h-9"
                    value={row.note}
                    onChange={(event) => {
                      sentenceCase(event)
                      update(row.key, { note: event.target.value })
                    }}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label={t('bulk.removeRow', { row: index + 1 })}
                    disabled={rows.length === 1}
                    onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  >
                    <X />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" className="self-start" onClick={() => setRows((current) => [...current, blankRow()])}>
            <Plus />
            {t('bulk.addRow')}
          </Button>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ClipboardPaste className="mt-0.5 size-4 shrink-0" />
            {t('bulk.pasteHint')}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={save} disabled={bulkInsert.isPending || filled === 0} className={cn(filled === 0 && 'opacity-60')}>
            {t('bulk.save', { count: filled })}
          </Button>
        </div>
      </div>
    </div>
  )
}
