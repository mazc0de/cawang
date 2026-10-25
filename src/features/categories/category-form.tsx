import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormFieldError } from '@/components/form-error'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS } from '@/lib/category-icons'
import type { Category, CategoryType } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { CATEGORY_COLORS, type CategoryColor, categoryColorClass } from '@/lib/palette'
import { cn } from '@/lib/utils'
import { CategoryTile } from './category-tile'
import { useSaveCategory } from './queries'

const NAME_MAX = 40
const COLOR_KEYS = Object.keys(CATEGORY_COLORS) as CategoryColor[]

const schema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(NAME_MAX, 'validation.nameTooLong'),
  type: z.enum(['expense', 'income']),
  icon: z.string(),
  color: z.string(),
})
type Values = z.infer<typeof schema>

interface CategoryFormProps {
  category?: Category
  defaultType: CategoryType
  onSaved: () => void
}

export function CategoryForm({ category, defaultType, onSaved }: CategoryFormProps) {
  const { t } = useTranslation()
  const saveCategory = useSaveCategory()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? { name: category.name, type: category.type, icon: category.icon, color: category.color }
      : { name: '', type: defaultType, icon: 'tag', color: 'blue' },
  })
  const { errors, isSubmitting } = form.formState
  const [name, icon, color] = useWatch({ control: form.control, name: ['name', 'icon', 'color'] })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await saveCategory.mutateAsync({ id: category?.id, ...values })
      toast.success(t('common.saved'))
      onSaved()
    } catch (error) {
      toast.error(errorMessage(error, t))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
          <CategoryTile icon={icon} color={color} />
          <span className="truncate text-[15px] font-medium">{name.trim() || t('categories.namePlaceholder')}</span>
        </div>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="category-name">{t('categories.name')}</FieldLabel>
          <Input id="category-name" autoComplete="off" aria-invalid={Boolean(errors.name)} {...form.register('name')} />
          <FormFieldError error={errors.name} values={{ max: NAME_MAX }} />
        </Field>
        <Field>
          <FieldTitle>{t('categories.type')}</FieldTitle>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <SegmentedControl<CategoryType>
                label={t('categories.type')}
                value={field.value}
                onChange={field.onChange}
                className="w-full sm:w-auto"
                options={[
                  { value: 'expense', label: t('transactionTypes.expense') },
                  { value: 'income', label: t('transactionTypes.income') },
                ]}
              />
            )}
          />
          {category && <FieldDescription>{t('categories.typeLockedHint')}</FieldDescription>}
        </Field>
        <Field>
          <FieldTitle>{t('categories.color')}</FieldTitle>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <div role="radiogroup" aria-label={t('categories.color')} className="flex flex-wrap gap-2">
                {COLOR_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={field.value === key}
                    aria-label={key}
                    onClick={() => field.onChange(key)}
                    className={cn(
                      'size-9 rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      categoryColorClass(key),
                      field.value === key ? 'border-foreground' : 'border-transparent',
                    )}
                  />
                ))}
              </div>
            )}
          />
        </Field>
        <Field>
          <FieldTitle>{t('categories.icon')}</FieldTitle>
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label={t('categories.icon')}
                className="grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl bg-muted p-2 sm:grid-cols-8"
              >
                {CATEGORY_ICON_NAMES.map((iconName) => {
                  const Icon = CATEGORY_ICONS[iconName]
                  const selected = field.value === iconName
                  return (
                    <button
                      key={iconName}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={iconName}
                      onClick={() => field.onChange(iconName)}
                      className={cn(
                        'flex h-10 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-card hover:text-foreground',
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.75} />
                    </button>
                  )
                })}
              </div>
            )}
          />
        </Field>
        <Button type="submit" disabled={isSubmitting} className="self-end">
          {t('common.save')}
        </Button>
      </FieldGroup>
    </form>
  )
}
