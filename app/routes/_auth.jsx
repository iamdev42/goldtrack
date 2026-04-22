import { Outlet } from 'react-router'
import { requireAnon } from '~/lib/auth'

/**
 * Layout for pages visible ONLY to signed-out users (login, forgot pw, etc.)
 * If you hit /login while signed in, the loader redirects you to /customers.
 */
export async function clientLoader() {
  await requireAnon()
  return null
}

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-brand-50">
      <Outlet />
    </div>
  )
}
