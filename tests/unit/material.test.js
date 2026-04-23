import { describe, expect, it } from 'vitest'
import { materialSchema, materialToDbPayload, emptyMaterial } from '~/lib/validations/material'

describe('materialSchema', () => {
  it('accepts a valid material with all fields', () => {
    const result = materialSchema.safeParse({
      name: 'Gold 18K',
      unit: 'gram',
      cost: '85.00',
    })
    expect(result.success).toBe(true)
    expect(result.data.cost).toBe(85)
  })

  it('accepts a material without a unit (unit is optional)', () => {
    const result = materialSchema.safeParse({ name: 'Gold', unit: '', cost: '100' })
    expect(result.success).toBe(true)
  })

  it('rejects a material without a name', () => {
    const result = materialSchema.safeParse({ name: '', unit: 'gram', cost: '85' })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].path).toEqual(['name'])
  })

  it('rejects a whitespace-only name (no trim-based bypass)', () => {
    const result = materialSchema.safeParse({ name: '   ', unit: 'gram', cost: '85' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing cost', () => {
    const result = materialSchema.safeParse({ name: 'Gold', unit: 'gram', cost: '' })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].path).toEqual(['cost'])
  })

  it('rejects a negative cost', () => {
    const result = materialSchema.safeParse({ name: 'Gold', unit: 'gram', cost: '-5' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-numeric cost', () => {
    const result = materialSchema.safeParse({ name: 'Gold', unit: 'gram', cost: 'free' })
    expect(result.success).toBe(false)
  })

  it('accepts a zero cost (goldsmith may want to track free materials)', () => {
    const result = materialSchema.safeParse({ name: 'Found stone', unit: 'piece', cost: '0' })
    expect(result.success).toBe(true)
    expect(result.data.cost).toBe(0)
  })

  it('rejects an over-long name', () => {
    const result = materialSchema.safeParse({
      name: 'x'.repeat(81),
      unit: 'gram',
      cost: '10',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an over-long unit', () => {
    const result = materialSchema.safeParse({
      name: 'Gold',
      unit: 'x'.repeat(21),
      cost: '10',
    })
    expect(result.success).toBe(false)
  })
})

describe('materialToDbPayload', () => {
  it('trims the name', () => {
    const payload = materialToDbPayload({ name: '  Gold 18K  ', unit: 'gram', cost: 85 })
    expect(payload.name).toBe('Gold 18K')
  })

  it('converts empty unit to null', () => {
    const payload = materialToDbPayload({ name: 'Gold', unit: '', cost: 85 })
    expect(payload.unit).toBeNull()
  })

  it('trims non-empty unit', () => {
    const payload = materialToDbPayload({ name: 'Gold', unit: '  gram  ', cost: 85 })
    expect(payload.unit).toBe('gram')
  })

  it('passes numeric cost through unchanged', () => {
    const payload = materialToDbPayload({ name: 'Gold', unit: 'gram', cost: 85.5 })
    expect(payload.cost).toBe(85.5)
  })
})

describe('emptyMaterial', () => {
  it('has three empty-string fields', () => {
    expect(emptyMaterial).toEqual({ name: '', unit: '', cost: '' })
  })
})
