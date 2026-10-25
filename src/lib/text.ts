/**
 * Upper-cases the first letter of each sentence: at the start of the text and after ".", "!" or
 * "?" followed by a space. Everything else stays as typed ("GoPay", "12.500"). Never changes the
 * length, so a caret position stays valid.
 */
export function capitalizeSentences(text: string): string {
  return text.replace(/(^\s*|[.!?]\s+)(\p{Ll})/gu, (_, before: string, letter: string) => before + letter.toUpperCase())
}
