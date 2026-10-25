/** Show/hide state for amounts: one global choice and per-figure exceptions to it. */
export interface VisibilityState {
  global: boolean
  /** Only figures whose choice differs from `global` are listed. */
  items: Record<string, boolean>
}

export function isHiddenIn(state: VisibilityState, key?: string): boolean {
  return key !== undefined && key in state.items ? state.items[key] : state.global
}

/** One figure's choice; matching the global one removes the exception. */
export function withItemChoice(state: VisibilityState, key: string, hidden: boolean): VisibilityState {
  const items = { ...state.items }
  if (hidden === state.global) delete items[key]
  else items[key] = hidden
  return { ...state, items }
}

/** Switching the global mode clears the exceptions, so the header eye means "all of them". */
export function withGlobalChoice(hidden: boolean): VisibilityState {
  return { global: hidden, items: {} }
}
