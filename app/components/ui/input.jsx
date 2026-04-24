import { forwardRef } from 'react'
import { cn } from '~/lib/utils'

/**
 * Text input styled to the app's design system.
 *
 * Smart number handling: when the caller passes `type="number"`, we render
 * a `type="text"` input under the hood with `inputMode="decimal"`. Why:
 *
 *   1. Mobile still shows the numeric keypad (via inputMode)
 *   2. Desktop no longer has the ± spinner arrows, which users clicked by
 *      accident or reached with the trackpad
 *   3. Scroll-wheel while the field is focused no longer silently changes
 *      the number (a long-standing Chrome/Edge gotcha)
 *
 * Validation is still done by Zod on blur/submit. Pass `invalid={true}` to
 * paint the field with a red border after validation fails — typically
 * wired up as `invalid={!!errors.fieldName}` from react-hook-form.
 *
 * For the rare case of needing real `<input type="number">` semantics
 * (native spinners etc.), pass `nativeNumber={true}`. We don't use that
 * anywhere in GoldTrack today — it's purely an escape hatch.
 *
 * @param {object} props
 * @param {string} [props.type]        'text' | 'number' | 'email' | 'password' | ...
 * @param {boolean} [props.invalid]    Render a red border (post-validation UI)
 * @param {boolean} [props.nativeNumber] Opt into the real native number input
 * @param {string} [props.className]
 */
export const Input = forwardRef(function Input(
  { className, type = 'text', invalid = false, nativeNumber = false, inputMode, ...props },
  ref
) {
  // Transparently upgrade type="number" to safe text + decimal.
  const isSmartNumber = type === 'number' && !nativeNumber
  const resolvedType = isSmartNumber ? 'text' : type
  const resolvedInputMode = inputMode || (isSmartNumber ? 'decimal' : undefined)

  return (
    <input
      ref={ref}
      type={resolvedType}
      inputMode={resolvedInputMode}
      className={cn(
        'flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-base',
        'placeholder:text-gray-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Post-validation red border. Focus ring still overrides when focused,
        // so the field "relaxes" back to brand-gold when the user re-engages.
        invalid && 'border-red-400',
        className
      )}
      {...props}
    />
  )
})
