import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConfirmWordDialogProps {
  trigger: ReactNode
  title: string
  description: string
  word: string
  confirmLabel: string
  onConfirm: () => Promise<void>
}

/** A destructive action that only runs after the user types the confirmation word. */
export function ConfirmWordDialog({ trigger, title, description, word, confirmLabel, onConfirm }: ConfirmWordDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const matches = typed.trim().toUpperCase() === word.toUpperCase()

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTyped('')
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form
          id="confirm-word-form"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!matches) return
            setPending(true)
            try {
              await onConfirm()
              setOpen(false)
            } finally {
              setPending(false)
            }
          }}
        >
          <label htmlFor="confirm-word" className="text-sm font-medium">
            {t('settings.typeToConfirm', { word })}
          </label>
          <Input
            id="confirm-word"
            className="mt-2"
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <Button type="submit" form="confirm-word-form" variant="destructive" disabled={!matches || pending}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
