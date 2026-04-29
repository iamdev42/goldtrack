import { redirect } from 'react-router'
import { supabase } from './supabase'

/**
 * Require an authenticated session. Throws a redirect to /login if not signed in.
 * Use inside `clientLoader` on protected routes.
 *
 * @returns {Promise<import('@supabase/supabase-js').Session>}
 */
export async function requireSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw redirect('/login')
  }
  return session
}

/**
 * Require NO session (i.e. visitor is not logged in).
 * Use on public pages like /login that should redirect signed-in users away.
 */
export async function requireAnon() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    throw redirect('/dashboard')
  }
  return null
}
