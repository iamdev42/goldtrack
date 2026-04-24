import { describe, expect, it } from 'vitest'
import { cn, formatCurrency } from '~/lib/utils'

describe('cn', () => {
  it('merges plain class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('skips falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('handles Tailwind conflicts (later wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('p-2 bg-red-500', 'p-4')).toBe('bg-red-500 p-4')
  })

  it('returns empty string when given nothing meaningful', () => {
    expect(cn()).toBe('')
    expect(cn(null, undefined, false)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats small integers with two decimals', () => {
    expect(formatCurrency(85)).toBe('85.00 CHF')
  })

  it('formats zero as 0.00 CHF (not em-dash)', () => {
    expect(formatCurrency(0)).toBe('0.00 CHF')
  })

  it('formats decimals correctly', () => {
    expect(formatCurrency(1234.5)).toBe("1'234.50 CHF")
  })

  it('uses apostrophe thousand separator for millions', () => {
    expect(formatCurrency(1234567.89)).toBe("1'234'567.89 CHF")
  })

  it('accepts numeric strings', () => {
    expect(formatCurrency('85')).toBe('85.00 CHF')
    expect(formatCurrency('1234.5')).toBe("1'234.50 CHF")
  })

  it('returns em-dash for null / undefined / empty string', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency('')).toBe('—')
  })

  it('returns em-dash for non-numeric strings', () => {
    expect(formatCurrency('abc')).toBe('—')
    expect(formatCurrency('garbage')).toBe('—')
  })

  it('returns em-dash for NaN and Infinity', () => {
    expect(formatCurrency(NaN)).toBe('—')
    expect(formatCurrency(Infinity)).toBe('—')
    expect(formatCurrency(-Infinity)).toBe('—')
  })

  it('handles negative numbers', () => {
    expect(formatCurrency(-450)).toBe('-450.00 CHF')
  })
})
