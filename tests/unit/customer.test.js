import { describe, expect, it } from 'vitest'
import {
  customerSchema,
  customerToDbPayload,
  buildDisplayName,
  buildAddress,
  emptyCustomer,
} from '~/lib/validations/customer'

describe('customerSchema', () => {
  it('accepts a customer with first + last name only', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      first_name: 'Sophie',
      last_name: 'Hartmann',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a customer with last name only (legacy single-name entries)', () => {
    const result = customerSchema.safeParse({ ...emptyCustomer, last_name: 'Aemisegger' })
    expect(result.success).toBe(true)
  })

  it('accepts a customer with company only (no person name)', () => {
    const result = customerSchema.safeParse({ ...emptyCustomer, company: 'Taylor & Co Jewellery' })
    expect(result.success).toBe(true)
  })

  it('rejects a customer with no name at all', () => {
    const result = customerSchema.safeParse(emptyCustomer)
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('Enter a first name, last name or company')
  })

  it('rejects whitespace-only names (no trim trick to bypass validation)', () => {
    const result = customerSchema.safeParse({
      first_name: '   ',
      last_name: '  ',
      company: '   ',
      phone: '',
      email: '',
      street: '',
      postcode: '',
      city: '',
      country: '',
      notes: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty strings for all optional fields', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      first_name: 'Test',
      last_name: 'User',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      first_name: 'Test',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].path).toEqual(['email'])
  })

  it('accepts a valid email', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      first_name: 'Test',
      email: 'valid@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an over-long first name', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomer,
      first_name: 'x'.repeat(81),
      last_name: 'Y',
    })
    expect(result.success).toBe(false)
  })
})

describe('buildDisplayName', () => {
  it('combines first + last', () => {
    expect(buildDisplayName({ first_name: 'Sophie', last_name: 'Hartmann' })).toBe(
      'Sophie Hartmann'
    )
  })
  it('falls back to last only', () => {
    expect(buildDisplayName({ first_name: '', last_name: 'Aemisegger' })).toBe('Aemisegger')
  })
  it('falls back to company when no person name', () => {
    expect(buildDisplayName({ first_name: '', last_name: '', company: 'Atelier' })).toBe('Atelier')
  })
  it('falls back to "Unknown" as a last resort', () => {
    expect(buildDisplayName({ first_name: '', last_name: '', company: '' })).toBe('Unknown')
  })
})

describe('buildAddress', () => {
  it('joins all four parts with comma + space', () => {
    expect(
      buildAddress({
        street: 'Bahnhofstr. 22',
        postcode: '8001',
        city: 'Zürich',
        country: 'Switzerland',
      })
    ).toBe('Bahnhofstr. 22, 8001, Zürich, Switzerland')
  })
  it('skips empty parts', () => {
    expect(buildAddress({ street: 'X', postcode: '', city: 'Bern', country: 'Switzerland' })).toBe(
      'X, Bern, Switzerland'
    )
  })
  it('returns null if everything is empty', () => {
    expect(buildAddress({ street: '', postcode: '', city: '', country: '' })).toBeNull()
  })
})

describe('customerToDbPayload', () => {
  it('trims strings and converts empty values to null', () => {
    const payload = customerToDbPayload({
      first_name: '  Sophie  ',
      last_name: '  Hartmann  ',
      company: '',
      phone: '',
      email: '  sophie@example.com  ',
      street: '   ',
      postcode: '',
      city: '',
      country: '',
      notes: '   ',
    })
    expect(payload.first_name).toBe('Sophie')
    expect(payload.last_name).toBe('Hartmann')
    expect(payload.email).toBe('sophie@example.com')
    expect(payload.phone).toBeNull()
    expect(payload.street).toBeNull()
    expect(payload.notes).toBeNull()
  })

  it('derives name from first + last', () => {
    const payload = customerToDbPayload({
      ...emptyCustomer,
      first_name: 'Sophie',
      last_name: 'Hartmann',
    })
    expect(payload.name).toBe('Sophie Hartmann')
  })

  it('derives name from company when no person name', () => {
    const payload = customerToDbPayload({ ...emptyCustomer, company: 'Atelier Lumière' })
    expect(payload.name).toBe('Atelier Lumière')
  })

  it('derives address from structured fields', () => {
    const payload = customerToDbPayload({
      first_name: 'Sophie',
      last_name: 'Hartmann',
      company: '',
      phone: '',
      email: '',
      street: 'Bahnhofstr. 22',
      postcode: '8001',
      city: 'Zürich',
      country: 'Switzerland',
      notes: '',
    })
    expect(payload.address).toBe('Bahnhofstr. 22, 8001, Zürich, Switzerland')
  })

  it('preserves non-empty values', () => {
    const payload = customerToDbPayload({
      first_name: 'Sophie',
      last_name: 'Hartmann',
      company: '',
      phone: '+41 79 123 45 67',
      email: 'a@b.com',
      street: 'X 1',
      postcode: '8001',
      city: 'Zürich',
      country: 'Switzerland',
      notes: 'Prefers yellow gold',
    })
    expect(payload.phone).toBe('+41 79 123 45 67')
    expect(payload.notes).toBe('Prefers yellow gold')
  })
})
