import { z } from 'zod'

/**
 * Material = a cost line item in the registry.
 *
 * Examples:
 *   { name: "Gold 18K",  unit: "gram",  cost: 85.00  }
 *   { name: "Diamond",   unit: "piece", cost: 2000.00 }
 *   { name: "Labour",    unit: "hour",  cost: 120.00 }
 *
 * Name and unit are both free-text — the app doesn't interpret them,
 * they're just displayed. This maximises flexibility for the goldsmith.
 */
export const materialSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long'),

  // Free-text unit. "gram", "piece", "hour", "ct" — whatever the user prefers.
  unit: z.string().trim().max(20, 'Unit is too long').optional().or(z.literal('')),

  // HTML number input gives us a string; coerce to number and validate.
  cost: z
    .string()
    .trim()
    .min(1, 'Cost is required')
    .transform((v) => Number(v))
    .pipe(z.number().nonnegative('Cost must be zero or positive').finite()),
})

/** @typedef {import('zod').infer<typeof materialSchema>} MaterialInput */

/**
 * Full Material as stored in the DB.
 * @typedef {object} Material
 * @property {string} id
 * @property {string} tenant_id
 * @property {string} name
 * @property {string | null} unit
 * @property {number} cost
 * @property {string} created_at
 * @property {string} updated_at
 */

/** Empty form values — the "new material" dialog starts here. */
export const emptyMaterial = {
  name: '',
  unit: '',
  cost: '',
}

/**
 * Normalise form input into a DB-ready payload.
 * - Trims strings
 * - Empty unit → null
 * - Cost is already a number (Zod coerced it)
 *
 * @param {MaterialInput} input
 */
export function materialToDbPayload(input) {
  return {
    name: input.name.trim(),
    unit: input.unit?.trim() || null,
    cost: input.cost,
  }
}
