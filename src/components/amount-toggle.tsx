import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAmountVisibility } from '@/providers/amount-visibility'

/** The eye beside one figure: shows or hides just that figure, whatever the global setting. */
export function AmountToggle({ privacyKey, name, className }: { privacyKey: string; name: string; className?: string }) {
  const { t } = useTranslation()
  const { isHidden, setItemHidden } = useAmountVisibility()
  const hidden = isHidden(privacyKey)
  const Icon = hidden ? EyeOff : Eye
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={hidden}
      aria-label={hidden ? t('privacy.showOne', { name }) : t('privacy.hideOne', { name })}
      onClick={() => setItemHidden(privacyKey, !hidden)}
      className={cn('text-muted-foreground', className)}
    >
      <Icon />
    </Button>
  )
}

/** The header eye: hides or shows every amount in the app. */
export function GlobalAmountToggle() {
  const { t } = useTranslation()
  const { globalHidden, setGlobalHidden } = useAmountVisibility()
  const Icon = globalHidden ? EyeOff : Eye
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={globalHidden}
      aria-label={globalHidden ? t('privacy.showAll') : t('privacy.hideAll')}
      onClick={() => setGlobalHidden(!globalHidden)}
      className="text-muted-foreground"
    >
      <Icon />
    </Button>
  )
}
