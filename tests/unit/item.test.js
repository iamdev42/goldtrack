import { describe, expect, it } from 'vitest'
import { emptyItem, itemSchema, itemToDbPayload } from '~/lib/validations/item'

describe('itemSchema', () => {
  it('accepts minimal valid item (name + default status)', () => {
    const result = itemSchema.safeParse({ ...emptyItem, name: 'Ring' })
    expect(result.success).toBe(true)
    expect(result.data.status).toBe('for_sale')
  })

  it('requires a name', () => {
    const result = itemSchema.safeParse({ ...emptyItem, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid category', () => {
    const result = itemSchema.safeParse({ ...emptyItem, name: 'X', category: 'watch' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = itemSchema.safeParse({ ...emptyItem, name: 'X', status: 'draft' })
    expect(result.success).toBe(false)
  })

  it('accepts numeric strings for weight and price', () => {
    const result = itemSchema.safeParse({
      ...emptyItem,
      name: 'X',
      weight_g: '5.25',
      price: '1200',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-numeric weight', () => {
    const result = itemSchema.safeParse({ ...emptyItem, name: 'X', weight_g: 'heavy' })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric price', () => {
    const result = itemSchema.safeParse({ ...emptyItem, name: 'X', price: 'a lot' })
    expect(result.success).toBe(false)
  })
})

describe('itemToDbPayload', () => {
  it('converts numeric strings to numbers', () => {
    const payload = itemToDbPayload({
      ...emptyItem,
      name: 'Ring',
      weight_g: '5.5',
      price: '1800',
    })
    expect(payload.weight_g).toBe(5.5)
    expect(payload.price).toBe(1800)
  })

  it('converts empty optional fields to null', () => {
    const payload = itemToDbPayload({ ...emptyItem, name: 'Ring' })
    expect(payload.description).toBeNull()
    expect(payload.category).toBeNull()
    expect(payload.material).toBeNull()
    expect(payload.weight_g).toBeNull()
    expect(payload.price).toBeNull()
    expect(payload.customer_id).toBeNull()
  })

  it('trims the name', () => {
    const payload = itemToDbPayload({ ...emptyItem, name: '  Signet ring  ' })
    expect(payload.name).toBe('Signet ring')
  })

  it('preserves status when provided', () => {
    const payload = itemToDbPayload({ ...emptyItem, name: 'Ring', status: 'reserved' })
    expect(payload.status).toBe('reserved')
  })

  it('defaults status to for_sale when missing', () => {
    const payload = itemToDbPayload({ ...emptyItem, name: 'Ring', status: '' })
    expect(payload.status).toBe('for_sale')
  })
})
