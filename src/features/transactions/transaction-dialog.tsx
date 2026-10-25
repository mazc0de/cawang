import { zodResolver } from '@hookform/resolvers/zod'
import { DatePicker } from '@/components/date-picker'
import { Calculator, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { AmountInput } from '@/components/amount-input'
import { FormFieldError } from '@/components/form-error'
import { Money } from '@/components/money'
import { SegmentedControl } from '@/components/segmented-control'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAccountBalances, useAccounts } from '@/features/accounts/queries'
import { useCurrentProfile } from '@/features/profile/queries'
import { useCreateTransactionWithRecurring } from '@/features/recurring/queries'
import { useSaveSafePay } from '@/features/safe-pay/queries'
import { type Transaction, TRANSACTION_TYPES, type TransactionType } from '@/lib/database'
import { type IsoDate, parseIsoDate, todayIn, zonedParts, zonedTimestamp } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CalculatorPad } from './calculator-pad'
import { AccountSelect, CategorySelect } from './pickers'
import { useAdminFee, useDeleteTransaction, useSaveTransaction, useTransactionLinks } from './queries'
import { useMaskedFormat } from '@/providers/amount-visibility'
import { sentenceCase } from '@/components/sentence-case'
import { AmountPresets } from '@/components/amount-presets'
import { presetsOf } from '@/lib/amount-presets'

const NOTE_MAX = 500

/** What saving creates besides (or instead of) a plain Transaction. Mutually exclusive. */
type Extra = 'none' | 'safe_pay' | 'recurring'

function makeSchema(today: IsoDate) {
  return z
    .object({
      type: z.enum(TRANSACTION_TYPES),
      amount: z.number('validation.amountInvalid').int().positive('validation.amountInvalid'),
      date: z.string(),
      time: z.string(),
      account_id: z.string().min(1, 'validation.required'),
      to_account_id: z.string(),
      category_id: z.string(),
      note: z.string().max(NOTE_MAX, 'validation.nameTooLong'),
      admin_fee: z.number().int().nonnegative().nullable(),
      extra: z.enum(['none', 'safe_pay', 'recurring']),
      due_date: z.string(),
      end_date: z.string(),
    })
    .superRefine((value, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
      if (value.extra !== 'safe_pay') {
        if (!value.date) issue('date', 'validation.required')
        else if (value.date > today) issue('date', 'validation.noFutureDate')
        if (!value.time) issue('time', 'validation.required')
      }
      if (value.extra === 'recurring' && value.end_date && value.end_date <= value.date) {
        issue('end_date', 'validation.endAfterStart')
      }
      if (value.type === 'transfer') {
        if (!value.to_account_id) issue('to_account_id', 'validation.required')
        else if (value.to_account_id === value.account_id) issue('to_account_id', 'validation.sameAccount')
      } else if (!value.category_id) {
        issue('category_id', 'validation.required')
      }
    })
}
type Values = z.infer<ReturnType<typeof makeSchema>>

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this Transaction; null adds a new one. */
  transaction: Transaction | null
  /** The day the Transactions page is showing; new Transactions start on it. */
  defaultDate: IsoDate
}

export function TransactionDialog({ open, onOpenChange, transaction, defaultDate }: TransactionDialogProps) {
  const { t } = useTranslation()
  const isTransfer = transaction?.type === 'transfer'
  const fee = useAdminFee(open && isTransfer ? transaction.id : null)
  // Defaults pick the first Account, so wait for the list.
  const accounts = useAccounts()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-[880px] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{transaction ? t('transactions.editTitle') : t('transactions.addTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('transactions.formDescription')}</DialogDescription>
        </DialogHeader>
        {open && !accounts.isPending && (!isTransfer || !fee.isPending) ? (
          <TransactionForm
            key={transaction?.id ?? 'new'}
            transaction={transaction}
            adminFee={fee.data ?? null}
            defaultDate={defaultDate}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <div className="flex h-60 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface TransactionFormProps {
  transaction: Transaction | null
  adminFee: number | null
  defaultDate: IsoDate
  onDone: () => void
}

function TransactionForm({ transaction, adminFee, defaultDate, onDone }: TransactionFormProps) {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  const { data: accounts = [] } = useAccounts()
  const { data: balances } = useAccountBalances()
  const saveTransaction = useSaveTransaction()
  const saveSafePay = useSaveSafePay()
  const createWithRecurring = useCreateTransactionWithRecurring()
  const [showCalculator, setShowCalculator] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Computed once per opening: "now" must not move while the form is open.
  const [defaults] = useState<Values>(() => {
    const blankExtras = { extra: 'none' as const, due_date: '', end_date: '' }
    if (transaction) {
      return {
        type: transaction.type,
        amount: transaction.amount,
        ...zonedParts(transaction.occurred_at, profile.timezone),
        account_id: transaction.account_id,
        to_account_id: transaction.to_account_id ?? '',
        category_id: transaction.category_id ?? '',
        note: transaction.note ?? '',
        admin_fee: adminFee,
        ...blankExtras,
      }
    }
    return {
      type: 'expense',
      amount: null as unknown as number,
      date: defaultDate,
      // Today defaults to now; another day defaults to midday.
      time: defaultDate === today ? zonedParts(new Date().toISOString(), profile.timezone).time : '12:00',
      account_id: accounts.find((account) => !account.archived_at)?.id ?? '',
      to_account_id: '',
      category_id: '',
      note: '',
      admin_fee: null,
      ...blankExtras,
    }
  })

  const form = useForm<Values>({ resolver: zodResolver(makeSchema(today)), defaultValues: defaults })
  const { errors, isSubmitting } = form.formState
  const [type, accountId, amount, adminFeeValue, extra, date] = useWatch({
    control: form.control,
    name: ['type', 'account_id', 'amount', 'admin_fee', 'extra', 'date'],
  })
  const isSafePay = extra === 'safe_pay'
  const noteField = form.register('note')
  // Balance hints follow the account's show/hide choice; the amount being typed stays visible.
  const masked = useMaskedFormat(`account:${accountId}`)

  // When editing, take the Transaction's own current effect out of the balance before comparing.
  const ownEffect =
    transaction && transaction.account_id === accountId
      ? transaction.type === 'income'
        ? transaction.amount
        : -(transaction.amount + (transaction.type === 'transfer' ? (adminFee ?? 0) : 0))
      : 0
  const reported = balances?.get(accountId)?.available_balance
  const available = reported === undefined ? undefined : reported - ownEffect
  const goesNegative =
    !isSafePay && type !== 'income' && available !== undefined && amount > 0 && amount + (adminFeeValue ?? 0) > available

  const toggleExtra = (value: Extra, checked: boolean) => {
    form.setValue('extra', checked ? value : 'none')
    // A Safe-Pay is always an Expense.
    if (checked && value === 'safe_pay') form.setValue('type', 'expense')
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const occurredAt = () => zonedTimestamp(values.date, values.time, profile.timezone)
    const isTransferValue = values.type === 'transfer'
    try {
      if (values.extra === 'safe_pay') {
        if (available !== undefined && values.amount > available) {
          form.setError('amount', { message: 'validation.overAvailable' })
          return
        }
        await saveSafePay.mutateAsync({
          account_id: values.account_id,
          category_id: values.category_id,
          amount: values.amount,
          note: values.note,
          due_date: values.due_date || null,
        })
        toast.success(t('safePay.created'))
      } else if (values.extra === 'recurring') {
        await createWithRecurring.mutateAsync({
          type: values.type,
          amount: values.amount,
          occurredAt: occurredAt(),
          accountId: values.account_id,
          toAccountId: isTransferValue ? values.to_account_id : null,
          categoryId: isTransferValue ? null : values.category_id,
          note: values.note,
          adminFee: isTransferValue ? values.admin_fee : null,
          endDate: values.end_date || null,
        })
        toast.success(t('recurring.createdWithTransaction'))
      } else {
        await saveTransaction.mutateAsync({
          id: transaction?.id ?? null,
          type: values.type,
          amount: values.amount,
          occurred_at: occurredAt(),
          account_id: values.account_id,
          to_account_id: isTransferValue ? values.to_account_id : null,
          category_id: isTransferValue ? null : values.category_id,
          note: values.note,
          admin_fee: isTransferValue ? values.admin_fee : null,
        })
        toast.success(t('common.saved'))
      }
      onDone()
    } catch (error) {
      toast.error(errorMessage(error, t))
    }
  })

  const keepIds = [transaction?.account_id, transaction?.to_account_id, transaction?.category_id]
  const accountField = (name: 'account_id' | 'to_account_id', label: string) => (
    <Field data-invalid={Boolean(errors[name])}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <AccountSelect id={name} value={field.value} onChange={field.onChange} invalid={Boolean(errors[name])} keepIds={keepIds} />
        )}
      />
      <FormFieldError error={errors[name]} />
    </Field>
  )
  const optional = <span className="font-normal text-muted-foreground">({t('common.optional')})</span>

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <FieldGroup>
          {isSafePay ? (
            <p className="flex h-11 items-center rounded-xl bg-locked-soft px-4 text-sm text-locked">{t('safePay.formTypeNote')}</p>
          ) : (
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <SegmentedControl<TransactionType>
                  label={t('transactions.type')}
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next)
                    // A Category belongs to Income or Expense; drop it when the type changes.
                    if (next !== field.value) form.setValue('category_id', '')
                  }}
                  className="w-full"
                  options={TRANSACTION_TYPES.map((value) => ({ value, label: t(`transactionTypes.${value}`) }))}
                />
              )}
            />
          )}

          <Field data-invalid={Boolean(errors.amount)}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="amount">{t('transactions.amount')}</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground md:hidden"
                aria-expanded={showCalculator}
                onClick={() => setShowCalculator((shown) => !shown)}
              >
                <Calculator />
                {t('transactions.calculator')}
              </Button>
            </div>
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <AmountInput
                  id="amount"
                  autoFocus={!transaction}
                  className="h-12 text-lg"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby="amount-hint"
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.amount ? (
              <FormFieldError error={errors.amount} values={{ amount: masked.formatIDR(available ?? 0) }} />
            ) : (
              <FieldDescription id="amount-hint">{t('transactions.amountHint')}</FieldDescription>
            )}
            <AmountPresets
              presets={presetsOf(profile)}
              amount={amount ?? null}
              onChange={(next) => form.setValue('amount', next as number, { shouldValidate: next !== null })}
            />
            {showCalculator && (
              <CalculatorPad
                className="md:hidden"
                onUse={(result) => {
                  form.setValue('amount', result, { shouldValidate: true })
                  setShowCalculator(false)
                }}
              />
            )}
          </Field>

          {isSafePay ? (
            <Field>
              <FieldLabel htmlFor="due-date">
                {t('safePay.dueDate')} {optional}
              </FieldLabel>
              <Controller
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <DatePicker id="due-date" clearable aria-describedby="due-date-hint" value={field.value} onChange={field.onChange} />
                )}
              />
              <FieldDescription id="due-date-hint">{t('safePay.dueDateHint')}</FieldDescription>
            </Field>
          ) : (
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
              <Field data-invalid={Boolean(errors.date)}>
                <FieldLabel htmlFor="date">{t('transactions.date')}</FieldLabel>
                <Controller
                control={form.control}
                name="date"
                render={({ field }) => (
                  <DatePicker id="date" max={today} invalid={Boolean(errors.date)} value={field.value} onChange={field.onChange} />
                )}
              />
                <FormFieldError error={errors.date} />
              </Field>
              <Field data-invalid={Boolean(errors.time)}>
                <FieldLabel htmlFor="time">{t('transactions.time')}</FieldLabel>
                <Input id="time" type="time" aria-invalid={Boolean(errors.time)} {...form.register('time')} />
                <FormFieldError error={errors.time} />
              </Field>
            </div>
          )}

          {type === 'transfer' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {accountField('account_id', t('transactions.fromAccount'))}
                {accountField('to_account_id', t('transactions.toAccount'))}
              </div>
              <Field>
                <FieldLabel htmlFor="admin-fee">
                  {t('transactions.adminFee')} {optional}
                </FieldLabel>
                <Controller
                  control={form.control}
                  name="admin_fee"
                  render={({ field }) => (
                    <AmountInput id="admin-fee" aria-describedby="admin-fee-hint" value={field.value} onChange={field.onChange} />
                  )}
                />
                <FieldDescription id="admin-fee-hint">{t('transactions.adminFeeHint')}</FieldDescription>
              </Field>
            </>
          ) : (
            <>
              <Field data-invalid={Boolean(errors.category_id)}>
                <FieldLabel htmlFor="category">{t('transactions.category')}</FieldLabel>
                <Controller
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <CategorySelect
                      id="category"
                      type={type === 'income' ? 'income' : 'expense'}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={Boolean(errors.category_id)}
                      keepIds={keepIds}
                    />
                  )}
                />
                <FormFieldError error={errors.category_id} />
              </Field>
              {accountField('account_id', t('transactions.account'))}
            </>
          )}

          {goesNegative && (
            <p className="-mt-2 text-sm text-locked">{t('transactions.goesNegative', { amount: masked.formatIDR(available ?? 0) })}</p>
          )}

          <Field data-invalid={Boolean(errors.note)}>
            <FieldLabel htmlFor="note">
              {t('transactions.note')} {optional}
            </FieldLabel>
            <Input
              id="note"
              autoComplete="off"
              autoCapitalize="sentences"
              placeholder={t('transactions.notePlaceholder')}
              {...noteField}
              onChange={(event) => {
                sentenceCase(event)
                void noteField.onChange(event)
              }}
            />
            <FormFieldError error={errors.note} values={{ max: NOTE_MAX }} />
          </Field>

          {!transaction && (
            <div className="flex flex-col gap-3 rounded-xl bg-muted p-4">
              <Field orientation="horizontal">
                <Checkbox
                  id="extra-safe-pay"
                  checked={extra === 'safe_pay'}
                  onCheckedChange={(checked) => toggleExtra('safe_pay', checked === true)}
                />
                <FieldContent>
                  <FieldLabel htmlFor="extra-safe-pay">{t('safePay.checkbox')}</FieldLabel>
                  <FieldDescription>{t('safePay.checkboxHint')}</FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="extra-recurring"
                  checked={extra === 'recurring'}
                  onCheckedChange={(checked) => toggleExtra('recurring', checked === true)}
                />
                <FieldContent>
                  <FieldLabel htmlFor="extra-recurring">{t('recurring.checkbox')}</FieldLabel>
                  <FieldDescription>
                    {date
                      ? t('recurring.checkboxHint', { day: parseIsoDate(date).day })
                      : t('recurring.checkboxHintNoDate')}
                  </FieldDescription>
                </FieldContent>
              </Field>
              {extra === 'recurring' && (
                <Field data-invalid={Boolean(errors.end_date)} className="sm:pl-7">
                  <FieldLabel htmlFor="end-date">
                    {t('recurring.endDate')} {optional}
                  </FieldLabel>
                  <Controller
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <DatePicker id="end-date" clearable min={date || undefined} invalid={Boolean(errors.end_date)} value={field.value} onChange={field.onChange} />
                )}
              />
                  <FormFieldError error={errors.end_date} />
                </Field>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {transaction ? (
              <Button type="button" variant="ghost" className="text-expense" onClick={() => setConfirmDelete(true)}>
                <Trash2 />
                {t('transactions.delete')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onDone}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSafePay ? t('safePay.lockFunds') : t('common.save')}
              </Button>
            </div>
          </div>
        </FieldGroup>

        <div className="hidden md:block">
          <FieldTitle className="mb-2">{t('transactions.calculator')}</FieldTitle>
          <CalculatorPad onUse={(result) => form.setValue('amount', result, { shouldValidate: true })} />
        </div>
      </form>

      {transaction && (
        <DeleteTransactionDialog
          transaction={transaction}
          hasAdminFee={adminFee !== null}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onDeleted={onDone}
        />
      )}
    </>
  )
}

interface DeleteTransactionDialogProps {
  transaction: Transaction
  hasAdminFee: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

function DeleteTransactionDialog({ transaction, hasAdminFee, open, onOpenChange, onDeleted }: DeleteTransactionDialogProps) {
  const { t } = useTranslation()
  const links = useTransactionLinks(open ? transaction.id : null)
  const deleteTransaction = useDeleteTransaction()

  const consequences = [
    links.data?.settledSafePay && t('transactions.deleteRevertsSafePay'),
    links.data?.confirmedOccurrence && t('transactions.deleteRevertsOccurrence'),
    hasAdminFee && t('transactions.deleteRemovesAdminFee'),
  ].filter(Boolean)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('transactions.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('transactions.deleteBody', { amount: formatIDR(transaction.amount) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {consequences.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-lg bg-locked-soft px-3 py-2.5 text-sm text-locked">
            {consequences.map((sentence) => (
              <li key={sentence as string}>{sentence}</li>
            ))}
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={links.isPending || deleteTransaction.isPending}
            onClick={async () => {
              try {
                await deleteTransaction.mutateAsync(transaction.id)
                toast.success(t('transactions.deleted'))
                onOpenChange(false)
                onDeleted()
              } catch (error) {
                toast.error(errorMessage(error, t))
              }
            }}
          >
            {t('transactions.delete')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Signed, coloured amount for a Transaction row: income green "+", expense red "−", transfer neutral. */
export function TransactionAmount({ transaction, className }: { transaction: Transaction; className?: string }) {
  const tone = transaction.type
  return <Money amount={transaction.amount} tone={tone} signed className={cn('text-[15px] font-medium', className)} />
}
