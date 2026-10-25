import { ArrowLeftRight } from 'lucide-react'
import { CategoryTile } from '@/features/categories/category-tile'
import type { TransactionType } from '@/lib/database'
import type { Lookups } from './lookups'

/** The Category tile of a record, or the neutral Transfer tile. */
export function RecordTile({ type, categoryId, lookups }: { type: TransactionType; categoryId: string | null; lookups: Lookups }) {
  if (type === 'transfer') {
    return (
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-transfer-soft text-transfer">
        <ArrowLeftRight className="size-[45%]" strokeWidth={1.75} />
      </span>
    )
  }
  const category = lookups.categories.get(categoryId ?? '')
  return <CategoryTile icon={category?.icon ?? 'tag'} color={category?.color ?? 'slate'} />
}
