import type { ChangeEvent } from 'react'
import { capitalizeSentences } from '@/lib/text'

/** Capitalizes each sentence of a note while it is typed, keeping the caret where it was. */
export function sentenceCase(event: ChangeEvent<HTMLInputElement>) {
  const input = event.target
  const next = capitalizeSentences(input.value)
  if (next === input.value) return
  const { selectionStart, selectionEnd } = input
  input.value = next
  input.setSelectionRange(selectionStart, selectionEnd)
}
