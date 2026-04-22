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
