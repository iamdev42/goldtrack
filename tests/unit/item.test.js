import { describe, expect, it } from 'vitest'
import {
  adhocLineSchema,
  bomLineSchema,
  computeBomCost,
  emptyItem,
  itemSchema,
  itemToDbPayload,
  validateBomLines,
} from '~/lib/validations/item'

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

describe('bomLineSchema', () => {
  const validId = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts a valid BOM line', () => {
    const result = bomLineSchema.safeParse({ material_id: validId, quantity: '4.8' })
    expect(result.success).toBe(true)
    expect(result.data.quantity).toBe(4.8)
  })

  it('accepts numeric quantity (not just string)', () => {
    const result = bomLineSchema.safeParse({ material_id: validId, quantity: 2 })
    expect(result.success).toBe(true)
    expect(result.data.quantity).toBe(2)
  })

  it('rejects a non-uuid material_id', () => {
    const result = bomLineSchema.safeParse({ material_id: 'not-a-uuid', quantity: 1 })
    expect(result.success).toBe(false)
  })

  it('rejects zero quantity', () => {
    const result = bomLineSchema.safeParse({ material_id: validId, quantity: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative quantity', () => {
    const result = bomLineSchema.safeParse({ material_id: validId, quantity: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric quantity', () => {
    const result = bomLineSchema.safeParse({ material_id: validId, quantity: 'lots' })
    expect(result.success).toBe(false)
  })
})

describe('computeBomCost', () => {
  const materials = [
    { id: 'gold', name: 'Gold', unit: 'gram', cost: 85 },
    { id: 'diamond', name: 'Diamond', unit: 'piece', cost: 2000 },
    { id: 'labour', name: 'Labour', unit: 'hour', cost: 120 },
  ]

  it('returns 0 for an empty BOM', () => {
    expect(computeBomCost([], materials)).toBe(0)
  })

  it('returns 0 for non-array input (defensive)', () => {
    expect(computeBomCost(null, materials)).toBe(0)
    expect(computeBomCost(undefined, materials)).toBe(0)
  })

  it('sums a single line correctly', () => {
    const lines = [{ material_id: 'gold', quantity: 4.8 }]
    expect(computeBomCost(lines, materials)).toBeCloseTo(408, 5)
  })

  it('sums multiple lines correctly (the Hartmann solitaire)', () => {
    const lines = [
      { material_id: 'gold', quantity: 4.8 },
      { material_id: 'diamond', quantity: 1 },
      { material_id: 'labour', quantity: 2 },
    ]
    // 4.8 × 85 + 1 × 2000 + 2 × 120 = 408 + 2000 + 240 = 2648
    expect(computeBomCost(lines, materials)).toBeCloseTo(2648, 5)
  })

  it('accepts string quantities (from form inputs)', () => {
    const lines = [{ material_id: 'gold', quantity: '4.8' }]
    expect(computeBomCost(lines, materials)).toBeCloseTo(408, 5)
  })

  it('skips lines with unknown material_id', () => {
    const lines = [
      { material_id: 'gold', quantity: 2 },
      { material_id: 'platinum', quantity: 5 }, // not in registry
    ]
    expect(computeBomCost(lines, materials)).toBeCloseTo(170, 5)
  })

  it('skips lines with invalid quantity', () => {
    const lines = [
      { material_id: 'gold', quantity: 2 },
      { material_id: 'diamond', quantity: '' },
      { material_id: 'labour', quantity: 'junk' },
    ]
    expect(computeBomCost(lines, materials)).toBeCloseTo(170, 5)
  })
})

describe('validateBomLines', () => {
  const gold = '550e8400-e29b-41d4-a716-446655440000'

  it('returns an empty array when given no lines', () => {
    expect(validateBomLines([])).toEqual([])
  })

  it('accepts a fully-valid line', () => {
    const errors = validateBomLines([{ material_id: gold, quantity: 4.8 }])
    expect(errors).toEqual([null])
  })

  it('flags a missing material_id', () => {
    const errors = validateBomLines([{ material_id: '', quantity: 1 }])
    expect(errors[0]).toEqual({ field: 'material_id', message: expect.any(String) })
  })

  it('flags an empty quantity (string)', () => {
    const errors = validateBomLines([{ material_id: gold, quantity: '' }])
    expect(errors[0]).toEqual({ field: 'quantity', message: 'Enter a quantity' })
  })

  it('flags an unparseable quantity like "30s"', () => {
    const errors = validateBomLines([{ material_id: gold, quantity: '30s' }])
    expect(errors[0]).toEqual({
      field: 'quantity',
      message: 'Quantity must be a number greater than 0',
    })
  })

  it('flags zero quantity', () => {
    const errors = validateBomLines([{ material_id: gold, quantity: 0 }])
    expect(errors[0]?.field).toBe('quantity')
  })

  it('flags negative quantity', () => {
    const errors = validateBomLines([{ material_id: gold, quantity: -1 }])
    expect(errors[0]?.field).toBe('quantity')
  })

  it('accepts numeric string quantities from form inputs', () => {
    expect(validateBomLines([{ material_id: gold, quantity: '4.8' }])[0]).toBeNull()
  })

  it('returns an error per line (maintains indexing)', () => {
    const errors = validateBomLines([
      { material_id: gold, quantity: 1 },
      { material_id: gold, quantity: 'xyz' },
      { material_id: gold, quantity: 3 },
    ])
    expect(errors[0]).toBeNull()
    expect(errors[1]).not.toBeNull()
    expect(errors[2]).toBeNull()
  })

  it('survives non-array input defensively', () => {
    expect(validateBomLines(null)).toEqual([])
    expect(validateBomLines(undefined)).toEqual([])
  })
})

describe('adhocLineSchema', () => {
  it('accepts a valid ad-hoc line', () => {
    const result = adhocLineSchema.safeParse({ description: '1.2ct diamond', cost: '450' })
    expect(result.success).toBe(true)
    expect(result.data.cost).toBe(450)
  })

  it('trims the description', () => {
    const result = adhocLineSchema.safeParse({
      description: '  0.3ct diamond  ',
      cost: 150,
    })
    expect(result.success).toBe(true)
    expect(result.data.description).toBe('0.3ct diamond')
  })

  it('rejects empty description', () => {
    const result = adhocLineSchema.safeParse({ description: '', cost: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects description longer than 100 chars', () => {
    const result = adhocLineSchema.safeParse({
      description: 'a'.repeat(101),
      cost: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero or negative cost', () => {
    expect(adhocLineSchema.safeParse({ description: 'x', cost: 0 }).success).toBe(false)
    expect(adhocLineSchema.safeParse({ description: 'x', cost: -5 }).success).toBe(false)
  })

  it('rejects non-numeric cost', () => {
    expect(adhocLineSchema.safeParse({ description: 'x', cost: 'free' }).success).toBe(false)
  })
})

describe('computeBomCost — mixed material + adhoc lines', () => {
  const materials = [{ id: 'gold', name: 'Gold', unit: 'g', cost: 85 }]

  it('sums a mix of material and adhoc lines', () => {
    const lines = [
      { kind: 'material', material_id: 'gold', quantity: 2 }, // 170
      { kind: 'adhoc', description: '1.2ct diamond', cost: 450 }, // 450
      { kind: 'adhoc', description: 'stone setting', cost: 120 }, // 120
    ]
    expect(computeBomCost(lines, materials)).toBeCloseTo(740, 5)
  })

  it('treats kind-less lines as material (backwards compatible)', () => {
    const lines = [{ material_id: 'gold', quantity: 2 }]
    expect(computeBomCost(lines, materials)).toBeCloseTo(170, 5)
  })

  it('skips adhoc lines with invalid cost', () => {
    const lines = [
      { kind: 'adhoc', description: 'x', cost: '' },
      { kind: 'adhoc', description: 'y', cost: 'junk' },
      { kind: 'adhoc', description: 'z', cost: 50 },
    ]
    expect(computeBomCost(lines, materials)).toBeCloseTo(50, 5)
  })
})

describe('validateBomLines — adhoc lines', () => {
  it('accepts a valid ad-hoc line', () => {
    const errors = validateBomLines([{ kind: 'adhoc', description: 'stone', cost: 100 }])
    expect(errors[0]).toBeNull()
  })

  it('flags missing description', () => {
    const errors = validateBomLines([{ kind: 'adhoc', description: '', cost: 100 }])
    expect(errors[0]).toEqual({ field: 'description', message: 'Enter a description' })
  })

  it('flags whitespace-only description', () => {
    const errors = validateBomLines([{ kind: 'adhoc', description: '   ', cost: 100 }])
    expect(errors[0]?.field).toBe('description')
  })

  it('flags missing cost', () => {
    const errors = validateBomLines([{ kind: 'adhoc', description: 'stone', cost: '' }])
    expect(errors[0]).toEqual({ field: 'cost', message: 'Enter a cost' })
  })

  it('flags unparseable cost', () => {
    const errors = validateBomLines([{ kind: 'adhoc', description: 'x', cost: 'free' }])
    expect(errors[0]?.field).toBe('cost')
  })

  it('flags zero cost', () => {
    const errors = validateBomLines([{ kind: 'adhoc', description: 'x', cost: 0 }])
    expect(errors[0]?.field).toBe('cost')
  })

  it('handles a mix of material + adhoc errors correctly', () => {
    const errors = validateBomLines([
      { kind: 'material', material_id: 'abc', quantity: 5 },
      { kind: 'adhoc', description: '', cost: 0 },
      { kind: 'adhoc', description: 'good', cost: 10 },
    ])
    expect(errors[0]).toBeNull()
    expect(errors[1]?.field).toBe('description')
    expect(errors[2]).toBeNull()
  })
})
