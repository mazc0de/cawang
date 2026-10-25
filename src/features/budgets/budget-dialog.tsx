import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '@/components/amount-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryTile } from '@/features/categories/category-tile'
import type { Budget, Category } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { useSaveBudget } from './queries'

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: Budget | null
  /** Expense Categories that have no Budget yet (plus the edited one's own). */
  categories: Category[]
}

export function BudgetDialog({ open, onOpenChange, budget, categories }: BudgetDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{budget ? t('budgets.editTitle') : t('budgets.addTitle')}</DialogTitle>
          <DialogDescription>{t('budgets.formDescription')}</DialogDescription>
        </DialogHeader>
        {open && <BudgetForm key={budget?.id ?? 'new'} budget={budget} categories={categories} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function BudgetForm({ budget, categories, onDone }: { budget: Budget | null; categories: Category[]; onDone: () => void }) {
  const { t } = useTranslation()
  const save = useSaveBudget()
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? '')
  const [amount, setAmount] = useState<number | null>(budget?.amount ?? null)
  const [submitted, setSubmitted] = useState(false)
  const valid = Boolean(categoryId) && amount !== null && amount > 0

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault()
        setSubmitted(true)
        if (!valid) return
        try {
          await save.mutateAsync({ id: budget?.id, category_id: categoryId, amount: amount! })
          toast.success(t('common.saved'))
          onDone()
        } catch (error) {
          toast.error(errorMessage(error, t))
        }
      }}
    >
      <FieldGroup>
        <Field data-invalid={submitted && !categoryId}>
          <FieldLabel htmlFor="budget-category">{t('transactions.category')}</FieldLabel>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={Boolean(budget)}>
            <SelectTrigger id="budget-category" className="w-full" aria-invalid={submitted && !categoryId}>
              <SelectValue placeholder={t('transactions.chooseCategory')} />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <CategoryTile icon={category.icon} color={category.color} className="size-6 rounded-md" />
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={submitted && !(amount && amount > 0)}>
          <FieldLabel htmlFor="budget-amount">{t('budgets.limit')}</FieldLabel>
          <AmountInput id="budget-amount" className="h-12 text-lg" aria-describedby="budget-hint" value={amount} onChange={setAmount} />
          <FieldDescription id="budget-hint">{t('budgets.limitHint')}</FieldDescription>
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
