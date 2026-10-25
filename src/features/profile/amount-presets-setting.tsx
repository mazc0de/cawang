import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '@/components/amount-input'
import { Button } from '@/components/ui/button'
import { DEFAULT_AMOUNT_PRESETS, MAX_AMOUNT_PRESETS, normalizePresets, presetsOf } from '@/lib/amount-presets'
import type { Profile } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { formatIDR } from '@/lib/format'
import { useUpdateProfile } from './queries'

/** Settings' amount templates: add, remove, or go back to the defaults. Each change saves itself. */
export function AmountPresetsSetting({ profile }: { profile: Profile }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const [draft, setDraft] = useState<number | null>(null)
  const presets = presetsOf(profile)
  const full = presets.length >= MAX_AMOUNT_PRESETS

  const save = (next: number[], onSaved?: () => void) =>
    updateProfile.mutate(
      { amount_presets: normalizePresets(next) },
      {
        onSuccess: () => {
          toast.success(t('common.saved'), { id: 'settings-saved' })
          onSaved?.()
        },
        onError: (error) => toast.error(errorMessage(error, t)),
      },
    )

  return (
    <div className="flex flex-col gap-4">
      {presets.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t('amountPresets.label')}>
          {presets.map((preset) => (
            <li key={preset} className="num inline-flex h-9 items-center gap-1 rounded-full border bg-card pr-1 pl-3.5 text-sm font-medium">
              {formatIDR(preset)}
              <button
                type="button"
                aria-label={t('amountPresets.remove', { amount: formatIDR(preset) })}
                onClick={() => save(presets.filter((amount) => amount !== preset))}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">{t('amountPresets.empty')}</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft || draft <= 0 || full) return
          save([...presets, draft], () => setDraft(null))
        }}
      >
        <div className="flex-1">
          <AmountInput aria-label={t('amountPresets.newLabel')} value={draft} onChange={setDraft} disabled={full} />
        </div>
        <Button type="submit" variant="outline" disabled={full || !draft || draft <= 0 || updateProfile.isPending}>
          <Plus />
          {t('amountPresets.addButton')}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{full ? t('amountPresets.full', { max: MAX_AMOUNT_PRESETS }) : t('amountPresets.hint', { max: MAX_AMOUNT_PRESETS })}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => save(DEFAULT_AMOUNT_PRESETS)}>
          {t('amountPresets.restore')}
        </Button>
      </div>
    </div>
  )
}
