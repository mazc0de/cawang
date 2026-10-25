import { Download } from 'lucide-react'
import { DatePicker } from '@/components/date-picker'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useLookups } from '@/features/transactions/lookups'
import { currentLanguage } from '@/i18n'
import type { Cycle } from '@/lib/cycle'
import type { Transaction } from '@/lib/database'
import { addDays, zonedParts, zonedTimestamp } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatCycleRange } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { downloadText, toCsv } from './csv'

type Range = 'cycle' | 'custom'

/** Export CSV: the shown Cycle or a custom date range, one row per Transaction. */
export function ExportDialog({ cycle, timezone }: { cycle: Cycle; timezone: string }) {
  const { t } = useTranslation()
  const lookups = useLookups()
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<Range>('cycle')
  const [from, setFrom] = useState(cycle.start)
  const [to, setTo] = useState(cycle.end)
  const [pending, setPending] = useState(false)
  const start = range === 'cycle' ? cycle.start : from
  const end = range === 'cycle' ? cycle.end : to
  const valid = Boolean(start && end) && start <= end

  const run = async () => {
    setPending(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('occurred_at', zonedTimestamp(start, '00:00', timezone))
        .lt('occurred_at', zonedTimestamp(addDays(end, 1), '00:00', timezone))
        .order('occurred_at')
      if (error) throw error
      const rows = (data as Transaction[]).map((row) => {
        const { date, time } = zonedParts(row.occurred_at, timezone)
        return [
          date,
          time,
          t(`transactionTypes.${row.type}`),
          row.category_id ? (lookups.categories.get(row.category_id)?.name ?? '') : '',
          lookups.accounts.get(row.account_id)?.name ?? '',
          row.to_account_id ? (lookups.accounts.get(row.to_account_id)?.name ?? '') : '',
          row.amount,
          row.note ?? '',
        ]
      })
      const header = [
        t('transactions.date'),
        t('transactions.time'),
        t('transactions.type'),
        t('transactions.category'),
        t('transactions.account'),
        t('transactions.toAccount'),
        t('transactions.amount'),
        t('transactions.note'),
      ]
      downloadText(`cawang-${start}_${end}.csv`, toCsv(header, rows))
      toast.success(t('export.done', { count: rows.length }))
      setOpen(false)
    } catch (error) {
      toast.error(errorMessage(error, t))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label={t('export.title')}>
          <Download />
          <span className="hidden sm:inline">{t('export.title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('export.title')}</DialogTitle>
          <DialogDescription>{t('export.description')}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <SegmentedControl<Range>
            label={t('export.range')}
            value={range}
            onChange={setRange}
            className="w-full"
            options={[
              { value: 'cycle', label: t('export.cycle') },
              { value: 'custom', label: t('export.custom') },
            ]}
          />
          {range === 'cycle' ? (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm">{formatCycleRange(cycle, currentLanguage())}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="export-from">{t('export.from')}</FieldLabel>
                <DatePicker id="export-from" max={to || undefined} value={from} onChange={setFrom} />
              </Field>
              <Field data-invalid={!valid}>
                <FieldLabel htmlFor="export-to">{t('export.to')}</FieldLabel>
                <DatePicker id="export-to" min={from || undefined} value={to} onChange={setTo} />
              </Field>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{t('export.columns')}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={run} disabled={!valid || pending}>
              <Download />
              {t('export.download')}
            </Button>
          </div>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}
