import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { BudgetDialog } from '@/features/budgets/budget-dialog'
import { CycleSummary } from '@/features/budgets/cycle-summary'
import { PendingSwatch, PlanBar } from '@/features/budgets/plan-bar'
import { type BudgetProgress, useBudgetProgress, useDeleteBudget } from '@/features/budgets/queries'
import { BudgetStatusPill } from '@/features/budgets/status-pill'
import { CategoryTile } from '@/features/categories/category-tile'
import { useCategories } from '@/features/categories/queries'
import { CycleNavigator } from '@/features/cycle/cycle-navigator'
import { useCurrentCycle } from '@/features/cycle/use-cycle'
import type { Budget } from '@/lib/database'
import { shiftCycle } from '@/lib/cycle'
import { errorMessage } from '@/lib/errors'

function BudgetCard({ row, onEdit, onDelete }: { row: BudgetProgress; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  const left = row.budget.amount - row.spent
  const name = row.category?.name ?? '—'
  return (
    <article className="flex flex-col rounded-(--radius-card) border bg-card p-5">
      <header className="flex items-center gap-3">
        <CategoryTile icon={row.category?.icon ?? 'tag'} color={row.category?.color ?? 'slate'} />
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{name}</h3>
        <BudgetStatusPill status={row.status} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="-mr-2 text-muted-foreground" aria-label={t('common.actionsFor', { name })}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <p className="mt-5 text-[13px] text-muted-foreground">{left < 0 ? t('budgets.overBy', { amount: '' }) : t('budgets.left')}</p>
      <Money amount={Math.abs(left)} tone={left < 0 ? 'expense' : 'default'} className="text-2xl font-semibold tracking-tight" />
      <PlanBar limit={row.budget.amount} spent={row.spent} pending={row.pending} status={row.status} className="mt-3" />
      <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span>
          {t('budgets.spent')} <Money amount={row.spent} className="text-foreground" />
        </span>
        <span>
          {t('budgets.limit')} <Money amount={row.budget.amount} className="text-foreground" />
        </span>
      </div>
      {row.pending > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-locked">
          <PendingSwatch />
          {t('budgets.pendingSafePay')} <Money amount={row.pending} />
        </p>
      )}
    </article>
  )
}

export function BudgetsPage() {
  const { t } = useTranslation()
  const current = useCurrentCycle()
  const [offset, setOffset] = useState(0)
  const cycle = shiftCycle(current.cycle, current.startDay, offset)
  const progress = useBudgetProgress(cycle, current.timezone)
  const { data: categories = [] } = useCategories()
  const deleteBudget = useDeleteBudget()
  const [editing, setEditing] = useState<{ open: boolean; budget: Budget | null }>({ open: false, budget: null })
  const [deleting, setDeleting] = useState<BudgetProgress | null>(null)

  const rows = progress.data ?? []
  const budgeted = new Set(rows.map((row) => row.budget.category_id))
  const unbudgeted = categories.filter((category) => category.type === 'expense' && !category.archived_at && !budgeted.has(category.id))
  const dialogCategories = editing.budget
    ? categories.filter((category) => category.id === editing.budget?.category_id)
    : unbudgeted

  return (
    <>
      <PageHeader
        title={t('nav.budgets')}
        actions={
          <Button onClick={() => setEditing({ open: true, budget: null })} disabled={unbudgeted.length === 0}>
            <Plus />
            <span className="hidden sm:inline">{t('budgets.addTitle')}</span>
          </Button>
        }
      />
      <div className="mt-4">
        <CycleNavigator cycle={cycle} offset={offset} onOffsetChange={setOffset} />
      </div>

      {progress.isPending ? (
        <div className="mt-4 grid gap-4">
          <Skeleton className="h-40 rounded-(--radius-card)" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-52 rounded-(--radius-card)" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-(--radius-card) border border-dashed p-6">
          <p className="text-[15px] font-medium">{t('budgets.emptyTitle')}</p>
          <p className="max-w-prose text-sm text-muted-foreground">{t('budgets.emptyBody')}</p>
          <Button onClick={() => setEditing({ open: true, budget: null })} disabled={unbudgeted.length === 0}>
            <Plus />
            {t('budgets.addTitle')}
          </Button>
        </div>
      ) : (
        <>
          <section className="mt-4 rounded-(--radius-card) border bg-card p-5" aria-label={t('budgets.summary')}>
            <CycleSummary rows={rows} />
          </section>
          <section className="mt-6" aria-labelledby="budget-list">
            <h2 id="budget-list" className="text-base font-semibold">
              {t('budgets.listHeading', { count: rows.length })}
            </h2>
            <div className="mt-3 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <BudgetCard
                  key={row.budget.id}
                  row={row}
                  onEdit={() => setEditing({ open: true, budget: row.budget })}
                  onDelete={() => setDeleting(row)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {unbudgeted.length > 0 && rows.length > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          {t('budgets.withoutBudget')} {unbudgeted.map((category) => category.name).join(', ')}
        </p>
      )}

      <BudgetDialog
        open={editing.open}
        onOpenChange={(open) => setEditing((value) => ({ ...value, open }))}
        budget={editing.budget}
        categories={dialogCategories}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('budgets.deleteTitle', { name: deleting?.category?.name ?? '' })}
        description={t('budgets.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteBudget.mutateAsync(deleting.budget.id)
            toast.success(t('budgets.deleted'))
          } catch (error) {
            toast.error(errorMessage(error, t))
            throw error
          }
        }}
      />
    </>
  )
}
