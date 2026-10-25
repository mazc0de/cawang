import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { Language } from '@/i18n'
import { isHiddenIn, type VisibilityState, withGlobalChoice, withItemChoice } from '@/lib/amount-visibility'
import { formatCompact, formatIDR } from '@/lib/format'

const STORAGE_KEY = 'cawang-amount-visibility'

/** What a hidden amount shows instead of its digits. */
export const MASK = '••••••'

/** Keys are figures such as "summary" or "account:<id>". */
type Stored = VisibilityState

interface AmountVisibility {
  globalHidden: boolean
  setGlobalHidden: (hidden: boolean) => void
  /** Whether an amount is hidden: its own choice if it has one, else the global one. */
  isHidden: (key?: string) => boolean
  setItemHidden: (key: string, hidden: boolean) => void
}

function readStored(): Stored {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Stored | null
    if (parsed && typeof parsed.global === 'boolean' && parsed.items) return parsed
  } catch {
    // Unreadable or blocked storage: start with everything visible.
  }
  return { global: false, items: {} }
}

const AmountVisibilityContext = createContext<AmountVisibility | null>(null)

/**
 * Show/hide amounts, globally and per figure. Kept on this device only: hiding is about who can
 * see this screen, not about the account.
 */
export function AmountVisibilityProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored>(readStored)

  const save = useCallback((update: (current: Stored) => Stored) => {
    setStored((current) => {
      const next = update(current)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Not persisted; the choice still holds for this visit.
      }
      return next
    })
  }, [])

  const value = useMemo<AmountVisibility>(
    () => ({
      globalHidden: stored.global,
      setGlobalHidden: (hidden) => save(() => withGlobalChoice(hidden)),
      isHidden: (key) => isHiddenIn(stored, key),
      setItemHidden: (key, hidden) => save((current) => withItemChoice(current, key, hidden)),
    }),
    [stored, save],
  )

  return <AmountVisibilityContext.Provider value={value}>{children}</AmountVisibilityContext.Provider>
}

const alwaysVisible: AmountVisibility = {
  globalHidden: false,
  setGlobalHidden: () => {},
  isHidden: () => false,
  setItemHidden: () => {},
}

/** Sample money on public pages (landing, sign-in) is never hidden. */
export function AlwaysShowAmounts({ children }: { children: ReactNode }) {
  return <AmountVisibilityContext.Provider value={alwaysVisible}>{children}</AmountVisibilityContext.Provider>
}

export function useAmountVisibility(): AmountVisibility {
  return useContext(AmountVisibilityContext) ?? alwaysVisible
}

/** Formatters for read-only text that respect hiding; amount inputs keep using the plain ones. */
export function useMaskedFormat(key?: string) {
  const { isHidden } = useAmountVisibility()
  const hidden = isHidden(key)
  return {
    hidden,
    formatIDR: (amount: number) => (hidden ? `Rp ${MASK}` : formatIDR(amount)),
    formatCompact: (amount: number, language: Language) => (hidden ? '•••' : formatCompact(amount, language)),
  }
}
