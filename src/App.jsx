import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'

const NAV = [
  { label: 'Customers', key: 'customers' },
  { label: 'Inventory', key: 'inventory' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('customers')

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
      {/* Top nav */}
      <header className="bg-amber-700 text-white px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold tracking-wide">GoldTrack</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm underline opacity-80 hover:opacity-100"
        >
          Sign out
        </button>
      </header>

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
