import { describe, expect, it } from 'vitest'
import { evaluateAmount, isExpression, parseAmountInput } from './calculator'

describe('evaluateAmount', () => {
  it('reads plain amounts, with or without thousands dots', () => {
    expect(evaluateAmount('37500')).toBe(37500)
    expect(evaluateAmount('1.250.000')).toBe(1250000)
    expect(evaluateAmount('  12.500 ')).toBe(12500)
  })

  it('adds, subtracts, multiplies and divides', () => {
    expect(evaluateAmount('25000+12500')).toBe(37500)
    expect(evaluateAmount('25.000 + 12.500')).toBe(37500)
    expect(evaluateAmount('100000-15000')).toBe(85000)
    expect(evaluateAmount('15000*3')).toBe(45000)
    expect(evaluateAmount('90000/4')).toBe(22500)
  })

  it('accepts the symbols a phone keyboard or the calculator types', () => {
    expect(evaluateAmount('15.000×3')).toBe(45000)
    expect(evaluateAmount('15.000x3')).toBe(45000)
    expect(evaluateAmount('90.000÷4')).toBe(22500)
    expect(evaluateAmount('100.000−15.000')).toBe(85000)
  })

  it('follows precedence and parentheses', () => {
    expect(evaluateAmount('10000+5000*2')).toBe(20000)
    expect(evaluateAmount('(10000+5000)*2')).toBe(30000)
    expect(evaluateAmount('-5000+20000')).toBe(15000)
  })

  it('uses a comma as the decimal mark and rounds to whole rupiah', () => {
    expect(evaluateAmount('2,5*10000')).toBe(25000)
    expect(evaluateAmount('100000/3')).toBe(33333)
    expect(evaluateAmount('10,5')).toBe(11)
  })

  it('returns null for anything that is not a complete expression', () => {
    expect(evaluateAmount('')).toBeNull()
    expect(evaluateAmount('25000+')).toBeNull()
    expect(evaluateAmount('abc')).toBeNull()
    expect(evaluateAmount('1.5')).toBeNull()
    expect(evaluateAmount('(1000')).toBeNull()
    expect(evaluateAmount('1000/0')).toBeNull()
    expect(evaluateAmount('1000)')).toBeNull()
  })
})

describe('isExpression', () => {
  it('is true only when there is something to calculate', () => {
    expect(isExpression('25000+12500')).toBe(true)
    expect(isExpression('(5000)')).toBe(true)
    expect(isExpression('1.250.000')).toBe(false)
    expect(isExpression('-5000')).toBe(false)
  })
})

describe('parseAmountInput', () => {
  it('reads digits typed into a field that is reformatting them with thousands dots', () => {
    expect(parseAmountInput('1.8000')).toBe(18000)
    expect(parseAmountInput('18.000')).toBe(18000)
    expect(parseAmountInput('1.800.0')).toBe(18000)
    expect(parseAmountInput('1.250.0000')).toBe(12500000)
  })

  it('accepts a pasted "Rp" prefix and spaces', () => {
    expect(parseAmountInput('Rp 18.000')).toBe(18000)
    expect(parseAmountInput(' rp1.500.000 ')).toBe(1500000)
  })

  it('still evaluates sums and keeps negatives', () => {
    expect(parseAmountInput('25.000+12.500')).toBe(37500)
    expect(parseAmountInput('-5.000')).toBe(-5000)
  })

  it('is null when there is no amount', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('Rp')).toBeNull()
    expect(parseAmountInput('25.000+')).toBeNull()
  })
})
