import { zodResolver } from '@hookform/resolvers/zod'
import { DatePicker } from '@/components/date-picker'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { AmountInput } from '@/components/amount-input'
import { FormFieldError } from '@/components/form-error'
import { NativeSelect } from '@/components/native-select'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useActiveAccounts } from '@/features/accounts/queries'
import { useCurrentProfile } from '@/features/profile/queries'
import { AccountSelect, CategorySelect } from '@/features/transactions/pickers'
import { type RecurringTemplate, TRANSACTION_TYPES, type TransactionType } from '@/lib/database'
import { todayIn } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { useSaveTemplate } from './queries'
import { sentenceCase } from '@/components/sentence-case'

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

const schema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: z.number('validation.amountInvalid').int().positive('validation.amountInvalid'),
    account_id: z.string().min(1, 'validation.required'),
    to_account_id: z.string(),
    category_id: z.string(),
    note: z.string().max(500, 'validation.nameTooLong'),
    day_of_month: z.number().int().min(1).max(31),
    start_date: z.string().min(1, 'validation.required'),
    end_date: z.string(),
    is_active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (value.type === 'transfer') {
      if (!value.to_account_id) issue('to_account_id', 'validation.required')
      else if (value.to_account_id === value.account_id) issue('to_account_id', 'validation.sameAccount')
    } else if (!value.category_id) issue('category_id', 'validation.required')
    if (value.end_date && value.end_date < value.start_date) issue('end_date', 'validation.endAfterStart')
  })
type Values = z.infer<typeof schema>

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: RecurringTemplate | null
}

export function TemplateDialog({ open, onOpenChange, template }: TemplateDialogProps) {
  const { t } = useTranslation()
  // Defaults pick the first Account, so wait for the list.
  const accounts = useActiveAccounts()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{template ? t('recurring.editTitle') : t('recurring.addTitle')}</DialogTitle>
          <DialogDescription>{t('recurring.formDescription')}</DialogDescription>
        </DialogHeader>
        {open && !accounts.isPending && <TemplateForm key={template?.id ?? 'new'} template={template} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function TemplateForm({ template, onDone }: { template: RecurringTemplate | null; onDone: () => void }) {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const { data: accounts = [] } = useActiveAccounts()
  const save = useSaveTemplate()
  const today = todayIn(profile.timezone)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: template
      ? {
          type: template.type,
          amount: template.amount,
          account_id: template.account_id,
          to_account_id: template.to_account_id ?? '',
          category_id: template.category_id ?? '',
          note: template.note ?? '',
          day_of_month: template.day_of_month,
          start_date: template.start_date,
          end_date: template.end_date ?? '',
          is_active: template.is_active,
        }
      : {
          type: 'expense',
          amount: null as unknown as number,
          account_id: accounts[0]?.id ?? '',
          to_account_id: '',
          category_id: '',
          note: '',
          day_of_month: Number(today.slice(8)),
          start_date: today,
          end_date: '',
          is_active: true,
        },
  })
  const { errors, isSubmitting } = form.formState
  const type = useWatch({ control: form.control, name: 'type' })
  const noteField = form.register('note')
  const keepIds = [template?.account_id, template?.to_account_id, template?.category_id]
  const optional = <span className="font-normal text-muted-foreground">({t('common.optional')})</span>

  const onSubmit = form.handleSubmit(async (values) => {
    const isTransfer = values.type === 'transfer'
    try {
      await save.mutateAsync({
        id: template?.id,
        ...values,
        to_account_id: isTransfer ? values.to_account_id : null,
        category_id: isTransfer ? null : values.category_id,
        end_date: values.end_date || null,
      })
      toast.success(t('common.saved'))
      onDone()
    } catch (error) {
      toast.error(errorMessage(error, t))
    }
  })

  const accountField = (name: 'account_id' | 'to_account_id', label: string) => (
    <Field data-invalid={Boolean(errors[name])}>
      <FieldLabel htmlFor={`template-${name}`}>{label}</FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <AccountSelect id={`template-${name}`} value={field.value} onChange={field.onChange} invalid={Boolean(errors[name])} keepIds={keepIds} />
        )}
      />
      <FormFieldError error={errors[name]} />
    </Field>
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <SegmentedControl<TransactionType>
              label={t('transactions.type')}
              value={field.value}
              onChange={(next) => {
                if (next !== field.value) form.setValue('category_id', '')
                field.onChange(next)
              }}
              className="w-full"
              options={TRANSACTION_TYPES.map((value) => ({ value, label: t(`transactionTypes.${value}`) }))}
            />
          )}
        />
        <Field data-invalid={Boolean(errors.amount)}>
          <FieldLabel htmlFor="template-amount">{t('transactions.amount')}</FieldLabel>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <AmountInput id="template-amount" aria-invalid={Boolean(errors.amount)} value={field.value ?? null} onChange={field.onChange} />
            )}
          />
          <FormFieldError error={errors.amount} />
        </Field>
        {type === 'transfer' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {accountField('account_id', t('transactions.fromAccount'))}
            {accountField('to_account_id', t('transactions.toAccount'))}
          </div>
        ) : (
          <>
            <Field data-invalid={Boolean(errors.category_id)}>
              <FieldLabel htmlFor="template-category">{t('transactions.category')}</FieldLabel>
              <Controller
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <CategorySelect
                    id="template-category"
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
        <Field>
          <FieldLabel htmlFor="template-note">
            {t('transactions.note')} {optional}
          </FieldLabel>
          <Input
            id="template-note"
            autoComplete="off"
            autoCapitalize="sentences"
            placeholder={t('recurring.notePlaceholder')}
            {...noteField}
            onChange={(event) => {
              sentenceCase(event)
              void noteField.onChange(event)
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="template-day">{t('recurring.dayOfMonth')}</FieldLabel>
          <Controller
            control={form.control}
            name="day_of_month"
            render={({ field }) => (
              <NativeSelect
                id="template-day"
                className="h-10"
                aria-describedby="template-day-hint"
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {t('recurring.everyDay', { day })}
                  </option>
                ))}
              </NativeSelect>
            )}
          />
          <FieldDescription id="template-day-hint">{t('recurring.dayHint')}</FieldDescription>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.start_date)}>
            <FieldLabel htmlFor="template-start">{t('recurring.startDate')}</FieldLabel>
            <Controller
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <DatePicker id="template-start" invalid={Boolean(errors.start_date)} value={field.value} onChange={field.onChange} />
              )}
            />
            <FormFieldError error={errors.start_date} />
          </Field>
          <Field data-invalid={Boolean(errors.end_date)}>
            <FieldLabel htmlFor="template-end">
              {t('recurring.endDate')} {optional}
            </FieldLabel>
            <Controller
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <DatePicker id="template-end" clearable invalid={Boolean(errors.end_date)} value={field.value} onChange={field.onChange} />
              )}
            />
            <FormFieldError error={errors.end_date} />
          </Field>
        </div>
        {template && (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="template-active">{t('recurring.active')}</FieldLabel>
              <FieldDescription>{t('recurring.activeHint')}</FieldDescription>
            </FieldContent>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => <Switch id="template-active" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </Field>
        )}
        {template && <p className="text-sm text-muted-foreground">{t('recurring.editAffects')}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
