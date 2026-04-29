import { z } from 'zod'

/**
 * Schema for the public catalogue settings on a tenant. Slug is the
 * URL-shaped identifier used in /shop/{slug}; it must match the DB
 * CHECK constraint added in migration 013:
 *   ^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$, length 2..60
 *
 * public_display_name and public_bio are optional, free text. The display
 * name falls back to the tenant.name when empty.
 */
export const tenantSettingsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, 'Must be at least 2 characters')
    .max(60, 'Must be at most 60 characters')
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      'Use lowercase letters, numbers, and hyphens only — must start and end with a letter or number'
    ),
  public_display_name: z
    .string()
    .trim()
    .max(80, 'Display name is too long')
    .optional()
    .or(z.literal('')),
  public_bio: z.string().trim().max(500, 'Bio is too long').optional().or(z.literal('')),
  // Calendar embed URL — light validation, must be https. Empty is fine.
  calendar_embed_url: z
    .string()
    .trim()
    .url('Enter a valid URL')
    .startsWith('https://', 'URL must start with https://')
    .optional()
    .or(z.literal('')),
})

/** @typedef {import('zod').infer<typeof tenantSettingsSchema>} TenantSettingsInput */

export const emptyTenantSettings = {
  slug: '',
  public_display_name: '',
  public_bio: '',
  calendar_embed_url: '',
}

/** Normalize form input to a DB-ready payload. */
export function tenantSettingsToDbPayload(input) {
  return {
    slug: input.slug.trim(),
    public_display_name: input.public_display_name?.trim() || null,
    public_bio: input.public_bio?.trim() || null,
    calendar_embed_url: input.calendar_embed_url?.trim() || null,
  }
}
