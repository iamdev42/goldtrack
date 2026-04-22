import { NavLink } from 'react-router'
import { Users, Package } from 'lucide-react'
import { cn } from '~/lib/utils'

const TABS = [
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Package },
]

/**
 * Horizontal tab bar on desktop, bottom tab bar on mobile.
 * Uses NavLink so the active state lights up from the URL itself.
 */
export function TabNav() {
  return (
    <>
      {/* Desktop / tablet — horizontal bar below header */}
      <nav className="hidden border-b border-brand-100 bg-white sm:block" aria-label="Primary">
        <div className="mx-auto flex max-w-5xl">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 items-center justify-center gap-2 py-3 text-base font-medium transition-colors',
                  isActive
                    ? 'border-b-2 border-brand-600 text-brand-700'
                    : 'text-gray-500 hover:text-brand-600'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile — fixed bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-100 bg-white sm:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-2">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors',
                  isActive ? 'text-brand-700' : 'text-gray-500'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
