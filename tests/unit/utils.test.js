import { describe, expect, it } from 'vitest'
import { cn } from '~/lib/utils'

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
