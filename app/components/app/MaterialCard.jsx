import { ChevronRight, Wrench } from 'lucide-react'
import { formatCurrency } from '~/lib/utils'

/**
 * Tappable material row. Shows name + unit + cost.
 *
 * @param {{ material: import('~/lib/validations/material').Material, onClick: () => void }} props
 */
export function MaterialCard({ material, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-brand-50 active:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
        <Wrench className="h-5 w-5 text-brand-700" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-gray-900">{material.name}</p>
        {material.unit && <p className="truncate text-sm text-gray-500">per {material.unit}</p>}
      </div>

      <div className="ml-3 flex flex-shrink-0 items-center gap-1">
        <span className="text-sm font-semibold text-gray-700">{formatCurrency(material.cost)}</span>
        <ChevronRight className="h-5 w-5 text-gray-300" aria-hidden />
      </div>
    </button>
  )
}
