import { useId } from 'react'
import type { BudgetStatus } from '@/lib/budget'
import { cn } from '@/lib/utils'

const fillClass: Record<BudgetStatus, string> = {
  safe: 'fill-brand',
  running_low: 'fill-caution',
  over: 'fill-expense',
}

interface PlanBarProps {
  limit: number
  spent: number
  /** Pending Safe-Pays: drawn after the spent part as an amber hatch, not counted as spent. */
  pending: number
  status: BudgetStatus
  className?: string
}

/** A track as long as the Budget, the spent part filled, pending Safe-Pays hatched after it. */
export function PlanBar({ limit, spent, pending, status, className }: PlanBarProps) {
  const patternId = useId()
  const spentRatio = limit > 0 ? Math.min(spent / limit, 1) : spent > 0 ? 1 : 0
  const pendingRatio = limit > 0 ? Math.min(pending / limit, 1 - spentRatio) : 0
  return (
    <div className={cn('h-2.5 overflow-hidden rounded-full bg-muted', className)} role="presentation">
      <svg className="block h-full w-full" aria-hidden="true">
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="fill-locked-soft" />
            <rect width="2.5" height="6" className="fill-locked" />
          </pattern>
        </defs>
        {spentRatio > 0 && <rect x="0" y="0" width={`${spentRatio * 100}%`} height="100%" className={fillClass[status]} />}
        {pendingRatio > 0 && (
          <rect x={`${spentRatio * 100}%`} y="0" width={`${pendingRatio * 100}%`} height="100%" fill={`url(#${CSS.escape(patternId)})`} />
        )}
      </svg>
    </div>
  )
}

/** The legend swatch for the hatched pending segment, drawn from the same pattern. */
export function PendingSwatch() {
  const patternId = useId()
  return (
    <svg className="inline-block size-3 shrink-0 rounded-[3px]" aria-hidden="true">
      <defs>
        <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" className="fill-locked-soft" />
          <rect width="2.5" height="6" className="fill-locked" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${CSS.escape(patternId)})`} />
    </svg>
  )
}
