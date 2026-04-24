import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class strings intelligently — later classes override earlier ones
 * when they target the same utility. Standard shadcn/ui convention.
 *
 * @param {...(string | false | null | undefined)} inputs
 * @returns {string}
 *
 * @example
 *   cn('px-2 py-1', condition && 'bg-red-500', 'px-4')  // → 'py-1 bg-red-500 px-4'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Swiss currency.
 *
 * Convention: `1'234.56 CHF` — apostrophe thousands separator, dot decimal,
 * ISO 4217 code at the end. This is the de-facto standard on Swiss invoices.
 *
 * Returns an em-dash for null/undefined/NaN so that broken data is visible
 * rather than silently rendering as "0.00" (which would look legitimate).
 *
 * @param {number | string | null | undefined} value
 * @returns {string}
 *
 * @example
 *   formatCurrency(1234.5)    // "1'234.50 CHF"
 *   formatCurrency('85')      // "85.00 CHF"
 *   formatCurrency(0)         // "0.00 CHF"
 *   formatCurrency(null)      // "—"
 *   formatCurrency('garbage') // "—"
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  // de-CH locale uses an apostrophe (') as the thousand separator and a dot
  // as the decimal separator — exactly what we want.
  const formatted = num.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} CHF`
}
