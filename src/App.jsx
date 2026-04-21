import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useTenant } from './hooks/useTenant'
import Login from './pages/Login'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'

const NAV = [
  { label: 'Customers', key: 'customers' },
  { label: 'Inventory', key: 'inventory' },
]

function Header({ userName, tenantName }) {
  return (
    <header className="bg-amber-700 text-white px-5 py-3 flex items-center justify-between gap-4">
      {/* Left: app name + company */}
      <div className="min-w-0">
        <div className="text-lg font-bold tracking-wide leading-tight">GoldTrack2</div>
        {tenantName && (
          <div className="text-xs text-amber-200 truncate leading-tight mt-0.5">{tenantName}</div>
        )}
      </div>

      {/* Right: user name + sign out */}
      <div className="flex flex-col items-end flex-shrink-0">
        {userName && (
          <span className="text-sm font-medium leading-tight truncate max-w-[140px]">{userName}</span>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-amber-200 hover:text-white underline leading-tight mt-0.5"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('customers')
  const { tenantName, userName } = useTenant()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Login />

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <Header userName={userName} tenantName={tenantName} />

      {/* Tab bar */}
      <nav className="bg-white border-b border-amber-100 flex">
        {NAV.map(({ label, key }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`flex-1 py-3 text-base font-medium transition-colors ${
              page === key
                ? 'text-amber-700 border-b-2 border-amber-600'
                : 'text-gray-500 hover:text-amber-600'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Page content */}
      <main className="flex-1">
        {page === 'customers' && <Customers />}
        {page === 'inventory' && <Inventory />}
      </main>
    </div>
  )
}
