import { LanguageSwitch } from './language-switch'
import { NotificationBell } from './notification-bell'
import { ThemeToggle } from './theme-toggle'
import { GlobalAmountToggle } from '@/components/amount-toggle'

/** `notifications` marks the signed-in app: it adds the bell and the hide-amounts eye. */
export function HeaderUtilities({ notifications = true }: { notifications?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {notifications && <GlobalAmountToggle />}
      {notifications && <NotificationBell />}
      <LanguageSwitch />
      <ThemeToggle />
    </div>
  )
}
