import { describe, expect, it } from 'vitest'
import { customerSchema, customerToDbPayload, emptyCustomer } from '~/lib/validations/customer'

describe('customerSchema', () => {
  it('accepts a minimal valid customer (name only)', () => {
    const result = customerSchema.safeParse({ name: 'Sophie Hartmann' })
    expect(result.success).toBe(true)
  })

  it('requires a name', () => {
    const result = customerSchema.safeParse({ ...emptyCustomer, name: '' })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('Name is required')
  })

  it('trims whitespace-only names and rejects', () => {
    const result = customerSchema.safeParse({ ...emptyCustomer, name: '   ' })
    expect(result.success).toBe(false)
  })

  it('accepts empty strings for optional fields', () => {
    const result = customerSchema.safeParse({
      name: 'Test',
      phone: '',
      email: '',
      address: '',
      notes: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      name: 'Test',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].path).toEqual(['email'])
  })

  it('accepts a valid email', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      name: 'Test',
      email: 'valid@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an over-long name', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      name: 'x'.repeat(121),
    })
    expect(result.success).toBe(false)
  })
})

describe('customerToDbPayload', () => {
  it('trims strings and converts empty values to null', () => {
    const payload = customerToDbPayload({
      name: '  Sophie  ',
      phone: '',
      email: '  sophie@example.com  ',
      address: '',
      notes: '   ',
    })
    expect(payload).toEqual({
      name: 'Sophie',
      phone: null,
      email: 'sophie@example.com',
      address: null,
      notes: null,
    })
  })

  it('preserves non-empty values', () => {
    const payload = customerToDbPayload({
      name: 'Sophie',
      phone: '+41 79 123 45 67',
      email: 'a@b.com',
      address: 'Bahnhofstrasse 22',
      notes: 'Prefers yellow gold',
    })
    expect(payload.phone).toBe('+41 79 123 45 67')
    expect(payload.email).toBe('a@b.com')
    expect(payload.notes).toBe('Prefers yellow gold')
  })
})
