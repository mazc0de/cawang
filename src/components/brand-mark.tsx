import { cn } from '@/lib/utils'

/**
 * The C of Cawang holding two rising candlesticks: money tracked over time. Drawn for Cawang on a
 * 24-unit grid, not taken from an icon set.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-ink', className)}
    >
      <svg viewBox="0 0 24 24" className="size-[86%]" fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M17.54 19.09A9 9 0 1 1 17.54 4.91" strokeWidth="2.6" />
        <path d="M10.2 9v7.2M14.6 6.8v9.6" strokeWidth="1.4" />
        <rect x="8.8" y="10.6" width="2.8" height="4" rx="1" fill="currentColor" stroke="none" />
        <rect x="13.2" y="8.4" width="2.8" height="5.8" rx="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-tight', className)}>
      <BrandMark />
      Cawang
    </span>
  )
}
