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

  // Legacy free-text material (kept for backward compatibility with old items).
  material: z.string().trim().max(60).optional().or(z.literal('')),

  // New: link to a row in the materials registry. Optional — an item doesn't
  // have to have a material (e.g. while being designed or repaired).
  material_id: z.string().uuid().optional().or(z.literal('')),

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

/** @typedef {import('zod').infer<typeof itemSchema>} ItemInput */

/**
 * @typedef {object} Item
 * @property {string} id
 * @property {string} tenant_id
 * @property {string | null} customer_id
 * @property {string} name
 * @property {string | null} description
 * @property {string | null} category
 * @property {string | null} material
 * @property {number | null} weight_g
 * @property {number | null} price
 * @property {'for_sale' | 'sold' | 'reserved'} status
 * @property {string[] | null} photos
 * @property {string} created_at
 * @property {{ name: string } | null} [customer]  // joined
 */

export const emptyItem = {
  name: '',
  description: '',
  category: '',
  material: '',
  material_id: '',
  weight_g: '',
  price: '',
  status: 'for_sale',
  customer_id: '',
}

/**
 * Normalise form input into a DB-ready payload.
 * - Empty strings → null
 * - Numeric strings → numbers
 *
 * @param {ItemInput} input
 */
export function itemToDbPayload(input) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category || null,
    material: input.material || null,
    material_id: input.material_id || null,
    weight_g: input.weight_g ? Number(input.weight_g) : null,
    price: input.price ? Number(input.price) : null,
    status: input.status || 'for_sale',
    customer_id: input.customer_id || null,
  }
}
