import { Bell, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Money } from '@/components/money'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDismissNotification, useNotifications } from '@/features/notifications/queries'
import { templateTitle } from '@/features/recurring/pending-list'
import { useLookups } from '@/features/transactions/lookups'
import { currentLanguage } from '@/i18n'
import { diffInDays } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useMaskedFormat } from '@/providers/amount-visibility'

const PER_GROUP = 3

function Group({ title, to, more, onNavigate, children }: { title: string; to: string; more: number; onNavigate: () => void; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="border-t px-4 py-3 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <Link to={to} onClick={onNavigate} className="text-[13px] text-muted-foreground hover:text-foreground">
          {more > 0 ? t('notifications.viewMore', { count: more }) : t('notifications.open')}
        </Link>
      </div>
      <ul className="mt-1.5 flex flex-col gap-1.5">{children}</ul>
    </section>
  )
}

/** Due Recurring Occurrences, Safe-Pays at their Due Date and Budget alerts, with a count badge. */
export function NotificationBell() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const lookups = useLookups()
  const { recurring, safePaysDue, budgetAlerts, count, today } = useNotifications()
  const dismiss = useDismissNotification()
  const masked = useMaskedFormat()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={count ? t('notifications.labelWithCount', { count }) : t('header.notifications')}
          className="relative text-muted-foreground"
        >
          <Bell />
          {count > 0 && (
            <span className="num absolute top-1.5 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-expense px-1 text-[11px] leading-none font-semibold text-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0" onOpenAutoFocus={(event) => event.preventDefault()}>
        <p className="px-4 pt-3 pb-2 text-sm font-semibold">{t('header.notifications')}</p>
        {count === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{t('header.notificationsEmpty')}</p>
        ) : (
          <div className="max-h-[70svh] overflow-y-auto">
            {recurring.length > 0 && (
              <Group title={t('notifications.recurringDue', { count: recurring.length })} to="/recurring" more={recurring.length - PER_GROUP} onNavigate={close}>
                {recurring.slice(0, PER_GROUP).map((occurrence) => (
                  <li key={`${occurrence.template.id}-${occurrence.period}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      {templateTitle(occurrence.template, lookups)}
                      <span className="text-muted-foreground"> · {formatDate(occurrence.dueDate, language)}</span>
                    </span>
                    <Money amount={occurrence.template.amount} tone={occurrence.template.type} />
                  </li>
                ))}
              </Group>
            )}
            {safePaysDue.length > 0 && (
              <Group title={t('notifications.safePayDue', { count: safePaysDue.length })} to="/safe-pay" more={safePaysDue.length - PER_GROUP} onNavigate={close}>
                {safePaysDue.slice(0, PER_GROUP).map((item) => {
                  const late = diffInDays(today, item.due_date!)
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {item.note || lookups.categories.get(item.category_id)?.name}
                        <span className={late > 0 ? 'text-expense' : 'text-locked'}>
                          {' · '}
                          {late > 0 ? t('safePay.overdue', { count: late }) : t('safePay.dueToday')}
                        </span>
                      </span>
                      <Money amount={item.amount} tone="locked" />
                    </li>
                  )
                })}
              </Group>
            )}
            {budgetAlerts.length > 0 && (
              <Group title={t('notifications.budget', { count: budgetAlerts.length })} to="/budgets" more={0} onNavigate={close}>
                {budgetAlerts.map((alert) => (
                  <li key={alert.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {alert.category?.name}
                      <span className={alert.status === 'over' ? 'text-expense' : 'text-locked'}>
                        {' · '}
                        {alert.status === 'over'
                          ? t('budgets.overBy', { amount: masked.formatIDR(alert.spent - alert.budget.amount) })
                          : t('budgets.usedPercent', { percent: Math.round((alert.spent / alert.budget.amount) * 100) })}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      aria-label={t('notifications.dismiss')}
                      onClick={() => dismiss.mutate(alert.key, { onError: (error) => toast.error(errorMessage(error, t)) })}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </Group>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
