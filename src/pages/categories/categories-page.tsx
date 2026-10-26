import { Archive, ArchiveRestore, ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryForm } from '@/features/categories/category-form'
import { CategoryTile } from '@/features/categories/category-tile'
import {
  type CategoryUsage,
  isCategoryInUse,
  useCategories,
  useCategoryUsage,
  useDeleteCategory,
  useSetCategoryArchived,
} from '@/features/categories/queries'
import type { Category, CategoryType } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface CategoryListProps {
  type: CategoryType
  categories: Category[]
  loading: boolean
  className?: string
  onEdit: (category: Category) => void
  onArchive: (category: Category, archived: boolean) => void
  onDelete: (category: Category) => void
}

/** One Transaction Type's Categories, with its archived ones folded under the list. */
function CategoryList({ type, categories, loading, className, onEdit, onArchive, onDelete }: CategoryListProps) {
  const { t } = useTranslation()
  const [showArchived, setShowArchived] = useState(false)
  const active = categories.filter((category) => !category.archived_at)
  const archived = categories.filter((category) => category.archived_at)

  return (
    <section className={cn('overflow-hidden rounded-(--radius-card) border bg-card', className)} aria-labelledby={`categories-${type}`}>
      <h2 id={`categories-${type}`} className="px-5 pt-5 pb-2 text-base font-semibold">
        {t(`transactionTypes.${type}`)} <span className="font-normal text-muted-foreground">({active.length})</span>
      </h2>
      {loading ? (
        <div className="flex flex-col gap-2 px-5 pb-5">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="pb-2">
          {active.map((category) => (
            <li key={category.id} className="flex items-center gap-3 px-5 py-2.5">
              <CategoryTile icon={category.icon} color={category.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{category.name}</span>
                {category.system_key === 'admin_fee' && (
                  <span className="block text-[13px] text-muted-foreground">{t('categories.adminFeeNote')}</span>
                )}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={t('common.actionsFor', { name: category.name })}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(category)}>
                    <Pencil />
                    {t('common.edit')}
                  </DropdownMenuItem>
                  {!category.system_key && (
                    <>
                      <DropdownMenuItem onSelect={() => onArchive(category, true)}>
                        <Archive />
                        {t('common.archive')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(category)}>
                        <Trash2 />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
          {active.length === 0 && (
            <li className="mx-5 mb-3 rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">{t('categories.empty')}</li>
          )}
        </ul>
      )}
      {archived.length > 0 && (
        <div className="border-t px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 text-muted-foreground"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((shown) => !shown)}
          >
            <ChevronDown className={cn('transition-transform', showArchived && 'rotate-180')} />
            {t('categories.archivedHeading', { count: archived.length })}
          </Button>
          {showArchived && (
            <ul className="mt-1">
              {archived.map((category) => (
                <li key={category.id} className="flex items-center gap-3 py-2">
                  <CategoryTile icon={category.icon} color={category.color} className="opacity-60" />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-muted-foreground">{category.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => onArchive(category, false)}>
                    <ArchiveRestore />
                    {t('common.unarchive')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/** "12 transactions, 1 Safe-Pay and 2 recurring transactions": what still uses the Category. */
function usageList(usage: CategoryUsage, t: TFunction, language: string) {
  const parts = [
    usage.transactions > 0 && t('categories.usage.transactions', { count: usage.transactions }),
    usage.safePays > 0 && t('categories.usage.safePays', { count: usage.safePays }),
    usage.recurring > 0 && t('categories.usage.recurring', { count: usage.recurring }),
  ].filter((part): part is string => Boolean(part))
  return new Intl.ListFormat(language, { type: 'conjunction' }).format(parts)
}

export function CategoriesPage() {
  const { t, i18n } = useTranslation()
  const categories = useCategories()
  const setArchived = useSetCategoryArchived()
  const deleteCategory = useDeleteCategory()
  // Phones show one type at a time; wider screens show both lists side by side.
  const [mobileType, setMobileType] = useState<CategoryType>('expense')
  const [form, setForm] = useState<{ open: boolean; category?: Category }>({ open: false })
  const [deleting, setDeleting] = useState<Category | null>(null)
  const usage = useCategoryUsage(deleting?.id)
  const inUse = usage.data ? isCategoryInUse(usage.data) : false

  const all = categories.data ?? []
  const ofType = (type: CategoryType) => all.filter((category) => category.type === type)

  const archive = (category: Category, value: boolean) =>
    setArchived.mutate(
      { id: category.id, archived: value },
      {
        onSuccess: () =>
          toast.success(value ? t('categories.archived', { name: category.name }) : t('categories.restored', { name: category.name })),
        onError: (error) => toast.error(errorMessage(error, t)),
      },
    )

  // The delete dialog first counts what uses the Category: a used one can only be archived.
  const deleteDescription = () => {
    if (usage.isPending) return t('categories.deleteChecking')
    if (usage.isError) return errorMessage(usage.error, t)
    if (inUse) return t('categories.deleteInUseBody', { usage: usageList(usage.data, t, i18n.language) })
    return usage.data.budgets > 0 ? t('categories.deleteUnusedWithBudgetBody') : t('categories.deleteUnusedBody')
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      if (inUse) {
        await setArchived.mutateAsync({ id: deleting.id, archived: true })
        toast.success(t('categories.archived', { name: deleting.name }))
      } else {
        await deleteCategory.mutateAsync(deleting.id)
        toast.success(t('categories.deleted', { name: deleting.name }))
      }
    } catch (error) {
      toast.error(errorMessage(error, t))
      throw error
    }
  }

  const listProps = {
    loading: categories.isPending,
    onEdit: (category: Category) => setForm({ open: true, category }),
    onArchive: archive,
    onDelete: setDeleting,
  }

  return (
    <>
      <PageHeader
        title={t('nav.categories')}
        actions={
          <Button onClick={() => setForm({ open: true })}>
            <Plus />
            <span className="hidden sm:inline">{t('categories.add')}</span>
          </Button>
        }
      />

      <SegmentedControl<CategoryType>
        label={t('categories.type')}
        value={mobileType}
        onChange={setMobileType}
        className="mt-6 w-full lg:hidden"
        options={[
          { value: 'expense', label: t('transactionTypes.expense') },
          { value: 'income', label: t('transactionTypes.income') },
        ]}
      />

      <div className="mt-4 grid items-start gap-6 lg:mt-6 lg:grid-cols-2">
        {(['expense', 'income'] as const).map((type) => (
          <CategoryList
            key={type}
            type={type}
            categories={ofType(type)}
            className={cn(type !== mobileType && 'hidden lg:block')}
            {...listProps}
          />
        ))}
      </div>

      <Dialog open={form.open} onOpenChange={(open) => setForm((current) => ({ ...current, open }))}>
        <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">{form.category ? t('categories.editTitle') : t('categories.add')}</DialogTitle>
            <DialogDescription className="sr-only">{t('categories.formDescription')}</DialogDescription>
          </DialogHeader>
          {form.open && (
            <CategoryForm
              key={form.category?.id ?? 'new'}
              category={form.category}
              defaultType={mobileType}
              onSaved={() => setForm({ open: false })}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t(inUse ? 'categories.deleteInUseTitle' : 'categories.deleteTitle', { name: deleting?.name ?? '' })}
        description={deleting ? deleteDescription() : ''}
        confirmLabel={inUse ? t('common.archive') : t('common.delete')}
        destructive={!inUse}
        confirmDisabled={!usage.isSuccess}
        onConfirm={confirmDelete}
      />
    </>
  )
}
