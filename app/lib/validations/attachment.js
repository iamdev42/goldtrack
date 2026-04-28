import { z } from 'zod'

/**
 * Attachments are files attached to items (today), and in future sessions
 * also to customers and the tenant itself. The schema is designed to
 * support all three from day one even though the UI only handles 'item'.
 *
 * See migration 012_attachments.sql for the matching DB columns and CHECK
 * constraints — keep these lists in sync.
 */

export const ATTACHMENT_KINDS = ['item', 'customer', 'tenant']

export const ATTACHMENT_CATEGORIES = [
  'photo',
  'certificate',
  'receipt',
  'invoice',
  'sketch',
  'correspondence',
  'other',
]

/** Friendly labels for the UI — keep keys in sync with ATTACHMENT_CATEGORIES. */
export const CATEGORY_LABELS = {
  photo: 'Photo',
  certificate: 'Certificate',
  receipt: 'Receipt',
  invoice: 'Invoice',
  sketch: 'Sketch',
  correspondence: 'Correspondence',
  other: 'Other',
}

/** Supabase Storage bucket and accepted MIME types — used by the upload flow. */
export const ATTACHMENT_BUCKET = 'attachments'
export const ATTACHMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
export const ATTACHMENT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
]

/** What goes in the file picker's `accept=` attribute. */
export const ATTACHMENT_ACCEPT_ATTR = 'image/*,application/pdf'

/**
 * Schema for what the UI sends when ADDING an attachment (after the user
 * has picked a file and chosen a category + optional note). The file
 * itself is not in the schema — it's handled separately by the upload flow.
 */
export const newAttachmentSchema = z.object({
  category: z.enum(ATTACHMENT_CATEGORIES),
  note: z.string().trim().max(200, 'Note is too long').optional().or(z.literal('')),
})

/** @typedef {import('zod').infer<typeof newAttachmentSchema>} NewAttachmentInput */

/**
 * Validate a File object before we try to upload it. Returns null if OK,
 * an error string otherwise. Pure so the tests cover every path.
 *
 * @param {File} file
 * @returns {string | null}
 */
export function validateAttachmentFile(file) {
  if (!file) return 'No file selected'
  if (file.size === 0) return 'File is empty'
  if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
    return `File is too large (max ${formatBytes(ATTACHMENT_MAX_SIZE_BYTES)})`
  }
  if (!ATTACHMENT_ACCEPTED_TYPES.includes(file.type)) {
    return 'Only images (JPEG, PNG, HEIC, WEBP) and PDFs are allowed'
  }
  return null
}

/** Human-readable file size, e.g. "1.4 MB" — used in the documents list. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
