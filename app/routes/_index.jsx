import { redirect } from 'react-router'
import { supabase } from '~/lib/supabase'

/**
 * Root entry — redirect based on auth state.
 * clientLoader runs in the browser before the component renders.
 */
export async function clientLoader() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  throw redirect(session ? '/dashboard' : '/login')
}

// Unreachable — the loader always throws — but React Router requires a default export.
export default function Index() {
  return null
}
