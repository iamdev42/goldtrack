import { LogOut } from 'lucide-react'
import { supabase } from '~/lib/supabase'

/**
 * Top header for authenticated pages.
 * Shows app name, tenant/shop name, signed-in user, and sign-out.
 *
 * @param {object} props
 * @param {string | null} props.tenantName
 * @param {string | null} props.userName
 */
export function Header({ tenantName, userName }) {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <header className="bg-brand-700 text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight tracking-wide">GoldTrack</div>
          {tenantName && (
            <div className="mt-0.5 truncate text-xs leading-tight text-brand-200">{tenantName}</div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          {userName && (
            <span className="max-w-[160px] truncate text-sm font-medium" title={userName}>
              {userName}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-brand-200 transition-colors hover:bg-brand-800 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
