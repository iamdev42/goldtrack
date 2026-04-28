import { describe, expect, it } from 'vitest'
import {
  validateAttachmentFile,
  formatBytes,
  newAttachmentSchema,
  ATTACHMENT_MAX_SIZE_BYTES,
} from '~/lib/validations/attachment'

/** Helper: build a File-like blob with a given size + mime type. */
function makeFile(size, type, name = 'sample.bin') {
  // jsdom supports File, but the constructor needs Blob parts — fake the size
  const data = new Uint8Array(size)
  return new File([data], name, { type })
}

describe('validateAttachmentFile', () => {
  it('accepts a small JPEG', () => {
    expect(validateAttachmentFile(makeFile(1024, 'image/jpeg', 'a.jpg'))).toBeNull()
  })

  it('accepts a small PDF', () => {
    expect(validateAttachmentFile(makeFile(2048, 'application/pdf', 'a.pdf'))).toBeNull()
  })

  it('accepts WEBP and HEIC', () => {
    expect(validateAttachmentFile(makeFile(100, 'image/webp', 'a.webp'))).toBeNull()
    expect(validateAttachmentFile(makeFile(100, 'image/heic', 'a.heic'))).toBeNull()
  })

  it('rejects no file', () => {
    expect(validateAttachmentFile(null)).toBe('No file selected')
    expect(validateAttachmentFile(undefined)).toBe('No file selected')
  })

  it('rejects empty file', () => {
    expect(validateAttachmentFile(makeFile(0, 'image/jpeg'))).toBe('File is empty')
  })

  it('rejects oversized file', () => {
    const tooBig = makeFile(ATTACHMENT_MAX_SIZE_BYTES + 1, 'image/jpeg')
    const err = validateAttachmentFile(tooBig)
    expect(err).toContain('too large')
  })

  it('rejects disallowed mime types', () => {
    expect(validateAttachmentFile(makeFile(100, 'application/zip'))).toContain('Only images')
    expect(validateAttachmentFile(makeFile(100, 'text/html'))).toContain('Only images')
    expect(validateAttachmentFile(makeFile(100, 'application/x-msdownload'))).toContain(
      'Only images'
    )
  })
})

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(50 * 1024)).toBe('50 KB')
  })

  it('formats MB with one decimal', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })

  it('returns em-dash for invalid values', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(undefined)).toBe('—')
    expect(formatBytes(-1)).toBe('—')
    expect(formatBytes(NaN)).toBe('—')
  })
})

describe('newAttachmentSchema', () => {
  it('accepts minimal input (category only)', () => {
    const result = newAttachmentSchema.safeParse({ category: 'receipt' })
    expect(result.success).toBe(true)
  })

  it('accepts category + note', () => {
    const result = newAttachmentSchema.safeParse({
      category: 'certificate',
      note: 'Diamond GIA cert',
    })
    expect(result.success).toBe(true)
    expect(result.data.note).toBe('Diamond GIA cert')
  })

  it('rejects unknown category', () => {
    expect(newAttachmentSchema.safeParse({ category: 'invoice2' }).success).toBe(false)
  })

  it('rejects note longer than 200 chars', () => {
    const result = newAttachmentSchema.safeParse({
      category: 'other',
      note: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('trims notes', () => {
    const result = newAttachmentSchema.safeParse({
      category: 'other',
      note: '  hello  ',
    })
    expect(result.success).toBe(true)
    expect(result.data.note).toBe('hello')
  })
})
