import { ChevronRight, ImageIcon } from 'lucide-react'
import { STATUS_COLORS, STATUS_LABELS } from '~/lib/validations/item'

/**
 * Tappable inventory row.
 *
 * @param {{
 *   item: import('~/lib/validations/item').Item,
 *   onClick: () => void,
 *   onThumbClick?: () => void,
 * }} props
 */
export function ItemCard({ item, onClick, onThumbClick }) {
  const thumb = item.photos?.[0]
  const photoCount = item.photos?.length || 0

  return (
    <li>
      <div className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm transition-colors hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-400">
        {/* Thumbnail — separate button so tapping it doesn't open the edit form */}
        {thumb ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onThumbClick?.()
            }}
            aria-label={`View photos of ${item.name}`}
            className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <img src={thumb} alt="" className="h-full w-full object-cover" />
            {photoCount > 1 && (
              <span
                aria-label={`${photoCount} photos`}
                className="absolute bottom-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 px-1.5 text-[10px] font-semibold text-white"
              >
                {photoCount}
              </span>
            )}
          </button>
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100">
            <ImageIcon className="h-5 w-5 text-brand-400" aria-hidden />
          </div>
        )}

        {/* Main tappable area */}
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center justify-between text-left focus:outline-none"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-gray-900">{item.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {item.category && (
                <span className="text-xs capitalize text-gray-400">{item.category}</span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}
              >
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            {item.customer?.name && (
              <p className="mt-0.5 truncate text-xs text-gray-400">{item.customer.name}</p>
            )}
          </div>

          <div className="ml-3 flex flex-shrink-0 items-center gap-1">
            {item.price != null && (
              <span className="text-sm font-semibold text-gray-700">{formatPrice(item.price)}</span>
            )}
            <ChevronRight className="h-5 w-5 text-gray-300" aria-hidden />
          </div>
        </button>
      </div>
    </li>
  )
}

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
