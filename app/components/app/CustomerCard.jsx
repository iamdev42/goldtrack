import { ChevronRight } from 'lucide-react'

/**
 * Tappable customer list row. Mobile-first layout.
 *
 * @param {{ customer: import('~/lib/validations/customer').Customer, onClick: () => void }} props
 */
export function CustomerCard({ customer, onClick }) {
  const initials = customer.name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-brand-50 active:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      {/* Avatar */}
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
        {initials}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-gray-900">{customer.name}</p>
        {(customer.phone || customer.email) && (
          <p className="truncate text-sm text-gray-500">{customer.phone || customer.email}</p>
        )}
      </div>

      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
    </button>
  )
}
