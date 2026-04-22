import { z } from 'zod'

/**
 * Canonical shape of a Customer.
 *
 * Used for:
 *  - form validation (via react-hook-form + zodResolver)
 *  - runtime validation of API responses
 *  - JSDoc types (see @typedef below)
 *
 * Keep this schema and the relevant `supabase/migrations/*.sql` files aligned.
 */
export const customerSchema = z
  .object({
    // Identity ----------------------------------------------------
    first_name: z.string().trim().max(80, 'First name is too long').optional().or(z.literal('')),

    last_name: z.string().trim().max(80, 'Last name is too long').optional().or(z.literal('')),

    company: z.string().trim().max(160, 'Company name is too long').optional().or(z.literal('')),

    // Contact -----------------------------------------------------
    phone: z.string().trim().max(80, 'Phone is too long').optional().or(z.literal('')),

    email: z
      .string()
      .trim()
      .email('Must be a valid email')
      .max(200, 'Email is too long')
      .optional()
      .or(z.literal('')),

    // Address (structured) ---------------------------------------
    street: z.string().trim().max(200, 'Street is too long').optional().or(z.literal('')),
    postcode: z.string().trim().max(20, 'Postcode is too long').optional().or(z.literal('')),
    city: z.string().trim().max(120, 'City is too long').optional().or(z.literal('')),
    country: z.string().trim().max(80, 'Country is too long').optional().or(z.literal('')),

    // Free text ---------------------------------------------------
    notes: z.string().trim().max(2000, 'Notes are too long').optional().or(z.literal('')),
  })
  .refine(
    (data) =>
      (data.first_name && data.first_name.trim()) ||
      (data.last_name && data.last_name.trim()) ||
      (data.company && data.company.trim()),
    {
      message: 'Enter a first name, last name or company',
      path: ['last_name'],
    }
  )

/** @typedef {import('zod').infer<typeof customerSchema>} CustomerInput */

/**
 * Full Customer as stored in the DB — includes server-generated fields.
 * @typedef {object} Customer
 * @property {string} id
 * @property {string} tenant_id
 * @property {string} name              Display name (denormalised — first+last, or company)
 * @property {string | null} first_name
 * @property {string | null} last_name
 * @property {string | null} company
 * @property {string | null} phone
 * @property {string | null} email
 * @property {string | null} street
 * @property {string | null} postcode
 * @property {string | null} city
 * @property {string | null} country
 * @property {string | null} address    Legacy concatenated address (kept in sync)
 * @property {string | null} notes
 * @property {number | null} legacy_id  Original ID from the imported system
 * @property {string} created_at
 */

/** Empty form values — single source of truth for "blank form" state. */
export const emptyCustomer = {
  first_name: '',
  last_name: '',
  company: '',
  phone: '',
  email: '',
  street: '',
  postcode: '',
  city: '',
  country: 'Switzerland', // sensible default for the user base
  notes: '',
}

/**
 * Build the display name from structured fields.
 * Prefers "First Last" → "Last" → company → "Unknown".
 *
 * @param {CustomerInput} input
 */
export function buildDisplayName(input) {
  const first = input.first_name?.trim() || ''
  const last = input.last_name?.trim() || ''
  const company = input.company?.trim() || ''
  const personal = [first, last].filter(Boolean).join(' ')
  return personal || company || 'Unknown'
}

/**
 * Build the legacy concatenated address — kept in the DB column for
 * backwards compatibility with anything that still reads `address`.
 *
 * @param {CustomerInput} input
 */
export function buildAddress(input) {
  return (
    [input.street, input.postcode, input.city, input.country]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(', ') || null
  )
}

/**
 * Normalise form input into DB-ready payload.
 * - Trims all strings
 * - Empty values → null (so the DB stores NULL, not "")
 * - Derives `name` and `address` for display fields
 *
 * @param {CustomerInput} input
 */
export function customerToDbPayload(input) {
  const trim = (v) => v?.trim() || null
  return {
    name: buildDisplayName(input),
    first_name: trim(input.first_name),
    last_name: trim(input.last_name),
    company: trim(input.company),
    phone: trim(input.phone),
    email: trim(input.email),
    street: trim(input.street),
    postcode: trim(input.postcode),
    city: trim(input.city),
    country: trim(input.country),
    address: buildAddress(input),
    notes: trim(input.notes),
  }
}
