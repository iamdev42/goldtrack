import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { requireSession } from '~/lib/auth'
import { supabase } from '~/lib/supabase'
import { useTenant } from '~/hooks/useTenant'
import { Header } from '~/components/app/Header'
import { TabNav } from '~/components/app/TabNav'

/**
 * Protected layout. Every route rendered inside this layout requires
 * a signed-in session — the clientLoader redirects to /login otherwise.
 */
export async function clientLoader() {
  await requireSession()
  return null
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { tenantName, userName, loading } = useTenant()

  // Listen for sign-out from anywhere in the app
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/login', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen bg-brand-50">
      <Header tenantName={tenantName} userName={userName} />
      <TabNav />

      {/* Main content — pb-20 on mobile to make room for bottom nav */}
      <main className="pb-20 sm:pb-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-400">Loading…</div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
