/**
 * Category colours as palette keys (stored in categories.color). Each is a pale tile with the
 * dark of its own hue as ink (taste-skill pastel-consumer), with a dark-mode pair. No violet
 * or indigo; amber is kept for Locked Funds, so categories do not use it.
 */
export const CATEGORY_COLORS = {
  blue: 'bg-[#dcebff] text-[#0a3a80] dark:bg-[#15243b] dark:text-[#a9c8ff]',
  sky: 'bg-[#d9f2fb] text-[#064a63] dark:bg-[#10282f] dark:text-[#8fd6ee]',
  teal: 'bg-[#d5f3ee] text-[#0c4a42] dark:bg-[#102a26] dark:text-[#86dccb]',
  green: 'bg-[#dcf5e3] text-[#14532d] dark:bg-[#13281a] dark:text-[#8ddba6]',
  lime: 'bg-[#e8f5cf] text-[#3a5108] dark:bg-[#1f2711] dark:text-[#bfe17a]',
  orange: 'bg-[#ffe7d6] text-[#7a2e0a] dark:bg-[#2e1c12] dark:text-[#ffb488]',
  rose: 'bg-[#ffe1e7] text-[#7f1734] dark:bg-[#2e161c] dark:text-[#ff9fb4]',
  pink: 'bg-[#fbe0f1] text-[#76134f] dark:bg-[#2b1524] dark:text-[#f5a0d2]',
  brown: 'bg-[#f1e6dc] text-[#5a3a20] dark:bg-[#26201a] dark:text-[#d9b99a]',
  slate: 'bg-[#e8ecf0] text-[#33404d] dark:bg-[#1f2328] dark:text-[#b7c2cc]',
} as const

export type CategoryColor = keyof typeof CATEGORY_COLORS

export function categoryColorClass(color: string): string {
  return CATEGORY_COLORS[color as CategoryColor] ?? CATEGORY_COLORS.slate
}

/** Mid-tone of each palette hue for chart marks (a slice, a legend dot), readable on light and dark. */
export const CATEGORY_CHART_COLORS: Record<CategoryColor, string> = {
  blue: '#2f6fdb',
  sky: '#1694c9',
  teal: '#149384',
  green: '#2f9e58',
  lime: '#6f9a12',
  orange: '#e0731f',
  rose: '#d6456a',
  pink: '#c24597',
  brown: '#9a6a43',
  slate: '#6b7785',
}

export function categoryChartColor(color: string): string {
  return CATEGORY_CHART_COLORS[color as CategoryColor] ?? CATEGORY_CHART_COLORS.slate
}
