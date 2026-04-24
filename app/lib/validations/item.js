import { z } from 'zod'

/**
 * Item = a piece of jewellery in the shop's inventory.
 *
 * These string unions must match the CHECK constraints in
 * `supabase/migrations/001_initial_schema.sql` and `004_items_price_status.sql`.
 */
export const ITEM_CATEGORIES = ['ring', 'necklace', 'bracelet', 'earrings', 'other']
export const ITEM_STATUSES = ['for_sale', 'sold', 'reserved']

/** Human labels for statuses — used in UI. */
export const STATUS_LABELS = {
  for_sale: 'For Sale',
  sold: 'Sold',
  reserved: 'Reserved',
}

/** Tailwind colour tokens per status — one source of truth for UI badges. */
export const STATUS_COLORS = {
  for_sale: 'bg-green-100 text-green-700',
  sold: 'bg-gray-100 text-gray-500',
  reserved: 'bg-brand-100 text-brand-700',
}

// ── Schema ────────────────────────────────────────────────────

export const itemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),

  description: z.string().trim().max(2000, 'Description is too long').optional().or(z.literal('')),

  category: z.enum(ITEM_CATEGORIES).optional().or(z.literal('')),

  // Strings from HTML number inputs; coerce to numbers (or undefined) on submit.
  weight_g: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Weight must be a number'),

  price: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !Number.isNaN(Number(v)), 'Price must be a number'),

  status: z.enum(ITEM_STATUSES).default('for_sale'),

  customer_id: z.string().optional().or(z.literal('')),
})

/**
 * BOM line validation — used when saving via the `save_item_bom` RPC.
 * Each line links a registered material to a quantity.
 */
export const bomLineSchema = z.object({
  material_id: z.string().uuid('Select a material'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than zero'),
})

/**
 * Validates a whole BOM before it's sent to the RPC. Rejects empty/invalid
 * lines so they never reach the DB.
 */
export const bomSchema = z.array(bomLineSchema)

/** @typedef {import('zod').infer<typeof itemSchema>} ItemInput */

/**
 * @typedef {object} Item
 * @property {string} id
 * @property {string} tenant_id
 * @property {string | null} customer_id
 * @property {string} name
 * @property {string | null} description
 * @property {string | null} category
 * @property {number | null} weight_g
 * @property {number | null} price
 * @property {'for_sale' | 'sold' | 'reserved'} status
 * @property {string[] | null} photos
 * @property {string} created_at
 * @property {{ name: string } | null} [customer]  // joined
 * @property {BomLineWithMaterial[]} [bom]         // joined from item_materials
 */

/**
 * @typedef {object} BomLineWithMaterial
 * @property {string} id
 * @property {string} material_id
 * @property {number} quantity
 * @property {{ id: string, name: string, unit: string | null, cost: number } | null} material
 */

export const emptyItem = {
  name: '',
  description: '',
  category: '',
  weight_g: '',
  price: '',
  status: 'for_sale',
  customer_id: '',
}

/**
 * Normalise form input into a DB-ready payload for the `items` table itself.
 * BOM lines are handled separately by the `save_item_bom` RPC.
 *
 * @param {ItemInput} input
 */
export function itemToDbPayload(input) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category || null,
    weight_g: input.weight_g ? Number(input.weight_g) : null,
    price: input.price ? Number(input.price) : null,
    status: input.status || 'for_sale',
    customer_id: input.customer_id || null,
  }
}

/**
 * Compute the total material cost of a BOM given the current registry prices.
 * Used for live preview in the form, not stored in the DB.
 *
 * @param {Array<{ material_id: string, quantity: number | string }>} lines
 * @param {Array<{ id: string, cost: number | string }>} materials
 */
export function computeBomCost(lines, materials) {
  if (!Array.isArray(lines)) return 0
  return lines.reduce((sum, line) => {
    const mat = materials.find((m) => m.id === line.material_id)
    if (!mat) return sum
    const qty = Number(line.quantity)
    const cost = Number(mat.cost)
    if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum
    return sum + qty * cost
  }, 0)
}

/**
 * Validate every line in a BOM for submission.
 *
 * Returns one entry per input line:
 *   - `null` for valid lines
 *   - `{ field, message }` for lines that can't be submitted
 *
 * Rules:
 *   1. Missing material_id → error on 'material_id'
 *   2. Empty quantity OR quantity that doesn't parse as a positive number
 *      → error on 'quantity'
 *
 * Pure function so the tests cover every edge case without mounting a form.
 *
 * @param {Array<{ material_id: string, quantity: number | string }>} lines
 * @returns {Array<null | { field: 'material_id' | 'quantity', message: string }>}
 */
export function validateBomLines(lines) {
  if (!Array.isArray(lines)) return []
  return lines.map((line) => {
    if (!line.material_id) {
      return { field: 'material_id', message: 'Pick a cost entry for this line' }
    }
    const raw = String(line.quantity ?? '').trim()
    if (raw === '') {
      return { field: 'quantity', message: 'Enter a quantity' }
    }
    const qty = Number(raw)
    if (!Number.isFinite(qty) || qty <= 0) {
      return { field: 'quantity', message: 'Quantity must be a number greater than 0' }
    }
    return null
  })
}
