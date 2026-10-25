import { Languages } from 'lucide-react'
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
import { isLanguage, LANGUAGES } from '@/i18n'
import { usePreferences } from '@/features/profile/use-preferences'

export function LanguageSwitch() {
  const { t } = useTranslation()
  const { language, setLanguage } = usePreferences()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('header.language')} className="text-muted-foreground">
          <Languages />
          <span className="text-foreground uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t('header.language')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={language} onValueChange={(value) => isLanguage(value) && setLanguage(value)}>
          {LANGUAGES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {t(`languages.${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
