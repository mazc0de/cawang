import { Delete } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { evaluateAmount } from '@/lib/calculator'
import { formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '000', ',', '+'] as const
const OPERATORS = new Set(['÷', '×', '−', '+'])

/** A keypad calculator beside the amount field; "Use result" copies the answer into it. */
export function CalculatorPad({ onUse, className }: { onUse: (amount: number) => void; className?: string }) {
  const { t } = useTranslation()
  const [expression, setExpression] = useState('')
  const result = evaluateAmount(expression)

  const press = (key: string) => setExpression((current) => current + key)

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl bg-muted p-3', className)}>
      <div className="min-h-[60px] rounded-lg bg-card px-3 py-2 text-right" aria-live="polite">
        <p className="num min-h-5 truncate text-sm text-muted-foreground">{expression || '0'}</p>
        {result !== null ? (
          <p className="num text-xl font-semibold">{formatIDR(result)}</p>
        ) : (
          <p className="num text-xl font-semibold text-muted-foreground">{expression ? '…' : formatIDR(0)}</p>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <button type="button" onClick={() => setExpression('')} className="calc-key text-expense">
          C
        </button>
        <button type="button" onClick={() => press('(')} className="calc-key">
          (
        </button>
        <button type="button" onClick={() => press(')')} className="calc-key">
          )
        </button>
        <button
          type="button"
          aria-label={t('transactions.calculatorBackspace')}
          onClick={() => setExpression((current) => current.slice(0, -1))}
          className="calc-key"
        >
          <Delete className="mx-auto size-4" />
        </button>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className={cn('calc-key', OPERATORS.has(key) && 'text-lg font-semibold text-brand')}
          >
            {key}
          </button>
        ))}
      </div>
      <Button type="button" variant="outline" disabled={result === null || result <= 0} onClick={() => result && onUse(result)}>
        {t('transactions.useResult')}
      </Button>
    </div>
  )
}
