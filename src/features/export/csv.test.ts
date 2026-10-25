import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('starts with a BOM, joins with commas and ends lines with CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a,b\r\n1,x\r\n')
  })

  it('quotes fields that hold commas, quotes or line breaks', () => {
    expect(toCsv(['note'], [['Makan, minum'], ['dia bilang "oke"'], ['baris\nbaru']])).toBe(
      '﻿note\r\n"Makan, minum"\r\n"dia bilang ""oke"""\r\n"baris\nbaru"\r\n',
    )
  })
})
