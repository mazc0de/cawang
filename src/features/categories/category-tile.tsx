import { Tag } from 'lucide-react'
import { CATEGORY_ICONS } from '@/lib/category-icons'
import { categoryColorClass } from '@/lib/palette'
import { cn } from '@/lib/utils'

/** The Category's icon on a pale tile of its own colour (taste-skill pastel-consumer). */
export function CategoryTile({ icon, color, className }: { icon: string; color: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] ?? Tag
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-[10px]', categoryColorClass(color), className)}
    >
      <Icon className="size-[45%]" strokeWidth={1.75} />
    </span>
  )
}
