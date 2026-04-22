import { ChevronRight } from 'lucide-react'

/**
 * Tappable customer list row. Mobile-first layout.
 *
 * @param {{ customer: import('~/lib/validations/customer').Customer, onClick: () => void }} props
 */
export function CustomerCard({ customer, onClick }) {
  // Display name comes from the denormalised `name` column (always populated)
  const displayName = customer.name || 'Unknown'

  // Initials: prefer first+last; fall back to first 2 letters of company / display name
  const initials = computeInitials(customer)

  // Subtitle priority: city → phone → email
  const cityLine = [customer.postcode, customer.city].filter(Boolean).join(' ')
  const subtitle = cityLine || customer.phone || customer.email

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-brand-50 active:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-gray-900">{displayName}</p>
        {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
        {customer.company && customer.company !== displayName && (
          <p className="truncate text-xs text-gray-400">{customer.company}</p>
        )}
      </div>

      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
    </button>
  )
}

function computeInitials(customer) {
  const first = customer.first_name?.trim()
  const last = customer.last_name?.trim()
  if (first || last) {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?'
  }
  const source = customer.company?.trim() || customer.name?.trim() || ''
  return (
    source
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  )
}
