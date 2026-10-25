import { CalendarDays, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { enUS, id as idLocale } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { currentLanguage } from '@/i18n'
import { type IsoDate, isoDateToLocalDate, toIsoDate } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function fromLocalDate(date: Date): IsoDate {
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

interface CalendarPopoverProps {
  value: IsoDate | ''
  onChange: (value: IsoDate) => void
  min?: IsoDate
  max?: IsoDate
  open: boolean
  onOpenChange: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

/** The app's own month calendar in a popover (Monday first, in the app language), around any trigger. */
export function CalendarPopover({ value, onChange, min, max, open, onOpenChange, align = 'start', children }: CalendarPopoverProps) {
  const language = currentLanguage()
  const selected = value ? isoDateToLocalDate(value) : undefined
  const disabled = [
    ...(min ? [{ before: isoDateToLocalDate(min) }] : []),
    ...(max ? [{ after: isoDateToLocalDate(max) }] : []),
  ]
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {/* The calendar focuses the selected day itself (autoFocus), so the popover must not move focus first. */}
      <PopoverContent align={align} className="w-auto p-0" onOpenAutoFocus={(event) => event.preventDefault()}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? (max ? isoDateToLocalDate(max) : undefined)}
          onSelect={(date) => {
            if (!date) return
            onChange(fromLocalDate(date))
            onOpenChange(false)
          }}
          disabled={disabled}
          startMonth={min ? isoDateToLocalDate(min) : undefined}
          endMonth={max ? isoDateToLocalDate(max) : undefined}
          locale={language === 'id' ? idLocale : enUS}
          weekStartsOn={1}
          autoFocus
          className="[--cell-size:--spacing(10)]"
        />
      </PopoverContent>
    </Popover>
  )
}

interface DatePickerProps {
  id?: string
  value: IsoDate | ''
  onChange: (value: IsoDate | '') => void
  min?: IsoDate
  max?: IsoDate
  placeholder?: string
  /** Optional dates get a clear button. */
  clearable?: boolean
  invalid?: boolean
  size?: 'default' | 'sm'
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

/** A date field that opens the app's calendar instead of the browser's own picker. */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
  clearable = false,
  invalid = false,
  size = 'default',
  className,
  ...aria
}: DatePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('relative', className)}>
      <CalendarPopover value={value} onChange={onChange} min={min} max={max} open={open} onOpenChange={setOpen}>
        <button
          id={id}
          type="button"
          aria-invalid={invalid}
          aria-haspopup="dialog"
          {...aria}
          className={cn(
            'flex w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
            size === 'sm' ? 'h-9 px-2.5 text-sm' : 'h-10 px-3 text-base md:text-sm',
            clearable && value && 'pr-9',
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('num truncate', !value && 'text-muted-foreground')}>
            {value ? formatDate(value, currentLanguage()) : (placeholder ?? t('datePicker.choose'))}
          </span>
        </button>
      </CalendarPopover>
      {clearable && value && (
        <button
          type="button"
          aria-label={t('datePicker.clear')}
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
