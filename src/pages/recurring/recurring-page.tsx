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
import { Switch } from '@/components/ui/switch'
import { useCurrentProfile } from '@/features/profile/queries'
import { PendingOccurrenceList, templateTitle } from '@/features/recurring/pending-list'
import {
  useDeleteTemplate,
  usePendingOccurrences,
  useRecurringTemplates,
  useSetTemplateActive,
} from '@/features/recurring/queries'
import { TemplateDialog } from '@/features/recurring/template-dialog'
import { useLookups } from '@/features/transactions/lookups'
import { RecordTile } from '@/features/transactions/record-tile'
import { currentLanguage } from '@/i18n'
import type { RecurringTemplate } from '@/lib/database'
import { todayIn } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { nextDueDate } from '@/lib/recurring'

export function RecurringPage() {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  const language = currentLanguage()
  const lookups = useLookups()
  const templates = useRecurringTemplates()
  const pending = usePendingOccurrences(today)
  const setActive = useSetTemplateActive()
  const deleteTemplate = useDeleteTemplate()
  const [editing, setEditing] = useState<{ open: boolean; template: RecurringTemplate | null }>({ open: false, template: null })
  const [deleting, setDeleting] = useState<RecurringTemplate | null>(null)

  const list = templates.data ?? []
  const waiting = pending.data ?? []

  const schedule = (template: RecurringTemplate) => {
    const next = nextDueDate(template, today)
    const every = t('recurring.everyDay', { day: template.day_of_month })
    if (!template.is_active) return `${every} · ${t('recurring.paused')}`
    if (!next) return `${every} · ${t('recurring.ended')}`
    return `${every} · ${t('recurring.nextOn', { date: formatDate(next, language) })}`
  }

  return (
    <>
      <PageHeader
        title={t('nav.recurring')}
        actions={
          <Button onClick={() => setEditing({ open: true, template: null })}>
            <Plus />
            <span className="hidden sm:inline">{t('recurring.addTitle')}</span>
          </Button>
        }
      />

      <section className="mt-6 overflow-hidden rounded-(--radius-card) border bg-card" aria-labelledby="waiting">
        <div className="px-4 pt-4 pb-1 sm:px-5">
          <h2 id="waiting" className="text-base font-semibold">
            {t('recurring.waitingHeading', { count: waiting.length })}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('recurring.waitingBody')}</p>
        </div>
        {pending.isPending ? (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : waiting.length === 0 ? (
          <p className="mx-4 my-4 rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground sm:mx-5">{t('recurring.nothingWaiting')}</p>
        ) : (
          <div className="pb-2">
            <PendingOccurrenceList occurrences={waiting} />
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-(--radius-card) border bg-card" aria-labelledby="templates">
        <h2 id="templates" className="px-4 pt-4 pb-1 text-base font-semibold sm:px-5">
          {t('recurring.templatesHeading', { count: list.length })}
        </h2>
        {templates.isPending ? (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : list.length === 0 ? (
          <div className="mx-4 my-4 flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-4 sm:mx-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t('recurring.noTemplates')}</p>
            <Button variant="outline" size="sm" onClick={() => setEditing({ open: true, template: null })}>
              <Plus />
              {t('recurring.addTitle')}
            </Button>
          </div>
        ) : (
          <ul className="pb-2">
            {list.map((template) => {
              const title = templateTitle(template, lookups)
              return (
                <li key={template.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <RecordTile type={template.type} categoryId={template.category_id} lookups={lookups} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{title}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{schedule(template)}</p>
                  </div>
                  <Money
                    amount={template.amount}
                    tone={template.is_active ? template.type : 'muted'}
                    signed
                    className="hidden text-[15px] font-medium sm:inline"
                  />
                  <Switch
                    checked={template.is_active}
                    aria-label={t('recurring.activeFor', { name: title })}
                    onCheckedChange={(active) =>
                      setActive.mutate(
                        { id: template.id, active },
                        { onError: (error) => toast.error(errorMessage(error, t)) },
                      )
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={t('common.actionsFor', { name: title })}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing({ open: true, template })}>
                        <Pencil />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(template)}>
                        <Trash2 />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <TemplateDialog
        open={editing.open}
        onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
        template={editing.template}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('recurring.deleteTitle')}
        description={t('recurring.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteTemplate.mutateAsync(deleting.id)
            toast.success(t('recurring.deleted'))
          } catch (error) {
            toast.error(errorMessage(error, t))
            throw error
          }
        }}
      />
    </>
  )
}
