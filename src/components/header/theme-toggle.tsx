import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePreferences } from '@/features/profile/use-preferences'
import type { ThemePreference } from '@/lib/database'

export const THEME_OPTIONS = [
  { value: 'system', icon: Monitor, label: 'header.themeSystem' },
  { value: 'light', icon: Sun, label: 'header.themeLight' },
  { value: 'dark', icon: Moon, label: 'header.themeDark' },
] as const satisfies ReadonlyArray<{ value: ThemePreference; icon: unknown; label: string }>

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = usePreferences()
  const Icon = THEME_OPTIONS.find((option) => option.value === theme)?.icon ?? Monitor
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('header.theme')} className="text-muted-foreground">
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{t('header.theme')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon />
              {t(option.label)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
