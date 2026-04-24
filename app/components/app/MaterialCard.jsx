import { ChevronRight, Wrench } from 'lucide-react'
import { formatCurrency } from '~/lib/utils'

/**
 * Tappable material row. Shows name + unit + cost + a "default" checkbox.
 *
 * The checkbox sits visually apart from the tappable row so the two click
 * targets don't interfere. Structurally we render a <div> with a <button>
 * (the row) plus a sibling <label> wrapping the checkbox, to avoid the
 * nested-button HTML invalidity that would occur if we put them both inside
 * one outer <button>.
 *
 * @param {{
 *   material: import('~/lib/validations/material').Material,
 *   onClick: () => void,
 *   isDefault: boolean,
 *   onToggleDefault: (next: boolean) => void,
 * }} props
 */
export function MaterialCard({ material, onClick, isDefault, onToggleDefault }) {
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-brand-50 active:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
          <Wrench className="h-5 w-5 text-brand-700" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{material.name}</p>
          {material.unit && <p className="truncate text-sm text-gray-500">per {material.unit}</p>}
        </div>

        <div className="ml-3 flex flex-shrink-0 items-center gap-1">
          <span className="text-sm font-semibold text-gray-700">
            {formatCurrency(material.cost)}
          </span>
          <ChevronRight className="h-5 w-5 text-gray-300" aria-hidden />
        </div>
      </button>

      {/* Default checkbox — stands alone so clicking it never opens the edit
          dialog. Hit target sized to 44x44 for touch. */}
      <label
        className="flex w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-white shadow-sm transition-colors hover:bg-brand-50"
        title="Pre-fill this on new items"
      >
        <input
          type="checkbox"
          className="h-5 w-5 cursor-pointer accent-brand-600"
          checked={isDefault}
          onChange={(e) => onToggleDefault(e.target.checked)}
          aria-label={`${material.name}: default on new items`}
        />
      </label>
    </div>
  )
}
