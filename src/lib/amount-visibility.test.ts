import { describe, expect, it } from 'vitest'
import { isHiddenIn, withGlobalChoice, withItemChoice } from './amount-visibility'

describe('amount visibility', () => {
  it('follows the global choice when a figure has none of its own', () => {
    expect(isHiddenIn(withGlobalChoice(true), 'summary')).toBe(true)
    expect(isHiddenIn(withGlobalChoice(false))).toBe(false)
  })

  it('lets one figure differ from the global choice', () => {
    const hiddenSummary = withItemChoice(withGlobalChoice(false), 'summary', true)
    expect(isHiddenIn(hiddenSummary, 'summary')).toBe(true)
    expect(isHiddenIn(hiddenSummary, 'account:a1')).toBe(false)

    const shownAccount = withItemChoice(withGlobalChoice(true), 'account:a1', false)
    expect(isHiddenIn(shownAccount, 'account:a1')).toBe(false)
    expect(isHiddenIn(shownAccount)).toBe(true)
  })

  it('drops an exception that matches the global choice again', () => {
    const state = withItemChoice(withItemChoice(withGlobalChoice(false), 'summary', true), 'summary', false)
    expect(state.items).toEqual({})
  })

  it('clears every exception when the global choice changes', () => {
    const state = withItemChoice(withGlobalChoice(false), 'summary', true)
    expect(withGlobalChoice(true)).toEqual({ global: true, items: {} })
    expect(isHiddenIn(state, 'summary')).toBe(true)
  })
})
