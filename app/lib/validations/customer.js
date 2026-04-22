import { z } from 'zod'

/**
 * Canonical shape of a Customer.
 * Used for:
 *  - form validation (via react-hook-form + zodResolver)
 *  - runtime validation of API responses
 *  - JSDoc types (see @typedef below)
 *
 * Keep this schema and `supabase/migrations/001_initial_schema.sql` aligned.
 */
export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),

  phone: z.string().trim().max(40, 'Phone is too long').optional().or(z.literal('')),

  email: z
    .string()
    .trim()
    .email('Must be a valid email')
    .max(200, 'Email is too long')
    .optional()
    .or(z.literal('')),

  address: z.string().trim().max(400, 'Address is too long').optional().or(z.literal('')),

  notes: z.string().trim().max(2000, 'Notes are too long').optional().or(z.literal('')),
})

/** @typedef {import('zod').infer<typeof customerSchema>} CustomerInput */

/**
 * Full Customer as stored in the DB — includes the server-generated fields.
 * @typedef {object} Customer
 * @property {string} id
 * @property {string} tenant_id
 * @property {string} name
 * @property {string | null} phone
 * @property {string | null} email
 * @property {string | null} address
 * @property {string | null} notes
 * @property {string} created_at
 */

/** Empty form values — single source of truth for "blank form" state. */
export const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

/**
 * Normalise form input into DB-ready payload.
 * Turns empty strings into `null` so the DB stores them as NULL, not "".
 *
 * @param {CustomerInput} input
 * @returns {Omit<Customer, 'id' | 'tenant_id' | 'created_at'>}
 */
export function customerToDbPayload(input) {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
  }
}
