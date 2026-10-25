/** Budget Status in a Cycle (GLOSSARY.md): Safe < 80%, Running Low 80–100%, Over > 100%. */
export type BudgetStatus = 'safe' | 'running_low' | 'over'

const RUNNING_LOW_FROM = 0.8

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return 'over'
  if (spent >= limit * RUNNING_LOW_FROM) return 'running_low'
  return 'safe'
}
