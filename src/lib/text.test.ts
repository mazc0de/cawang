import { describe, expect, it } from 'vitest'
import { capitalizeSentences } from './text'

describe('capitalizeSentences', () => {
  it('capitalizes the first letter of the note', () => {
    expect(capitalizeSentences('makan siang')).toBe('Makan siang')
    expect(capitalizeSentences('  kopi susu')).toBe('  Kopi susu')
  })

  it('capitalizes the first letter after a full stop, question mark or exclamation mark', () => {
    expect(capitalizeSentences('bayar kos. sisanya ditabung')).toBe('Bayar kos. Sisanya ditabung')
    expect(capitalizeSentences('lunas? belum! cek lagi')).toBe('Lunas? Belum! Cek lagi')
  })

  it('leaves everything else as typed', () => {
    expect(capitalizeSentences('Top up GoPay via BCA')).toBe('Top up GoPay via BCA')
    expect(capitalizeSentences('harga 12.500 per porsi')).toBe('Harga 12.500 per porsi')
    expect(capitalizeSentences('3 porsi bakso')).toBe('3 porsi bakso')
    expect(capitalizeSentences('')).toBe('')
  })
})
