import { type ComponentProps, useState } from 'react'
import { Input } from '@/components/ui/input'
import { isExpression, parseAmountInput } from '@/lib/calculator'
import { formatIDR, formatThousands } from '@/lib/format'
import { cn } from '@/lib/utils'

const MAX_AMOUNT = 999_999_999_999_999

function toText(value: number | null): string {
  if (value === null) return ''
  return `${value < 0 ? '-' : ''}${formatThousands(Math.abs(value))}`
}

function read(text: string, allowNegative: boolean): number | null {
  const amount = parseAmountInput(text)
  if (amount === null || Math.abs(amount) > MAX_AMOUNT) return null
  return !allowNegative && amount < 0 ? null : amount
}

interface AmountInputProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: number | null
  onChange: (value: number | null) => void
  allowNegative?: boolean
}

/**
 * Rupiah amount field. Plain digits are shown with thousands dots ("1.250.000"); an expression
 * ("25000+12500") is kept as typed with its result beside it, and settles to the result on blur.
 */
export function AmountInput({ value, onChange, allowNegative = false, className, onBlur, ...props }: AmountInputProps) {
  const [text, setText] = useState(() => toText(value))
  const [seenValue, setSeenValue] = useState(value)

  // Follow outside changes (a form reset, the calculator) without fighting the user's typing.
  if (value !== seenValue) {
    setSeenValue(value)
    if (read(text, allowNegative) !== value) setText(toText(value))
  }

  const expression = isExpression(text)
  const preview = expression ? read(text, allowNegative) : null

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        {...props}
        type="text"
        inputMode={allowNegative ? 'text' : 'decimal'}
        autoComplete="off"
        className={cn('num pl-10', preview !== null && 'pr-32', className)}
        value={text}
        onChange={(event) => {
          const raw = event.target.value
          const amount = read(raw, allowNegative)
          const plainNumber = !isExpression(raw) && /\d/.test(raw)
          setText(plainNumber && amount !== null ? toText(amount) : raw)
          setSeenValue(amount)
          onChange(amount)
        }}
        onBlur={(event) => {
          if (expression && preview !== null) setText(toText(preview))
          onBlur?.(event)
        }}
      />
      {preview !== null && (
        <span
          aria-live="polite"
          className="num pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
        >
          = {formatIDR(preview)}
        </span>
      )}
    </div>
  )
}
